import GeoJsonChartNode from '@/pipeline/nodes/ComplexNodes/GeoJsonChartNode';
import type { GeoJsonFeatureCollectionArray } from '@/types/types';
import PreviewCanvas from './PreviewCanvas';
import { renderPreviewRoot } from './previewRoot';
import type { Node, NodeTypes } from '@xyflow/react';
import 'uplot/dist/uPlot.min.css';

const geojson: GeoJsonFeatureCollectionArray = [{
  type: 'FeatureCollection',
  city: 'Sample European cities',
  source: 'Component preview',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [2.35, 48.86] }, properties: { city: 'Paris', visitors: 42, population: 2.1 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [13.4, 52.52] }, properties: { city: 'Berlin', visitors: 68, population: 3.7 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [-0.12, 51.51] }, properties: { city: 'London', visitors: 55, population: 8.9 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [12.5, 41.9] }, properties: { city: 'Rome', visitors: 31, population: 2.8 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [2.17, 41.39] }, properties: { city: 'Barcelona', visitors: 47, population: 1.6 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [16.37, 48.21] }, properties: { city: 'Vienna', visitors: 36, population: 1.9 } },
  ],
}];

const nodes: Node<{ geojson: GeoJsonFeatureCollectionArray; chartKey: string }>[] = [{
  id: 'geojson-chart-preview',
  type: 'geojson-chart',
  position: { x: 0, y: 0 },
  data: { geojson, chartKey: 'visitors' },
}];

const nodeTypes: NodeTypes = {
  'geojson-chart': GeoJsonChartNode,
};

export function GeoJsonChartNodePreview() {
  return <PreviewCanvas nodes={nodes} nodeTypes={nodeTypes} />;
}

renderPreviewRoot(<GeoJsonChartNodePreview />);
