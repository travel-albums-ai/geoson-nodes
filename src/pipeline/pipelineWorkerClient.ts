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
import type {
  GeoJsonFeatureCollectionArray,
  PipelineEvaluateMessage,
  PipelineWorkerEdge,
  PipelineWorkerNode,
  PipelineWorkerOutbound,
} from "@/types/types";
import { VIEWER_NODE_TYPES, WORKER_NODE_TYPES } from "@/types/types";
import type { Edge, Node } from "@xyflow/react";

// node.data keys the engine reads. Everything else (React Flow internals)
// stays on the main thread.
const NODE_DATA_KEYS = ["geojsonFile", "skip", "bounds"] as const;

type PendingViewer = {
  evaluationId: number;
  resolve: (result: GeoJsonFeatureCollectionArray) => void;
  reject: (error: unknown) => void;
};

let worker: Worker | null = null;
let activeEvaluationId = 0;

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
      pending.resolve(message.geojson);
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

function projectNode(node: Node): PipelineWorkerNode {
  const data: Record<string, unknown> = {};

  for (const key of NODE_DATA_KEYS) {
    if (key in node.data) {
      data[key] = node.data[key];
    }
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

  const message: PipelineEvaluateMessage = {
    type: "evaluate",
    evaluationId,
    sequentialMode: getSettingsStore().pipelineSequentialMode,
    nodes: supportedNodes.map(projectNode),
    edges: supportedEdges.map(projectEdge),
  };

  try {
    getWorker().postMessage(message);
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
