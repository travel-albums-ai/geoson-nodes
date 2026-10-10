import { useEffect, type CSSProperties } from 'react';
import {
  Position,
  useNodeId,
  useStore,
  useUpdateNodeInternals,
  type Edge,
  type InternalNode,
} from '@xyflow/react';

type HandleType = 'source' | 'target';
type Point = { x: number; y: number };
type Box = Point & { width: number; height: number };

export type HandleAnchor = {
  position: Position;
  offset: number;
};

type AnchorState = {
  nodeLookup: Map<string, InternalNode>;
  edges: Edge[];
};

const HANDLE_EDGE_INSET_PX = 20;
const HANDLE_MIN_GAP_PX = 18;

const handleKey = (type: HandleType, handleId: string) => `${type}:${handleId}`;

function getBox(node: InternalNode | undefined): Box | undefined {
  const width = node?.measured.width;
  const height = node?.measured.height;
  if (!node || !width || !height) return undefined;

  const { x, y } = node.internals.positionAbsolute;
  return { x, y, width, height };
}

function getCenter(box: Box): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function getAverageDirection(origin: Point, targets: Point[]): Point | undefined {
  let sumX = 0;
  let sumY = 0;
  let first: Point | undefined;

  for (const target of targets) {
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) continue;

    const unit = { x: dx / length, y: dy / length };
    sumX += unit.x;
    sumY += unit.y;
    first ??= unit;
  }

  if (Math.hypot(sumX, sumY) < 1e-6) return first;
  return { x: sumX, y: sumY };
}

// Where a ray from the box center in the given direction exits the box border.
function projectToBorder(box: Box, direction: Point): { side: Position; along: number } {
  const halfWidth = box.width / 2;
  const halfHeight = box.height / 2;

  if (Math.abs(direction.x) * halfHeight >= Math.abs(direction.y) * halfWidth) {
    const hitY = direction.y * (halfWidth / Math.abs(direction.x));
    return {
      side: direction.x > 0 ? Position.Right : Position.Left,
      along: halfHeight + hitY,
    };
  }

  const hitX = direction.x * (halfHeight / Math.abs(direction.y));
  return {
    side: direction.y > 0 ? Position.Bottom : Position.Top,
    along: halfWidth + hitX,
  };
}

type SpreadEntry = { key: string; along: number; fixed: boolean };

// Evenly spaced positions along a side, centered when they don't fill it.
function evenPositions(count: number, length: number): number[] {
  const inset = Math.min(HANDLE_EDGE_INSET_PX, length / 2);
  const step = count > 1 ? Math.max((length - inset * 2) / (count - 1), HANDLE_MIN_GAP_PX) : 0;
  const start = (length - step * (count - 1)) / 2;
  return Array.from({ length: count }, (_, i) => start + i * step);
}

// Keeps handles on one side at least HANDLE_MIN_GAP_PX apart. Fixed entries (unconnected handles at
// their even spots) never move, connected ones are pushed around them.
function spreadAlongSide(entries: SpreadEntry[], length: number): { key: string; offset: number }[] {
  const inset = Math.min(HANDLE_EDGE_INSET_PX, length / 2);
  const min = inset;
  const max = length - inset;
  const sorted = [...entries].sort((a, b) => a.along - b.along);
  const positions = sorted.map(({ along, fixed }) => (fixed ? along : Math.min(Math.max(along, min), max)));

  for (let i = 1; i < positions.length; i++) {
    if (!sorted[i].fixed) positions[i] = Math.max(positions[i], positions[i - 1] + HANDLE_MIN_GAP_PX);
  }

  for (let i = positions.length - 1; i >= 0; i--) {
    if (sorted[i].fixed) continue;
    const ceiling = i + 1 < positions.length ? positions[i + 1] - HANDLE_MIN_GAP_PX : max;
    positions[i] = Math.min(positions[i], ceiling);
  }

  return sorted.map((entry, i) => ({ key: entry.key, offset: (positions[i] / length) * 100 }));
}

function getNodeHandleAnchors(state: AnchorState, nodeId: string): Record<string, HandleAnchor> {
  const node = state.nodeLookup.get(nodeId);
  const self = getBox(node);
  if (!node || !self) return {};

  const center = getCenter(self);
  const peersByHandle = new Map<string, Point[]>();

  for (const edge of state.edges) {
    let key: string;
    let peerId: string;

    if (edge.source === nodeId) {
      key = handleKey('source', edge.sourceHandle ?? '');
      peerId = edge.target;
    } else if (edge.target === nodeId) {
      key = handleKey('target', edge.targetHandle ?? '');
      peerId = edge.source;
    } else {
      continue;
    }

    const peer = getBox(state.nodeLookup.get(peerId));
    if (!peer) continue;

    const peers = peersByHandle.get(key) ?? [];
    peers.push(getCenter(peer));
    peersByHandle.set(key, peers);
  }

  const entriesBySide = new Map<Position, SpreadEntry[]>();
  const addEntry = (side: Position, entry: SpreadEntry) => {
    const group = entriesBySide.get(side) ?? [];
    group.push(entry);
    entriesBySide.set(side, group);
  };
  const sideLength = (side: Position) =>
    side === Position.Top || side === Position.Bottom ? self.width : self.height;
  const placedKeys = new Set<string>();

  for (const [key, peers] of peersByHandle) {
    const direction = getAverageDirection(center, peers);
    if (!direction) continue;

    const { side, along } = projectToBorder(self, direction);
    addEntry(side, { key, along, fixed: false });
    placedKeys.add(key);
  }

  // Unconnected handles sit on their default side (inputs top, outputs bottom), evenly spaced there.
  const handleBounds = node.internals.handleBounds;
  const unconnectedBySide = new Map<Position, string[]>();

  for (const type of ['target', 'source'] as const) {
    const side = type === 'target' ? Position.Top : Position.Bottom;
    for (const element of handleBounds?.[type] ?? []) {
      const key = handleKey(type, element.id ?? '');
      if (placedKeys.has(key)) continue;

      const keys = unconnectedBySide.get(side) ?? [];
      keys.push(key);
      unconnectedBySide.set(side, keys);
    }
  }

  for (const [side, keys] of unconnectedBySide) {
    const positions = evenPositions(keys.length, sideLength(side));
    keys.forEach((key, i) => addEntry(side, { key, along: positions[i], fixed: true }));
  }

  const anchors: Record<string, HandleAnchor> = {};

  for (const [side, entries] of entriesBySide) {
    for (const { key, offset } of spreadAlongSide(entries, sideLength(side))) {
      anchors[key] = { position: side, offset };
    }
  }

  return anchors;
}

const isSameAnchor = (a: HandleAnchor | undefined, b: HandleAnchor | undefined) =>
  a?.position === b?.position && a?.offset === b?.offset;

export function getHandleAnchorStyle(anchor: HandleAnchor | undefined): CSSProperties {
  if (!anchor) return {};

  const percent = `${anchor.offset}%`;
  return anchor.position === Position.Top || anchor.position === Position.Bottom
    ? { left: percent, top: undefined }
    : { top: percent, left: undefined };
}

// Places a handle on the node border facing the peers of its connected edges.
// Returns undefined when the handle has no connections, so the default position applies.
export function useHandleAnchor(type: HandleType, handleId: string): HandleAnchor | undefined {
  const nodeId = useNodeId();
  const anchor = useStore(
    (state) => (nodeId ? getNodeHandleAnchors(state, nodeId)[handleKey(type, handleId)] : undefined),
    isSameAnchor,
  );
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    if (nodeId) updateNodeInternals(nodeId);
  }, [nodeId, anchor?.position, anchor?.offset, updateNodeInternals]);

  return anchor;
}
