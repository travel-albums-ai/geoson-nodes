import { HEATMAP_COMPLEXITY, HEATMAP_GRANULARITY, HEATMAP_SMOOTHING, readGeoJsonHeatmapSettings, type GeoJsonHeatmapSettings } from '@/lib/geojsonHeatmap';
import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import { Box, Slider, Typography } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

function GeoJsonHeatmapNode({ id, data }: NodeProps<Node<{ heatmap?: Partial<GeoJsonHeatmapSettings> }>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const settings = readGeoJsonHeatmapSettings(data.heatmap);

  const updateSettings = useCallback((patch: Partial<GeoJsonHeatmapSettings>) => {
    setNodes((current) => current.map((node) =>
      node.id === id
        ? { ...node, data: { ...node.data, heatmap: { ...readGeoJsonHeatmapSettings(node.data.heatmap), ...patch } } }
        : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  }, [id, setNodes]);

  return (
    <>
      <InputHandle id="geojson" position={Position.Top} />
      <NodeWrapper type="geojson-heatmap" tools={<PipelineStageTiming nodeId={id} nodeType={'geojson-heatmap'} />}>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ pb: 1 }}>
          {t('pipelineGeoJsonHeatmapHint')}
        </Typography>
        <Box className="nodrag nopan" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('pipelineGeoJsonHeatmapGranularity', { value: settings.granularity })}
            </Typography>
            <Slider
              size="small"
              min={HEATMAP_GRANULARITY.min}
              max={HEATMAP_GRANULARITY.max}
              step={HEATMAP_GRANULARITY.step}
              value={settings.granularity}
              onChange={(_, value) => updateSettings({ granularity: value as number })}
            />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('pipelineGeoJsonHeatmapComplexity', { value: settings.complexity })}
            </Typography>
            <Slider
              size="small"
              min={HEATMAP_COMPLEXITY.min}
              max={HEATMAP_COMPLEXITY.max}
              step={HEATMAP_COMPLEXITY.step}
              value={settings.complexity}
              onChange={(_, value) => updateSettings({ complexity: value as number })}
            />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('pipelineGeoJsonHeatmapSmoothing', { value: settings.smoothing })}
            </Typography>
            <Slider
              size="small"
              min={HEATMAP_SMOOTHING.min}
              max={HEATMAP_SMOOTHING.max}
              step={HEATMAP_SMOOTHING.step}
              value={settings.smoothing}
              onChange={(_, value) => updateSettings({ smoothing: value as number })}
            />
          </Box>
        </Box>
        <OutputHandle id="geojson" position={Position.Bottom} />
      </NodeWrapper>
    </>
  );
}

export default GeoJsonHeatmapNode;
