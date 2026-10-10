// Pipeline evaluation engine for the GeoJSON nodes, running on a dedicated
// worker so parsing never blocks the main thread.
//
// - Every new evaluation supersedes the previous one; stale runs stop at
//   the next node boundary.
// - Node outputs are memoized by content signature, so branches whose
//   inputs did not change are reused across runs.

import type {
  Airport,
  FlightEntry,
  NodeInputs,
  NodeOutputs,
  PipelineEvaluateMessage,
  PipelineNodeDefinition,
  PipelineWorkerEdge,
  PipelineWorkerNode,
  PipelineWorkerOutbound,
  GeoJsonFeatureCollectionArray,
} from "@/types/types";
import { GEOJSON_MERGE_INPUT_HANDLES, GEOJSON_SET_INPUT_HANDLES, GEOJSON_SWITCH_INPUT_HANDLES, GEOJSON_WITHIN_AREA_INPUT_HANDLES, GEOJSON_ZIP_DEFAULT_KEY, GEOJSON_ZIP_INPUT_HANDLES, VIEWER_NODE_TYPES } from "@/types/types";
import {
  filterGeoJsonByBounds,
  normalizeGeoBounds,
  parseGeoJsonFeatureCollections,
} from "@/lib/geojson";
import { applyGeoJsonSetOperation, type GeoJsonSetOperation } from "@/lib/geojsonSets";
import { applyGeoJsonStyle, readGeoJsonStyleSettings } from "@/lib/geojsonStyle";
import { filterGeoJsonWithinArea } from "@/lib/geojsonWithinArea";
import { loadGeoJsonFile } from "@/lib/geojsonFileStore";
import { commonPropertyKeys, zipGeoJsonByKey } from "@/lib/geojsonZip";
import { runGeoJsonQuery } from "@/lib/geojsonQuery";
import { buildFlightPathCollections } from "@/lib/flights";
import { filterFlightRoutes } from "@/lib/flightRoutes";
import { hashString } from "@/lib/contentHash";
import { cachePhaseOutput, getCachedPhaseOutput } from "@/pipeline/phaseOutputCache";

// The app compiles against the DOM lib (where `self` is Window), so the
// worker's global scope is described structurally here instead.
type WorkerScope = {
  postMessage: (message: PipelineWorkerOutbound) => void;
  onmessage: ((event: MessageEvent<PipelineEvaluateMessage>) => void) | null;
};

const workerScope = self as unknown as WorkerScope;

let latestEvaluationId = 0;

class StaleEvaluationError extends Error {
  constructor() {
    super("Pipeline evaluation was superseded");
    this.name = "StaleEvaluationError";
  }
}

function throwIfStale(evaluationId: number) {
  if (evaluationId !== latestEvaluationId) {
    throw new StaleEvaluationError();
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function serializeForCache(value: unknown): string {
  if (value instanceof File) {
    return JSON.stringify({
      type: "File",
      name: value.name,
      size: value.size,
      lastModified: value.lastModified,
      typeName: value.type,
    });
  }

  if (value instanceof Blob) {
    return JSON.stringify({
      type: "Blob",
      size: value.size,
      typeName: value.type,
    });
  }

  if (Array.isArray(value)) {
    return `[${value.map(serializeForCache).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${serializeForCache(entry)}`);

    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value);
}

// Hashed so a signature stays short even when it embeds upstream signatures.
function signatureOf(value: unknown): string {
  return hashString(serializeForCache(value));
}

// Flight payloads sent by the client, keyed by content hash. After each run
// only the hashes the graph still references are retained.
let retainedFlights = new Map<string, FlightEntry[]>();

function resolveFlightPayloads(message: PipelineEvaluateMessage): Map<string, FlightEntry[]> {
  const next = new Map<string, FlightEntry[]>();

  for (const node of message.nodes) {
    if (node.type !== "flight-path") continue;

    const hash = node.data.flightsHash as string;

    if (next.has(hash)) continue;

    const flights = message.flightPayloads?.[hash] ?? retainedFlights.get(hash);

    if (!flights) {
      throw new Error(`Flight data ${hash} was not sent to the worker`);
    }

    next.set(hash, flights);
  }

  retainedFlights = next;

  return next;
}

const geoJsonPassthroughNode: PipelineNodeDefinition = {
  async execute(inputs) {
    await Promise.resolve();

    return {
      geojson: (inputs.geojson as GeoJsonFeatureCollectionArray | undefined) ?? [],
    };
  },
};

const SET_NODE_TYPES = new Set([
  "geojson-union",
  "geojson-intersection",
  "geojson-difference",
  "geojson-symmetric-difference",
]);

const geoJsonSetNodeDefinition = (operation: GeoJsonSetOperation): PipelineNodeDefinition => ({
  async execute(inputs) {
    await Promise.resolve();

    const [firstHandle, secondHandle] = inputs.reversed === true
      ? [...GEOJSON_SET_INPUT_HANDLES].reverse()
      : GEOJSON_SET_INPUT_HANDLES;

    return {
      geojson: applyGeoJsonSetOperation(
        operation,
        (inputs[firstHandle] as GeoJsonFeatureCollectionArray | undefined) ?? [],
        (inputs[secondHandle] as GeoJsonFeatureCollectionArray | undefined) ?? [],
      ),
    };
  },
});

const nodeDefinitions: Record<string, PipelineNodeDefinition> = {
  "geojson-input": {
    async execute(inputs) {
      const fileKey = inputs.fileKey;
      const file = inputs.geojsonFile instanceof File
        ? inputs.geojsonFile
        : typeof fileKey === "string" ? await loadGeoJsonFile(fileKey) : null;

      if (!(file instanceof File)) {
        return { geojson: [] };
      }

      return { geojson: parseGeoJsonFeatureCollections(await file.text()) };
    },
  },

  "gps-map": geoJsonPassthroughNode,
  "geojson-viewer": geoJsonPassthroughNode,
  "geo-bounds-filter": {
    async execute(inputs) {
      await Promise.resolve();

      const collections = (inputs.geojson as GeoJsonFeatureCollectionArray | undefined) ?? [];
      return { geojson: filterGeoJsonByBounds(collections, normalizeGeoBounds(inputs.bounds)) };
    },
  },
  "geojson-merge": {
    async execute(inputs) {
      await Promise.resolve();

      return {
        geojson: GEOJSON_MERGE_INPUT_HANDLES.flatMap(
          (handle) => (inputs[handle] as GeoJsonFeatureCollectionArray | undefined) ?? [],
        ),
      };
    },
  },
  "geojson-within-area": {
    async execute(inputs) {
      await Promise.resolve();

      const [areaHandle, featuresHandle] = GEOJSON_WITHIN_AREA_INPUT_HANDLES;

      return {
        geojson: filterGeoJsonWithinArea(
          (inputs[areaHandle] as GeoJsonFeatureCollectionArray | undefined) ?? [],
          (inputs[featuresHandle] as GeoJsonFeatureCollectionArray | undefined) ?? [],
          inputs.outside === true,
        ),
      };
    },
  },
  "geojson-switch": {
    async execute(inputs) {
      await Promise.resolve();

      const [offHandle, onHandle] = GEOJSON_SWITCH_INPUT_HANDLES;
      const selectedHandle = inputs.serveB === true ? onHandle : offHandle;

      return {
        geojson: (inputs[selectedHandle] as GeoJsonFeatureCollectionArray | undefined) ?? [],
      };
    },
  },
  "geojson-style": {
    async execute(inputs) {
      await Promise.resolve();

      const collections = (inputs.geojson as GeoJsonFeatureCollectionArray | undefined) ?? [];

      return { geojson: applyGeoJsonStyle(collections, readGeoJsonStyleSettings(inputs.style)) };
    },
  },
  "geojson-zip": {
    async execute(inputs) {
      await Promise.resolve();

      const [primaryHandle, secondaryHandle] = GEOJSON_ZIP_INPUT_HANDLES;
      const primary = (inputs[primaryHandle] as GeoJsonFeatureCollectionArray | undefined) ?? [];
      const secondary = (inputs[secondaryHandle] as GeoJsonFeatureCollectionArray | undefined) ?? [];
      const key = typeof inputs.key === "string" && inputs.key !== "" ? inputs.key : GEOJSON_ZIP_DEFAULT_KEY;

      return {
        geojson: zipGeoJsonByKey(primary, secondary, key),
        keys: commonPropertyKeys(primary, secondary),
      };
    },
  },
  "geojson-union": geoJsonSetNodeDefinition("union"),
  "geojson-intersection": geoJsonSetNodeDefinition("intersection"),
  "geojson-difference": geoJsonSetNodeDefinition("difference"),
  "geojson-symmetric-difference": geoJsonSetNodeDefinition("symmetricDifference"),
  "geojson-jsonata": {
    async execute(inputs) {
      const collections = (inputs.geojson as GeoJsonFeatureCollectionArray | undefined) ?? [];
      const query = typeof inputs.query === "string" ? inputs.query : "";

      return { geojson: await runGeoJsonQuery(collections, query) };
    },
  },
  "flight-path": {
    async execute(inputs) {
      await Promise.resolve();

      return { geojson: buildFlightPathCollections(inputs.flights as FlightEntry[] | undefined) };
    },
  },
  "shortest-route": {
    async execute(inputs) {
      await Promise.resolve();

      const collections = (inputs.geojson as GeoJsonFeatureCollectionArray | undefined) ?? [];
      const from = (inputs.from as Airport | null | undefined)?.iata;
      const to = (inputs.to as Airport | null | undefined)?.iata;
      const via = ((inputs.via as Airport[] | undefined) ?? []).map((airport) => airport.iata);

      return { geojson: filterFlightRoutes(collections, from, to, via) };
    },
  },
};

async function runEvaluation(message: PipelineEvaluateMessage): Promise<void> {
  const { evaluationId, nodes, edges } = message;
  const startedAt = performance.now();
  const flightsByHash = resolveFlightPayloads(message);

  const outputs = new Map<string, Promise<NodeOutputs>>();
  const signatures = new Map<string, string>();

  const evaluateNode = (nodeId: string): Promise<NodeOutputs> => {
    const existing = outputs.get(nodeId);

    if (existing) {
      return existing;
    }

    const node = nodes.find((n) => n.id === nodeId);

    if (!node) {
      return Promise.reject(new Error(`Node ${nodeId} not found`));
    }

    const definition = nodeDefinitions[node.type ?? ""];

    if (!definition) {
      return Promise.reject(new Error(`No definition for ${node.type}`));
    }

    const promise = (async () => {
      throwIfStale(evaluationId);

      const incoming = edges.filter((edge) => edge.target === nodeId);

      const resolveInput = async (edge: PipelineWorkerEdge) => {
        const upstream = await evaluateNode(edge.source);

        return [
          edge.targetHandle ?? "input",
          upstream[edge.sourceHandle ?? "output"],
        ] as const;
      };

      const inputEntries: Array<readonly [string, unknown]> = [];

      if (message.sequentialMode) {
        for (const edge of incoming) {
          inputEntries.push(await resolveInput(edge));
        }
      } else {
        inputEntries.push(...await Promise.all(incoming.map(resolveInput)));
      }

      const inputs: NodeInputs = Object.fromEntries(inputEntries);

      const upstreamSignatures = incoming.map((edge) => ({
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        signature: signatures.get(edge.source),
      }));

      if (node.type === "geojson-input") {
        inputs.geojsonFile = node.data.geojsonFile;
        inputs.fileKey = node.data.fileKey;
      }

      if (node.type === "geo-bounds-filter") {
        inputs.bounds = node.data.bounds;
      }

      if (node.type === "geojson-jsonata") {
        inputs.query = node.data.query;
      }

      if (SET_NODE_TYPES.has(node.type ?? "")) {
        inputs.reversed = node.data.reversed === true;
      }

      if (node.type === "geojson-within-area") {
        inputs.outside = node.data.outside === true;
      }

      if (node.type === "geojson-zip") {
        inputs.key = node.data.key;
      }

      if (node.type === "geojson-style") {
        inputs.style = node.data.style;
      }

      if (node.type === "geojson-switch") {
        inputs.serveB = node.data.serveB === true;
      }

      if (node.type === "flight-path") {
        inputs.flights = flightsByHash.get(node.data.flightsHash as string);
      }

      if (node.type === "shortest-route") {
        inputs.from = node.data.from;
        inputs.to = node.data.to;
        inputs.via = node.data.via;
      }

      if (node.data.skip === true) {
        console.log(`⏭ skipping ${node.id}`);
        signatures.set(nodeId, signatureOf({
          type: node.type,
          data: node.data,
          upstream: upstreamSignatures,
        }));
        return inputs;
      }

      const signature = signatureOf({
        type: node.type,
        data: node.data,
        upstream: upstreamSignatures,
      });
      signatures.set(nodeId, signature);

      const cached = getCachedPhaseOutput(signature);
      if (cached) {
        console.log(`↺ reused ${node.id}`);
        workerScope.postMessage({
          type: "stageStarted",
          evaluationId,
          nodeType: node.type ?? "",
          nodeId: node.id,
        });
        workerScope.postMessage({
          type: "stageTiming",
          evaluationId,
          nodeType: node.type ?? "",
          nodeId: node.id,
          durationMs: 0,
          cached: true,
        });
        return cached;
      }

      console.log(`▶ executing ${node.id}`);

      workerScope.postMessage({
        type: "stageStarted",
        evaluationId,
        nodeType: node.type ?? "",
        nodeId: node.id,
      });

      const nodeStartedAt = performance.now();
      const result = await definition.execute(inputs);
      const durationMs = performance.now() - nodeStartedAt;

      workerScope.postMessage({
        type: "stageTiming",
        evaluationId,
        nodeType: node.type ?? "",
        nodeId: node.id,
        durationMs,
      });

      console.log(`✓ completed ${node.id}`);

      throwIfStale(evaluationId);

      cachePhaseOutput(signature, result);

      return result;
    })();

    outputs.set(nodeId, promise);

    return promise;
  };

  // Post each viewer's result as soon as it is ready instead of
  // waiting for the whole graph to finish.
  const postViewer = async (node: PipelineWorkerNode) => {
    try {
      const nodeOutputs = await evaluateNode(node.id);
      throwIfStale(evaluationId);

      workerScope.postMessage({
        type: "geojson-viewer",
        evaluationId,
        nodeId: node.id,
        geojson: (nodeOutputs.geojson as GeoJsonFeatureCollectionArray | undefined) ?? [],
      });
    } catch (error: unknown) {
      // Staleness is cancellation, not failure.
      if (error instanceof StaleEvaluationError) {
        return;
      }

      console.error(`Viewer node "${node.id}" failed:`, error);

      workerScope.postMessage({
        type: "geojson-viewer",
        evaluationId,
        nodeId: node.id,
        geojson: [],
        error: errorMessage(error),
      });
    }
  };

  const viewerNodes = nodes.filter((node) => VIEWER_NODE_TYPES.has(node.type ?? ""));

  if (message.sequentialMode) {
    for (const node of nodes) {
      await evaluateNode(node.id);
    }
  } else {
    await Promise.all(nodes.map((node) => evaluateNode(node.id)));
  }

  // Every node has settled at this point, so these lookups return cached outputs.
  for (const node of nodes.filter((candidate) => candidate.type === "geojson-zip")) {
    const nodeOutputs = await evaluateNode(node.id);

    workerScope.postMessage({
      type: "geojson-zip-keys",
      evaluationId,
      nodeId: node.id,
      keys: (nodeOutputs.keys as string[] | undefined) ?? [],
    });
  }

  // Awaited so viewer messages are posted before "done"; the client
  // resolves still-pending viewers as empty on "done".
  if (message.sequentialMode) {
    for (const node of viewerNodes) {
      await postViewer(node);
    }
  } else {
    await Promise.all(viewerNodes.map(postViewer));
  }

  throwIfStale(evaluationId);

  workerScope.postMessage({
    type: "done",
    evaluationId,
    durationMs: performance.now() - startedAt,
  });
}

workerScope.onmessage = (event) => {
  const message = event.data;

  if (message.type !== "evaluate") {
    return;
  }

  // A new evaluation supersedes whatever is currently running.
  latestEvaluationId = message.evaluationId;

  runEvaluation(message).catch((error: unknown) => {
    if (error instanceof StaleEvaluationError) {
      return;
    }

    workerScope.postMessage({
      type: "error",
      evaluationId: message.evaluationId,
      message: errorMessage(error),
    });
  });
};
