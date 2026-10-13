import { getHandleAnchorStyle, useHandleAnchor } from '@/hooks/useHandleAnchor';
import { alpha, Typography, useTheme } from '@mui/material';
import { Handle, Position } from "@xyflow/react";
import { ChevronsLeft } from 'lucide-react';
import type { CSSProperties } from 'react';
const ICON_ROTATION_BY_SIDE: Record<Position, number> = {
  [Position.Right]: 0,
  [Position.Bottom]: 90,
  [Position.Left]: 180,
  [Position.Top]: -90,
};

export function InputHandle({
  id,
  index,
  position,
  style,
  color,
  indexValues
}: {
  id: string;
  index?: number;
  position?: Position;
  style?: CSSProperties;
  color?: string;
  indexValues?: string[];
}) {
  const theme = useTheme()
  const anchor = useHandleAnchor('target', id);
  const side = anchor?.position ?? position ?? Position.Left;

  return <>
    <Handle
      type="target"
      style={{
        width: '14px',
        height: '14px',
        backgroundColor: alpha(theme.palette.primary.main, 0.5),
        border: 0,
        ...style, ...getHandleAnchorStyle(anchor) }}
      position={side}
      id={id}
    >
      {index !== undefined && <>
        <Typography variant="caption" sx={{
          color: theme.palette.background.paper,
          fontSize: '0.65rem',
          position: 'absolute', left: '4px', top: '-2px'
        }}>
          {`${indexValues?.[index] ? `${indexValues[index]}` : `${index}`}`}
        </Typography>
      </>}
      {index === undefined && <>
        <ChevronsLeft size={12} style={{
          margin: '0px 0px 4px 1px',
          stroke: theme.palette.background.paper,
          strokeWidth: 2,
          fill: color || theme.palette.background.paper,
          transform: `rotate(${ICON_ROTATION_BY_SIDE[side]}deg)`,
        }} />
      </>}
    </Handle>
  </>;
}
