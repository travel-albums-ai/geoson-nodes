import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import { GEOJSON_FEATURE_COUNT_EVENT } from '@/types/types';
import { Box, Slider, Typography } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type GeoJsonFeaturePickerNodeData = { featureIndex?: number };
type FeatureCountEventDetail = { nodeId: string; count: number };

function GeoJsonFeaturePickerNode({ id, data }: NodeProps<Node<GeoJsonFeaturePickerNodeData>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const [featureCount, setFeatureCount] = useState(0);
  const maxIndex = Math.max(featureCount - 1, 0);
  const selectedIndex = Math.min(data.featureIndex ?? 0, maxIndex);

  useEffect(() => {
    const handleCount = (event: Event) => {
      const detail = (event as CustomEvent<FeatureCountEventDetail>).detail;

      if (detail.nodeId === id) {
        setFeatureCount(detail.count);
      }
    };

    window.addEventListener(GEOJSON_FEATURE_COUNT_EVENT, handleCount);
    return () => window.removeEventListener(GEOJSON_FEATURE_COUNT_EVENT, handleCount);
  }, [id]);

  const changeIndex = useCallback((featureIndex: number) => {
    setNodes((current) => current.map((node) =>
      node.id === id
        ? { ...node, data: { ...node.data, featureIndex } }
        : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  }, [id, setNodes]);

  return (
    <>
      <InputHandle id="geojson" position={Position.Top} />
      <NodeWrapper type="geojson-feature-picker" tools={<PipelineStageTiming nodeId={id} nodeType={'geojson-feature-picker'} />}>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ pb: 1 }}>
          {t('pipelineGeoJsonFeaturePickerHint')}
        </Typography>
        <Box className="nodrag nopan" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {featureCount === 0
              ? t('pipelineGeoJsonFeaturePickerNoFeatures')
              : t('pipelineGeoJsonFeaturePickerIndex', { index: selectedIndex, total: featureCount })}
          </Typography>
          <Slider
            size="small"
            min={0}
            max={maxIndex}
            step={1}
            value={selectedIndex}
            disabled={featureCount === 0}
            onChange={(_, value) => changeIndex(value as number)}
          />
        </Box>
        <OutputHandle id="geojson" position={Position.Bottom} />
      </NodeWrapper>
    </>
  );
}

export default GeoJsonFeaturePickerNode;
