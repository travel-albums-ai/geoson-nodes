import { NodeType } from '@/pipeline/NodePalette';

export type NodeSize = { width: number; height: number };

export const NODE_MIN_SIZES: Record<NodeType, NodeSize> = {
  [NodeType.GeoJsonInput]: { width: 280, height: 160 },
  [NodeType.FlightPath]: { width: 280, height: 160 },
  [NodeType.ShortestRoute]: { width: 280, height: 160 },
  [NodeType.GeoBoundsFilter]: { width: 280, height: 240 },
  [NodeType.GeoJsonWithinArea]: { width: 280, height: 160 },
  [NodeType.GeoJsonMerge]: { width: 280, height: 120 },
  [NodeType.GeoJsonSwitch]: { width: 280, height: 160 },
  [NodeType.GeoJsonStyle]: { width: 280, height: 160 },
  [NodeType.GeoJsonZip]: { width: 280, height: 120 },
  [NodeType.GeoJsonUnion]: { width: 280, height: 120 },
  [NodeType.GeoJsonIntersection]: { width: 280, height: 120 },
  [NodeType.GeoJsonDifference]: { width: 280, height: 120 },
  [NodeType.GeoJsonSymmetricDifference]: { width: 280, height: 120 },
  [NodeType.GeoJsonJsonata]: { width: 280, height: 200 },
  [NodeType.GpsMap]: { width: 280, height: 240 },
  [NodeType.GeoJsonViewer]: { width: 280, height: 160 },
  [NodeType.PostIt]: { width: 120, height: 120 },
};

const FALLBACK_MIN_SIZE: NodeSize = { width: 280, height: 120 };

export function getNodeMinSize(type: string | undefined): NodeSize {
  return NODE_MIN_SIZES[type as NodeType] ?? FALLBACK_MIN_SIZE;
}

// Node data is persisted as JSON, so the stored size is validated before use.
export function readNodeSize(value: unknown): NodeSize | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const { width, height } = value as Partial<NodeSize>;
  return typeof width === 'number' && typeof height === 'number' ? { width, height } : undefined;
}
