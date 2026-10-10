import { useCallback, useState } from 'react';
import { useReactFlow, type OnResize, type OnResizeEnd } from '@xyflow/react';
import type { NodeSize } from '@/pipeline/nodeSizes';

// Live size while dragging a resize handle; the persisted size lives in node data.
export function useNodeResize(nodeId: string, storedSize: NodeSize | undefined) {
  const { setNodes } = useReactFlow();
  const [liveSize, setLiveSize] = useState<NodeSize | null>(null);

  const onResize: OnResize = useCallback((_event, params) => {
    setLiveSize({ width: params.width, height: params.height });
  }, []);

  const onResizeEnd: OnResizeEnd = useCallback((_event, params) => {
    const size = { width: params.width, height: params.height };
    setLiveSize(null);
    setNodes((current) => current.map((node) =>
      node.id === nodeId
        ? { ...node, data: { ...node.data, size } }
        : node
    ));
  }, [nodeId, setNodes]);

  return { size: liveSize ?? storedSize, onResize, onResizeEnd };
}
