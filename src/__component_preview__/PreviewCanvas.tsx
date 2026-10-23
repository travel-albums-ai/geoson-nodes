import '@/lib/i18n';
import AppProviders from '@/context/AppProviders';
import {
  ReactFlow,
  ReactFlowProvider,
  type Node,
  type NodeTypes,
  useNodesInitialized,
  useReactFlow,
} from '@xyflow/react';
import { useEffect } from 'react';
import '@xyflow/react/dist/style.css';

type PreviewEvent = {
  name: string;
  detail: unknown;
};

type PreviewCanvasProps = {
  nodes: Node[];
  nodeTypes: NodeTypes;
  initialEvents?: PreviewEvent[];
};

export function FitPreviewCanvas() {
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  useEffect(() => {
    if (nodesInitialized) void fitView({ padding: 0.15 });
  }, [fitView, nodesInitialized]);

  return null;
}

export default function PreviewCanvas({
  nodes,
  nodeTypes,
  initialEvents = [],
}: PreviewCanvasProps) {
  useEffect(() => {
    if (initialEvents.length === 0) return;

    const timer = window.setTimeout(() => {
      initialEvents.forEach(({ name, detail }) => {
        window.dispatchEvent(new CustomEvent(name, { detail }));
      });
    });

    return () => window.clearTimeout(timer);
  }, [initialEvents]);

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
          >
            <FitPreviewCanvas />
          </ReactFlow>
        </main>
      </ReactFlowProvider>
    </AppProviders>
  );
}
