import { ReactFlowProvider, ReactFlow, type Node, type NodeTypes } from '@xyflow/react';
import AppProviders from '@/context/AppProviders';
import GeoBoundsFilterNode from '@/pipeline/nodes/ComplexNodes/GeoBoundsFilterNode';
import { createRoot, type Root } from 'react-dom/client';
import '@xyflow/react/dist/style.css';
import 'leaflet/dist/leaflet.css';

declare global {
  interface Window {
    __COMPONENT_PREVIEW_ROOT__?: Root;
  }
}

const nodes: Node[] = [{
  id: 'geo-bounds-filter-preview',
  type: 'geo-bounds-filter',
  position: { x: 0, y: 0 },
  data: { bounds: { west: -10, east: 25, south: 35, north: 60 } },
}];

const nodeTypes: NodeTypes = {
  'geo-bounds-filter': GeoBoundsFilterNode,
};

export function Preview() {
  return (
    <AppProviders>
      <ReactFlowProvider>
        <main style={{ width: '100vw', height: '100vh' }}>
          <ReactFlow
            nodes={nodes}
            edges={[]}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            nodesConnectable={false}
            nodesDraggable={false}
            elementsSelectable={false}
            panOnDrag={false}
            zoomOnScroll={false}
          />
        </main>
      </ReactFlowProvider>
    </AppProviders>
  );
}

const container = document.getElementById('root')!;
const root = window.__COMPONENT_PREVIEW_ROOT__ ??= createRoot(container);
root.render(<Preview />);
