import GeoJsonFeaturePickerNode from '@/pipeline/nodes/ComplexNodes/GeoJsonFeaturePickerNode';
import { GEOJSON_FEATURE_COUNT_EVENT } from '@/types/types';
import PreviewCanvas from './PreviewCanvas';
import { renderPreviewRoot } from './previewRoot';
import type { Node, NodeTypes } from '@xyflow/react';

const nodeId = 'geojson-feature-picker-preview';
const nodes: Node<{ featureIndex: number; size: { width: number; height: number } }>[] = [{
  id: nodeId,
  type: 'geojson-feature-picker',
  position: { x: 0, y: 0 },
  data: { featureIndex: 2, size: { width: 448, height: 220 } },
}];

const nodeTypes: NodeTypes = {
  'geojson-feature-picker': GeoJsonFeaturePickerNode,
};

const initialEvents = [{
  name: GEOJSON_FEATURE_COUNT_EVENT,
  detail: { nodeId, count: 6 },
}];

export function GeoJsonFeaturePickerNodePreview() {
  return <PreviewCanvas nodes={nodes} nodeTypes={nodeTypes} initialEvents={initialEvents} />;
}

renderPreviewRoot(<GeoJsonFeaturePickerNodePreview />);
