import { getHandleAnchorStyle, useHandleAnchor } from '@/hooks/useHandleAnchor';
import { alpha, Box, Typography, useTheme } from '@mui/material';
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
  color
}: {
  id: string;
  index?: number;
  position?: Position;
  style?: CSSProperties;
  color?: string;
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
      <Box sx={{ position: 'relative',
        opacity: 0.75,
        filter: 'grayscale(0.5)',
        transition: 'opacity 0.25s ease, filter 0.25s ease',
        '&:hover': {
          opacity: 1,
          filter: 'grayscale(0)',
        },
      }}>
        {index !== undefined && <>
          <Typography variant="caption" sx={{
            color: theme.palette.background.paper,
            fontSize: '0.65rem',
            position: 'absolute', left: '4px', top: '-2px'
          }}>
            {`${index}`}
          </Typography>
        </>}
        {index === undefined && <>
          <ChevronsLeft size={10} style={{
            margin: '0px 0px 4px 2px',
            stroke: theme.palette.background.paper,
            strokeWidth: 2,
            fill: color || theme.palette.background.paper,
            transform: `rotate(${ICON_ROTATION_BY_SIDE[side]}deg)`,
          }} />
        </>}
      </Box>
    </Handle>
  </>;
}
