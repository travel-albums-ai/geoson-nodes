import { prepareGraph, type PipelineGraph } from '@/context/pipelineStore';
import type { Edge, Node, XYPosition } from '@xyflow/react';

const CLIPBOARD_FORMAT = 'geoson-nodes/nodes';
const CLIPBOARD_VERSION = 1;

type ClipboardPayload = {
  format: typeof CLIPBOARD_FORMAT;
  version: typeof CLIPBOARD_VERSION;
  nodes: Node[];
  edges: Edge[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toClipboardNode(node: Node): Node {
  return {
    id: node.id,
    type: node.type,
    position: { x: node.position.x, y: node.position.y },
    data: node.data,
    ...(node.width !== undefined && { width: node.width }),
    ...(node.height !== undefined && { height: node.height }),
  };
}

export function serializeSelectionForClipboard(nodes: Node[], edges: Edge[]): string | undefined {
  const selectedNodes = nodes.filter((node) => node.selected);
  if (selectedNodes.length === 0) return undefined;

  const selectedIds = new Set(selectedNodes.map((node) => node.id));
  const selectedEdges = edges.filter((edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target));
  const graph = prepareGraph({ nodes: selectedNodes, edges: selectedEdges });

  const payload: ClipboardPayload = {
    format: CLIPBOARD_FORMAT,
    version: CLIPBOARD_VERSION,
    nodes: graph.nodes.map(toClipboardNode),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
    })),
  };

  return JSON.stringify(payload);
}

// Returns undefined for anything that is not a payload produced by serializeSelectionForClipboard,
// so unrelated clipboard text is left alone. Nodes of unsupported types are dropped with their edges.
export function parseClipboardGraph(
  text: string,
  isSupportedNodeType: (type: string) => boolean,
): PipelineGraph | undefined {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return undefined;
  }

  if (!isRecord(payload) || payload.format !== CLIPBOARD_FORMAT || payload.version !== CLIPBOARD_VERSION) {
    return undefined;
  }
  if (!Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) return undefined;

  const nodes: Node[] = [];
  for (const item of payload.nodes) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.type !== 'string') continue;
    if (!isSupportedNodeType(item.type)) continue;
    if (!isRecord(item.position) || !Number.isFinite(item.position.x) || !Number.isFinite(item.position.y)) continue;

    nodes.push({
      id: item.id,
      type: item.type,
      position: { x: item.position.x as number, y: item.position.y as number },
      data: isRecord(item.data) ? item.data : {},
      ...(Number.isFinite(item.width) && { width: item.width as number }),
      ...(Number.isFinite(item.height) && { height: item.height as number }),
    });
  }

  if (nodes.length === 0) return undefined;

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: Edge[] = [];
  for (const item of payload.edges) {
    if (!isRecord(item) || typeof item.source !== 'string' || typeof item.target !== 'string') continue;
    if (!nodeIds.has(item.source) || !nodeIds.has(item.target)) continue;

    edges.push({
      id: typeof item.id === 'string' ? item.id : '',
      source: item.source,
      target: item.target,
      sourceHandle: typeof item.sourceHandle === 'string' ? item.sourceHandle : null,
      targetHandle: typeof item.targetHandle === 'string' ? item.targetHandle : null,
    });
  }

  return { nodes, edges };
}

// Pasted nodes and edges get fresh ids so the same graph can be pasted any number of times,
// including into a different pipeline. The group's top-left corner lands on the anchor.
export function placeGraphAt(
  graph: PipelineGraph,
  anchor: XYPosition,
  snapGrid: [number, number],
): PipelineGraph {
  const minX = Math.min(...graph.nodes.map((node) => node.position.x));
  const minY = Math.min(...graph.nodes.map((node) => node.position.y));
  const snap = (value: number, grid: number) => Math.round(value / grid) * grid;

  const idMap = new Map<string, string>();
  const nodes: Node[] = graph.nodes.map((node) => {
    const id = `${node.type ?? 'node'}-${crypto.randomUUID()}`;
    idMap.set(node.id, id);

    return {
      ...node,
      id,
      position: {
        x: snap(anchor.x + node.position.x - minX, snapGrid[0]),
        y: snap(anchor.y + node.position.y - minY, snapGrid[1]),
      },
      data: { ...node.data },
      selected: true,
    };
  });

  const edges: Edge[] = graph.edges.flatMap((edge) => {
    const source = idMap.get(edge.source);
    const target = idMap.get(edge.target);
    if (!source || !target) return [];

    return [{
      ...edge,
      id: `edge-${crypto.randomUUID()}`,
      source,
      target,
      selected: false,
    }];
  });

  return { nodes, edges };
}
