export type NodeSize = { width: number; height: number };

export const NODE_MIN_WIDTH = 280;
export const NODE_MIN_HEIGHT = 160;

// Node data is persisted as JSON, so the stored size is validated before use.
export function readNodeSize(value: unknown): NodeSize | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const { width, height } = value as Partial<NodeSize>;
  return typeof width === 'number' && typeof height === 'number' ? { width, height } : undefined;
}
