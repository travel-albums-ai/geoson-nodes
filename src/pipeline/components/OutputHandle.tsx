import { getHandleAnchorStyle, useHandleAnchor } from '@/hooks/useHandleAnchor';
import { alpha, useTheme } from '@mui/material';
import { Handle, Position } from "@xyflow/react";
import { LogOut } from 'lucide-react';

// LogOut icon points right by default; rotate it to face the side the handle sits on.
const ICON_ROTATION_BY_SIDE: Record<Position, number> = {
  [Position.Right]: 0,
  [Position.Bottom]: 90,
  [Position.Left]: 180,
  [Position.Top]: -90,
};

export function OutputHandle({ id, position, style, color }: { id: string; position?: Position; style?: React.CSSProperties; color?: string }) {
  const theme = useTheme()
  const anchor = useHandleAnchor('source', id);
  const side = anchor?.position ?? position ?? Position.Right;

  return <>
    <Handle
      type="source"
      style={{
        width: '14px', height: '14px',
        backgroundColor: alpha(theme.palette.primary.main, 0.5),
        border: 0,
        padding: 0,
        ...style, ...getHandleAnchorStyle(anchor) }}
      position={side}
      id={id}
    >
      <LogOut size={10} style={{
        margin: '0px 0px 4px 2px',
        stroke: theme.palette.background.paper,
        strokeWidth: 2,
        fill: color || theme.palette.background.paper,
        transform: `rotate(${ICON_ROTATION_BY_SIDE[side]}deg)`,
      }} />
    </Handle>
  </>;
}
