import '@/pipeline/pipelineConfig';
import GeoJsonBroadcastNode from '@/pipeline/nodes/ComplexNodes/GeoJsonBroadcastNode';
import PreviewCanvas from './PreviewCanvas';
import { renderPreviewRoot } from './previewRoot';
import type { Node, NodeTypes } from '@xyflow/react';

const nodes: Node<{ hash: string }>[] = [{
  id: 'geojson-broadcast-preview',
  type: 'geojson-broadcast',
  position: { x: 0, y: 0 },
  data: { hash: '4f8c2a91b706de35' },
}];

const nodeTypes: NodeTypes = {
  'geojson-broadcast': GeoJsonBroadcastNode,
};

export function GeoJsonBroadcastNodePreview() {
  return <PreviewCanvas nodes={nodes} nodeTypes={nodeTypes} />;
}

renderPreviewRoot(<GeoJsonBroadcastNodePreview />);
