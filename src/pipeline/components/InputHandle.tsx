import { getHandleAnchorStyle, useHandleAnchor } from '@/hooks/useHandleAnchor';
import { alpha, Box, Typography, useTheme } from '@mui/material';
import { Handle, Position } from "@xyflow/react";
import type { CSSProperties } from 'react';

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

  return <>
    <Handle
      type="target"
      style={{
        width: '14px',
        height: '14px',
        backgroundColor: alpha(theme.palette.primary.main, 0.5),
        border: 0,
        ...style, ...getHandleAnchorStyle(anchor) }}
      position={anchor?.position ?? position ?? Position.Left}
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
      </Box>
    </Handle>
  </>;
}
