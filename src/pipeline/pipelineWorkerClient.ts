// Main-thread client for the pipeline worker (pipeline.worker.ts).
//
// Keeps the evaluatePipeline() contract — a map of per-viewer promises —
// while the graph runs off-thread. Also:
// - projects nodes/edges down to the serializable data the engine reads,
// - relays stage events back as window CustomEvents so node components
//   don't need to know a worker exists,
// - supersedes the in-flight run when a new evaluation starts and
//   respawns the worker if it ever crashes.

import { getSettingsStore } from "@/context/settingsStore";
import { hashString } from "@/lib/contentHash";
import { getCachedFlights, loadFlights } from "@/lib/flightsFileStore";
import type {
  FlightEntry,
  GeoJsonFeatureCollectionArray,
  PipelineEvaluateMessage,
  PipelineWorkerEdge,
  PipelineWorkerNode,
  PipelineWorkerOutbound,
} from "@/types/types";
import { GEOJSON_ZIP_KEYS_EVENT, VIEWER_NODE_TYPES, WORKER_NODE_TYPES } from "@/types/types";
import type { Edge, Node } from "@xyflow/react";

// node.data keys the engine reads. Everything else (React Flow internals)
// stays on the main thread. Flight lists are handled separately, see projectNode.
const NODE_DATA_KEYS = ["geojsonFile", "fileKey", "skip", "bounds", "query", "negate", "reversed", "outside", "key", "serveB", "style", "from", "to", "via"] as const;

type PendingViewer = {
  evaluationId: number;
  resolve: (result: GeoJsonFeatureCollectionArray) => void;
  reject: (error: unknown) => void;
};

let worker: Worker | null = null;
let activeEvaluationId = 0;

// Hashes of flight lists the current worker already holds (see evaluatePipeline).
let workerFlightHashes = new Set<string>();

// Flight lists are large, so each array is hashed once per identity rather than on every run.
const flightsHashes = new WeakMap<FlightEntry[], string>();

function flightsHashOf(flights: FlightEntry[]): string {
  let hash = flightsHashes.get(flights);

  if (hash === undefined) {
    hash = hashString(JSON.stringify(flights));
    flightsHashes.set(flights, hash);
  }

  return hash;
}

const pendingViewers = new Map<string, PendingViewer>();

function handleWorkerMessage(event: MessageEvent<PipelineWorkerOutbound>) {
  const message = event.data;

  // Anything from a superseded evaluation is dropped; its pending
  // viewers were already settled when the newer run started.
  if (message.evaluationId !== activeEvaluationId) {
    return;
  }

  switch (message.type) {
    case "stageTiming": {
      window.dispatchEvent(
        new CustomEvent(`${message.nodeType}:stageTiming`, {
          detail: {
            nodeId: message.nodeId,
            durationMs: message.durationMs,
            cached: message.cached ?? false,
          },
        })
      );
      return;
    }

    case "stageStarted": {
      window.dispatchEvent(
        new CustomEvent(`${message.nodeType}:stageStarted`, {
          detail: {
            nodeId: message.nodeId,
          },
        })
      );
      return;
    }

    case "geojson-viewer": {
      const pending = pendingViewers.get(message.nodeId);

      if (!pending) return;

      pendingViewers.delete(message.nodeId);

      if (message.error !== undefined) {
        pending.reject(new Error(message.error));
        return;
      }

      pending.resolve(message.geojson);
      return;
    }

    case "geojson-zip-keys": {
      window.dispatchEvent(
        new CustomEvent(GEOJSON_ZIP_KEYS_EVENT, {
          detail: {
            nodeId: message.nodeId,
            keys: message.keys,
          },
        })
      );
      return;
    }

    case "done": {
      window.dispatchEvent(
        new CustomEvent('pipeline:total-timing', {
          detail: { durationMs: message.durationMs },
        })
      );

      // Viewers that never reported (e.g. an upstream failure)
      // settle empty instead of hanging.
      for (const [nodeId, pending] of pendingViewers) {
        if (pending.evaluationId !== message.evaluationId) continue;

        pendingViewers.delete(nodeId);
        pending.resolve([]);
      }
      return;
    }

    case "error": {
      const error = new Error(message.message);

      for (const [nodeId, pending] of pendingViewers) {
        if (pending.evaluationId !== message.evaluationId) continue;

        pendingViewers.delete(nodeId);
        pending.reject(error);
      }
      return;
    }
  }
}

function getWorker(): Worker {
  if (worker) {
    return worker;
  }

  worker = new Worker(new URL("./pipeline.worker.ts", import.meta.url), {
    type: "module",
  });

  // A fresh worker holds no flight payloads yet.
  workerFlightHashes = new Set();

  worker.onmessage = handleWorkerMessage;

  worker.onerror = (event) => {
    console.error("Pipeline worker crashed:", event.message);

    const error = new Error("Pipeline worker crashed");

    for (const pending of pendingViewers.values()) {
      pending.reject(error);
    }

    pendingViewers.clear();

    worker?.terminate();
    // Respawn lazily on the next evaluation.
    worker = null;
  };

  return worker;
}

// Flight lists are read from IndexedDB ahead of the run (see resolveFlightLists).
async function resolveFlightLists(nodes: Node[]): Promise<Map<string, FlightEntry[]>> {
  const lists = new Map<string, FlightEntry[]>();

  await Promise.all(
    nodes
      .filter((node) => node.type === "flight-path")
      .map(async (node) => {
        const key = node.data.flightsKey as string | undefined;

        if (key === undefined) {
          // Nodes saved before flight lists moved out of node data still hold them inline.
          lists.set(node.id, (node.data.flights as FlightEntry[] | undefined) ?? []);
          return;
        }

        lists.set(node.id, getCachedFlights(key) ?? (await loadFlights(key)));
      })
  );

  return lists;
}

function projectNode(
  node: Node,
  flightLists: Map<string, FlightEntry[]>,
  referencedFlightHashes: Set<string>,
  flightPayloads: Record<string, FlightEntry[]>
): PipelineWorkerNode {
  const data: Record<string, unknown> = {};

  for (const key of NODE_DATA_KEYS) {
    if (key in node.data) {
      data[key] = node.data[key];
    }
  }

  if (node.type === "flight-path") {
    const flights = flightLists.get(node.id) ?? [];
    const hash = flightsHashOf(flights);

    referencedFlightHashes.add(hash);

    if (!workerFlightHashes.has(hash)) {
      flightPayloads[hash] = flights;
    }

    data.flightsHash = hash;
  }

  return { id: node.id, type: node.type, data };
}

function projectEdge(edge: Edge): PipelineWorkerEdge {
  return {
    source: edge.source,
    sourceHandle: edge.sourceHandle ?? null,
    target: edge.target,
    targetHandle: edge.targetHandle ?? null,
  };
}

// Same contract as the old main-thread engine: resolves to a map of
// per-viewer promises that settle progressively as results arrive.
export async function evaluatePipeline(
  nodes: Node[],
  edges: Edge[]
): Promise<Map<string, Promise<GeoJsonFeatureCollectionArray>>> {
  const evaluationId = ++activeEvaluationId;
  window.dispatchEvent(new CustomEvent('pipeline:evaluationStarted', {
    detail: { evaluationId },
  }));

  // Settle viewers from the superseded run; the caller ignores
  // those results because its evaluation id no longer matches.
  for (const pending of pendingViewers.values()) {
    pending.resolve([]);
  }

  pendingViewers.clear();

  // Nodes saved by earlier versions (e.g. photo nodes) have no engine
  // definition; drop them along with their edges instead of failing the run.
  const supportedNodes = nodes.filter((node) => WORKER_NODE_TYPES.has(node.type ?? ""));
  const supportedNodeIds = new Set(supportedNodes.map((node) => node.id));
  const supportedEdges = edges.filter(
    (edge) => supportedNodeIds.has(edge.source) && supportedNodeIds.has(edge.target)
  );

  const results = new Map<string, Promise<GeoJsonFeatureCollectionArray>>();

  for (const node of supportedNodes) {
    if (!VIEWER_NODE_TYPES.has(node.type ?? "")) {
      continue;
    }

    results.set(
      node.id,
      new Promise<GeoJsonFeatureCollectionArray>((resolve, reject) => {
        pendingViewers.set(node.id, { evaluationId, resolve, reject });
      })
    );
  }

  try {
    const flightLists = await resolveFlightLists(supportedNodes);

    // A newer evaluation started while flights were loading. It has already
    // settled this run's viewers, so this run must not post a stale graph.
    if (evaluationId !== activeEvaluationId) {
      return results;
    }

    const activeWorker = getWorker();
    const flightPayloads: Record<string, FlightEntry[]> = {};
    const referencedFlightHashes = new Set<string>();

    const message: PipelineEvaluateMessage = {
      type: "evaluate",
      evaluationId,
      sequentialMode: getSettingsStore().pipelineSequentialMode,
      nodes: supportedNodes.map((node) => projectNode(node, flightLists, referencedFlightHashes, flightPayloads)),
      edges: supportedEdges.map(projectEdge),
      flightPayloads: Object.keys(flightPayloads).length > 0 ? flightPayloads : undefined,
    };

    activeWorker.postMessage(message);

    // The worker keeps only the flight lists this graph references.
    workerFlightHashes = referencedFlightHashes;
  } catch (error) {
    for (const [nodeId, pending] of pendingViewers) {
      if (pending.evaluationId !== evaluationId) continue;

      pendingViewers.delete(nodeId);
      pending.reject(error);
    }
  }

  return results;
}

// Frees the worker thread and its in-memory phase result cache. Called
// when the pipeline page unmounts; the worker respawns lazily on the
// next evaluation.
export function terminatePipelineWorker() {
  worker?.terminate();
  worker = null;

  // Settle anything in flight so awaiting callers don't hang.
  for (const pending of pendingViewers.values()) {
    pending.resolve([]);
  }

  pendingViewers.clear();
}
