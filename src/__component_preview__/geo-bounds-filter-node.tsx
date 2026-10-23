import GeoBoundsFilterNode from '@/pipeline/nodes/ComplexNodes/GeoBoundsFilterNode';
import { GEO_BOUNDS_FILTER_COUNTS_EVENT, type GeoBounds } from '@/types/types';
import PreviewCanvas from './PreviewCanvas';
import { renderPreviewRoot } from './previewRoot';
import type { Node, NodeTypes } from '@xyflow/react';
import 'leaflet/dist/leaflet.css';

const nodeId = 'geo-bounds-filter-preview';
const nodes: Node<{ bounds: GeoBounds }>[] = [{
  id: nodeId,
  type: 'geo-bounds-filter',
  position: { x: 0, y: 0 },
  data: { bounds: { west: -10, east: 25, south: 35, north: 60 } },
}];

const nodeTypes: NodeTypes = {
  'geo-bounds-filter': GeoBoundsFilterNode,
};

const initialEvents = [{
  name: GEO_BOUNDS_FILTER_COUNTS_EVENT,
  detail: { nodeId, inputCount: 12, outputCount: 8 },
}];

export function GeoBoundsFilterNodePreview() {
  return <PreviewCanvas nodes={nodes} nodeTypes={nodeTypes} initialEvents={initialEvents} />;
}

renderPreviewRoot(<GeoBoundsFilterNodePreview />);
