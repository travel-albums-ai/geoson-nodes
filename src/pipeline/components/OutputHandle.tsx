import { getHandleAnchorStyle, useHandleAnchor } from '@/hooks/useHandleAnchor';
import { Box, useTheme } from '@mui/material';
import { Handle, Position } from "@xyflow/react";
import { Square } from 'lucide-react';

export function OutputHandle({ id, position, style, color }: { id: string; position?: Position; style?: React.CSSProperties; color?: string }) {
  const theme = useTheme()
  const anchor = useHandleAnchor('source', id);

  return <>
    <Handle
      type="source"
      style={{ width: '12px', height: '12px', backgroundColor: 'transparent', border: 0, ...style, ...getHandleAnchorStyle(anchor) }}
      position={anchor?.position ?? position ?? Position.Right}
      id={id}
    >
      <Box sx={{ position: 'relative',
        opacity: 0.5,
        filter: 'grayscale(0.5)',
        transition: 'opacity 0.25s ease, filter 0.25s ease',
        '&:hover': {
          opacity: 1,
          filter: 'grayscale(0)',
        },
      }}>
        <Square size={10} style={{
          position: 'absolute',
          right: '2px',
          stroke: theme.palette.divider,
          fill: color || theme.palette.primary.main,
        }} />
      </Box>
    </Handle>
  </>;
}
