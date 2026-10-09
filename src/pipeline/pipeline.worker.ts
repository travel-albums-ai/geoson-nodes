// Pipeline evaluation engine for the GeoJSON nodes, running on a dedicated
// worker so parsing never blocks the main thread.
//
// - Every new evaluation supersedes the previous one; stale runs stop at
//   the next node boundary.
// - Node outputs are memoized by content signature, so branches whose
//   inputs did not change are reused across runs.

import type {
  NodeInputs,
  NodeOutputs,
  PipelineEvaluateMessage,
  PipelineNodeDefinition,
  PipelineWorkerEdge,
  PipelineWorkerNode,
  PipelineWorkerOutbound,
  GeoJsonFeatureCollectionArray,
} from "@/types/types";
import { VIEWER_NODE_TYPES } from "@/types/types";
import {
  filterGeoJsonByBounds,
  normalizeGeoBounds,
  parseGeoJsonFeatureCollections,
} from "@/lib/geojson";

// The app compiles against the DOM lib (where `self` is Window), so the
// worker's global scope is described structurally here instead.
type WorkerScope = {
  postMessage: (message: PipelineWorkerOutbound) => void;
  onmessage: ((event: MessageEvent<PipelineEvaluateMessage>) => void) | null;
};

const workerScope = self as unknown as WorkerScope;

const MAX_CACHED_PHASES = 64;

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

// Keep the most recently used phase outputs, keyed by their content
// signature rather than node id, so equivalent phases are shared across runs.
const phaseOutputCache = new Map<string, NodeOutputs>();

function getCachedPhaseOutput(signature: string): NodeOutputs | undefined {
  const outputs = phaseOutputCache.get(signature);

  if (outputs) {
    phaseOutputCache.delete(signature);
    phaseOutputCache.set(signature, outputs);
  }

  return outputs;
}

function cachePhaseOutput(signature: string, outputs: NodeOutputs) {
  phaseOutputCache.delete(signature);
  phaseOutputCache.set(signature, outputs);

  while (phaseOutputCache.size > MAX_CACHED_PHASES) {
    const oldestSignature = phaseOutputCache.keys().next().value;

    if (oldestSignature === undefined) break;

    phaseOutputCache.delete(oldestSignature);
  }
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

const geoJsonPassthroughNode: PipelineNodeDefinition = {
  async execute(inputs) {
    await Promise.resolve();

    return {
      geojson: (inputs.geojson as GeoJsonFeatureCollectionArray | undefined) ?? [],
    };
  },
};

const nodeDefinitions: Record<string, PipelineNodeDefinition> = {
  "geojson-input": {
    async execute(inputs) {
      const file = inputs.geojsonFile;

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
};

async function runEvaluation(message: PipelineEvaluateMessage): Promise<void> {
  const { evaluationId, nodes, edges } = message;
  const startedAt = performance.now();

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
      }

      if (node.type === "geo-bounds-filter") {
        inputs.bounds = node.data.bounds;
      }

      if (node.data.skip === true) {
        console.log(`⏭ skipping ${node.id}`);
        signatures.set(nodeId, serializeForCache({
          type: node.type,
          data: node.data,
          upstream: upstreamSignatures,
        }));
        return inputs;
      }

      const signature = serializeForCache({
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
      if (!(error instanceof StaleEvaluationError)) {
        console.error(`Viewer node "${node.id}" failed:`, error);
      }
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
