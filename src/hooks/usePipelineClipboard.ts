import { pipelineNodeTypes, SNAP_GRID } from '@/pipeline/pipelineConfig';
import { parseClipboardGraph, placeGraphAt, serializeSelectionForClipboard } from '@/pipeline/pipelineClipboard';
import { useReactFlow, type Edge, type XYPosition } from '@xyflow/react';
import { useEffect, useRef, type RefObject } from 'react';

type UsePipelineClipboardOptions = {
  enabled: boolean;
  styleEdges: (edges: Edge[]) => Edge[];
  onPasted: () => void;
};

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return target.isContentEditable || EDITABLE_TAGS.has(target.tagName);
}

// Copy and paste only apply when focus is on the canvas or on the page body.
// Focus inside dialogs, toolbars or other panels keeps the browser's default behavior.
function isCanvasTarget(target: EventTarget | null, canvas: HTMLElement | null) {
  if (!canvas) return false;
  if (target === document.body || target === document.documentElement) return true;

  return target instanceof Node && canvas.contains(target);
}

export function usePipelineClipboard(
  canvasRef: RefObject<HTMLDivElement | null>,
  { enabled, styleEdges, onPasted }: UsePipelineClipboardOptions,
) {
  const { getNodes, getEdges, setNodes, setEdges, screenToFlowPosition } = useReactFlow();
  const pointerRef = useRef<XYPosition | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerMove = (event: PointerEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    return () => canvas.removeEventListener('pointermove', handlePointerMove);
  }, [canvasRef]);

  useEffect(() => {
    if (!enabled) return;

    const handleCopy = (event: ClipboardEvent) => {
      if (!isCanvasTarget(event.target, canvasRef.current) || isEditableTarget(event.target)) return;
      if ((window.getSelection()?.toString() ?? '') !== '') return;

      const text = serializeSelectionForClipboard(getNodes(), getEdges());
      if (!text || !event.clipboardData) return;

      event.clipboardData.setData('text/plain', text);
      event.preventDefault();
    };

    const getPasteAnchor = (): XYPosition => {
      if (pointerRef.current) {
        return screenToFlowPosition(pointerRef.current);
      }

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };

      return screenToFlowPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (!isCanvasTarget(event.target, canvasRef.current) || isEditableTarget(event.target)) return;

      const text = event.clipboardData?.getData('text/plain');
      if (!text) return;

      const graph = parseClipboardGraph(text, (type) => type in pipelineNodeTypes);
      if (!graph) return;

      event.preventDefault();

      const pasted = placeGraphAt(graph, getPasteAnchor(), SNAP_GRID);

      setNodes((current) => [
        ...current.map((node) => (node.selected ? { ...node, selected: false } : node)),
        ...pasted.nodes,
      ]);
      setEdges((current) => styleEdges([
        ...current.map((edge) => (edge.selected ? { ...edge, selected: false } : edge)),
        ...pasted.edges,
      ]));
      onPasted();
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [canvasRef, enabled, getEdges, getNodes, onPasted, screenToFlowPosition, setEdges, setNodes, styleEdges]);
}
