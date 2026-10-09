// GeoJSON (RFC 7946) feature, as found inside a FeatureCollection.
export type GeoJsonFeature = {
  type: 'Feature';
  geometry: Record<string, unknown> | null;
  properties: Record<string, unknown> | null;
  id?: string | number;
};

// A FeatureCollection carrying the provenance metadata a user-supplied
// GeoJSON file provides alongside its features.
export type GeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  city?: string;
  source?: string;
  url?: string;
  features: GeoJsonFeature[];
};

// Contract exported by the GeoJSON input node.
export type GeoJsonFeatureCollectionArray = GeoJsonFeatureCollection[];

// Rectangle in degrees. west/east are longitudes, south/north latitudes.
export type GeoBounds = {
  west: number;
  east: number;
  south: number;
  north: number;
};

// Node types the pipeline engine can evaluate.
export const WORKER_NODE_TYPES = new Set(['geojson-input', 'geo-bounds-filter', 'geojson-merge', 'gps-map', 'geojson-viewer']);

// Input handles of the GeoJSON merge node, concatenated in this order.
export const GEOJSON_MERGE_INPUT_HANDLES = ['geojson-1', 'geojson-2', 'geojson-3', 'geojson-4'] as const;

// Node types whose results are posted back to the main thread.
export const VIEWER_NODE_TYPES = new Set(["gps-map", "geojson-viewer"]);

export type NodeInputs = Record<string, unknown>;
export type NodeOutputs = Record<string, unknown>;

export type PipelineNodeDefinition = {
  execute: (inputs: NodeInputs) => Promise<NodeOutputs>;
};

// ============================================================
// Worker protocol (main thread <-> pipeline.worker.ts)
// ============================================================

// Only the data keys the engine reads are projected onto this shape;
// evaluated results (viewer images) and React Flow internals stay on
// the main thread.
export type PipelineWorkerNode = {
  id: string;
  type?: string;
  data: Record<string, unknown>;
};

export type PipelineWorkerEdge = {
  source: string;
  sourceHandle: string | null;
  target: string;
  targetHandle: string | null;
};

// main thread -> worker
export type PipelineEvaluateMessage = {
  type: "evaluate";
  evaluationId: number;
  sequentialMode: boolean;
  nodes: PipelineWorkerNode[];
  edges: PipelineWorkerEdge[];
};

// worker -> main thread
export type PipelineStageTimingMessage = {
  type: "stageTiming";
  evaluationId: number;
  nodeType: string;
  nodeId: string;
  durationMs: number;
};

export type PipelineStageStartedMessage = {
  type: "stageStarted";
  evaluationId: number;
  nodeType: string;
  nodeId: string;
};

export type PipelineGeoJsonViewerMessage = {
  type: "geojson-viewer";
  evaluationId: number;
  nodeId: string;
  geojson: GeoJsonFeatureCollectionArray;
};

export type PipelineDoneMessage = {
  type: "done";
  evaluationId: number;
  durationMs: number;
};

export type PipelineErrorMessage = {
  type: "error";
  evaluationId: number;
  message: string;
};

export type PipelineWorkerOutbound =
  | PipelineStageTimingMessage
  | PipelineStageStartedMessage
  | PipelineGeoJsonViewerMessage
  | PipelineDoneMessage
  | PipelineErrorMessage;
