import { DEFAULT_GEOJSON_STYLE, readGeoJsonStyleSettings, type GeoJsonStyleSettings } from '@/lib/geojsonStyle';
import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import { Box, Slider, TextField, Typography } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

function GeoJsonStyleNode({ id, data }: NodeProps<Node<{ style?: Partial<GeoJsonStyleSettings> }>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const style = readGeoJsonStyleSettings({ ...DEFAULT_GEOJSON_STYLE, ...data.style });

  const updateStyle = useCallback((patch: Partial<GeoJsonStyleSettings>) => {
    setNodes((current) => current.map((node) =>
      node.id === id
        ? { ...node, data: { ...node.data, style: { ...readGeoJsonStyleSettings(node.data.style), ...patch } } }
        : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  }, [id, setNodes]);

  return (
    <>
      <InputHandle id="geojson" position={Position.Top} />
      <NodeWrapper type="geojson-style">
        <Typography variant="caption" color="text.secondary" component="div" sx={{ pb: 1 }}>
          {t('pipelineGeoJsonStyleHint')}
        </Typography>
        <Box className="nodrag nopan" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            size="small"
            type="color"
            label={t('pipelineGeoJsonStyleFill')}
            value={style.fill}
            onChange={(event) => updateStyle({ fill: event.target.value })}
            fullWidth
          />
          <TextField
            size="small"
            type="color"
            label={t('pipelineGeoJsonStyleStroke')}
            value={style.stroke}
            onChange={(event) => updateStyle({ stroke: event.target.value })}
            fullWidth
          />
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('pipelineGeoJsonStyleOpacity', { value: Math.round(style.opacity * 100) })}
            </Typography>
            <Slider
              size="small"
              min={0}
              max={100}
              value={Math.round(style.opacity * 100)}
              onChange={(_, value) => updateStyle({ opacity: (value as number) / 100 })}
            />
          </Box>
        </Box>
        <OutputHandle id="geojson" position={Position.Bottom} />
      </NodeWrapper>
    </>
  );
}

export default GeoJsonStyleNode;
