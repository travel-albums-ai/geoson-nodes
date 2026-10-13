import { getHandleAnchorStyle, useHandleAnchor } from '@/hooks/useHandleAnchor';
import { alpha, Box, useTheme } from '@mui/material';
import { Handle, Position } from "@xyflow/react";
import { ChevronsRight } from 'lucide-react';

export function OutputHandle({ id, position, style, color }: { id: string; position?: Position; style?: React.CSSProperties; color?: string }) {
  const theme = useTheme()
  const anchor = useHandleAnchor('source', id);

  return <>
    <Handle
      type="source"
      style={{
        width: '14px', height: '14px',
        backgroundColor: alpha(theme.palette.primary.main, 0.5),
        border: 0,
        ...style, ...getHandleAnchorStyle(anchor) }}
      position={anchor?.position ?? position ?? Position.Right}
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
        <ChevronsRight size={12} style={{
          position: 'absolute',
          right: '1px',
          top: '1px',
          stroke: theme.palette.background.paper,
          strokeWidth: 2,
          fill: color || theme.palette.background.paper,
        }} />
      </Box>
    </Handle>
  </>;
}
