import { collectNumericValues } from '@/lib/geojsonChart';
import { listNumericPropertyKeys } from '@/lib/geojsonHeatmap';
import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import type { GeoJsonFeatureCollectionArray } from '@/types/types';
import { Box, MenuItem, TextField, Typography, useTheme } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import uPlot from 'uplot';

type GeoJsonChartData = { geojson?: GeoJsonFeatureCollectionArray; chartKey?: string };

function GeoJsonChartNode({ id, data }: NodeProps<Node<GeoJsonChartData>>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { setNodes } = useReactFlow();
  const collections = useMemo(() => data.geojson ?? [], [data.geojson]);
  const numericKeys = useMemo(() => listNumericPropertyKeys(collections), [collections]);
  const selectedKey = numericKeys.includes(data.chartKey ?? '') ? (data.chartKey ?? '') : '';
  const values = useMemo(
    () => (selectedKey ? collectNumericValues(collections, selectedKey) : null),
    [collections, selectedKey]
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  const updateKey = useCallback((chartKey: string) => {
    setNodes((current) => current.map((node) =>
      node.id === id ? { ...node, data: { ...node.data, chartKey } } : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  }, [id, setNodes]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !values) return;

    const textColor = theme.palette.text.secondary;
    const gridColor = theme.palette.divider;
    const seriesColor = theme.palette.primary.main;
    const axis = { stroke: textColor, grid: { stroke: gridColor, width: 1 }, ticks: { stroke: gridColor, width: 1 } };

    const plot = new uPlot({
      width: container.clientWidth,
      height: container.clientHeight,
      legend: { show: false },
      scales: { x: { time: false } },
      series: [
        { label: t('pipelineGeoJsonChartFeatureAxis') },
        {
          label: selectedKey,
          stroke: seriesColor,
          width: 2,
          spanGaps: true,
          points: { show: true, size: 4, stroke: seriesColor, fill: seriesColor },
        },
      ],
      axes: [
        { ...axis, label: t('pipelineGeoJsonChartFeatureAxis') },
        { ...axis, label: selectedKey },
      ],
    }, [values.map((_, index) => index), values], container);

    plotRef.current = plot;
    return () => {
      plot.destroy();
      plotRef.current = null;
    };
  }, [values, selectedKey, theme, t]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      plotRef.current?.setSize({ width: container.clientWidth, height: container.clientHeight });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <InputHandle id="geojson" position={Position.Top} />
      <NodeWrapper
        hint={<>{t('pipelineGeoJsonChartHint')}</>}
        type="geojson-chart"
        defaultSize={{ width: 528, height: 420 }}
        tools={<PipelineStageTiming nodeId={id} nodeType={'geojson-chart'} />}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, gap: 1.5 }}>
          <Box className="nodrag nopan" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField
              size="small"
              select
              label={t('pipelineGeoJsonChartKey')}
              value={selectedKey}
              onChange={(event) => updateKey(event.target.value)}
              helperText={numericKeys.length === 0 ? t('pipelineGeoJsonChartNoNumericKeys') : t('pipelineGeoJsonChartKeyHint')}
              fullWidth
            >
              <MenuItem value="" disabled>{t('pipelineGeoJsonChartKeyPlaceholder')}</MenuItem>
              {numericKeys.map((key) => (
                <MenuItem key={key} value={key}>{key}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Box sx={{ position: 'relative', flex: '1 1 auto', minHeight: 200, minWidth: 0 }}>
            <Box
              ref={containerRef}
              className="nodrag nopan nowheel"
              sx={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
            />
            {!values && (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center' }}>
                  {collections.length === 0 ? t('pipelineGeoJsonChartConnect') : t('pipelineGeoJsonChartPickKey')}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </NodeWrapper>
    </>
  );
}

export default GeoJsonChartNode;
