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

// An airport picked from the bundled IATA list. Its coordinates are stored on the
// flight path node, so the pipeline engine does not need the airport list.
export type Airport = {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
};

// One flight on the flight path node. A side stays null until an airport is picked.
// The price, currency, date and extra text come from the flights file and stay null when it leaves them out.
export type FlightEntry = {
  from: Airport | null;
  to: Airport | null;
  price: number | null;
  currency: string | null;
  date: string | null;
  extraText: string | null;
};

// Node types the pipeline engine can evaluate.
export const WORKER_NODE_TYPES = new Set(['geojson-input', 'geo-bounds-filter', 'geojson-within-area', 'geojson-switch', 'geojson-style', 'geojson-zip', 'geojson-feature-picker', 'geojson-merge', 'geojson-union', 'geojson-intersection', 'geojson-difference', 'geojson-symmetric-difference', 'geojson-jsonata', 'gps-map', 'geojson-viewer', 'flight-path', 'shortest-route']);

// Canvas-only nodes (e.g. notes). They are saved with the pipeline but never sent to the engine.
export const ANNOTATION_NODE_TYPES = new Set(['post-it']);

// Input handles of the GeoJSON merge node, concatenated in this order.
export const GEOJSON_MERGE_INPUT_HANDLES = ['geojson-1', 'geojson-2', 'geojson-3', 'geojson-4'] as const;

// Input handles of the GeoJSON set operation nodes: first operand, then second operand.
export const GEOJSON_SET_INPUT_HANDLES = ['geojson-a', 'geojson-b'] as const;

// Input handles of the GeoJSON within-area node: the area to test against, then the features to keep.
export const GEOJSON_WITHIN_AREA_INPUT_HANDLES = ['geojson-area', 'geojson-features'] as const;

// Input handles of the GeoJSON switch node: the output when off (A), then the output when on (B).
export const GEOJSON_SWITCH_INPUT_HANDLES = ['geojson-a', 'geojson-b'] as const;

// Input handles of the GeoJSON zip node: the full data (A), then the partial data whose properties are added to it (B).
export const GEOJSON_ZIP_INPUT_HANDLES = ['geojson-a', 'geojson-b'] as const;

// Property name used to match features when the zip node has no key selected.
export const GEOJSON_ZIP_DEFAULT_KEY = 'name';

// Window event carrying the keys that A and B share, so the zip node can fill its key dropdown.
export const GEOJSON_ZIP_KEYS_EVENT = 'geojson-zip:keys';

// Window event carrying how many features the picker node's input holds, so its slider can cap its range.
export const GEOJSON_FEATURE_COUNT_EVENT = 'geojson-feature-picker:count';

// Node types whose results are posted back to the main thread.
// The JSONata node is included so its live output and errors can be shown on the node.
export const VIEWER_NODE_TYPES = new Set(["gps-map", "geojson-viewer", "geojson-jsonata"]);

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
  // Flight lists the worker does not hold yet, keyed by content hash.
  flightPayloads?: Record<string, FlightEntry[]>;
};

// worker -> main thread
export type PipelineStageTimingMessage = {
  type: "stageTiming";
  evaluationId: number;
  nodeType: string;
  nodeId: string;
  durationMs: number;
  cached?: boolean;
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
  // Set when the node failed; geojson is empty in that case.
  error?: string;
};

export type PipelineGeoJsonZipKeysMessage = {
  type: "geojson-zip-keys";
  evaluationId: number;
  nodeId: string;
  keys: string[];
};

export type PipelineGeoJsonFeatureCountMessage = {
  type: "geojson-feature-count";
  evaluationId: number;
  nodeId: string;
  count: number;
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
  | PipelineGeoJsonZipKeysMessage
  | PipelineGeoJsonFeatureCountMessage
  | PipelineDoneMessage
  | PipelineErrorMessage;
