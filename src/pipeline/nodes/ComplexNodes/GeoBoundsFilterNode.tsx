import GeoBoundsPicker from '@/pipeline/components/GeoBoundsPicker';
import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import { normalizeGeoBounds } from '@/lib/geojson';
import type { GeoBounds } from '@/types/types';
import { Typography } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const formatDegrees = (value: number) => value.toFixed(2);

function GeoBoundsFilterNode({ id, data }: NodeProps<Node<{ bounds?: GeoBounds }>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const bounds = useMemo(() => normalizeGeoBounds(data.bounds), [data.bounds]);

  const commitBounds = useCallback((next: GeoBounds) => {
    setNodes((current) => current.map((node) =>
      node.id === id
        ? { ...node, data: { ...node.data, bounds: next } }
        : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  }, [id, setNodes]);

  return (
    <>
      <InputHandle id="geojson" position={Position.Top} />
      <NodeWrapper type="geo-bounds-filter" tools={<PipelineStageTiming nodeId={id} nodeType={'geo-bounds-filter'} />}>
        <Typography variant="body2" color="text.secondary" sx={{ pb: 1 }}>
          {t('pipelineGpsBoundsValues', {
            west: formatDegrees(bounds.west),
            east: formatDegrees(bounds.east),
            south: formatDegrees(bounds.south),
            north: formatDegrees(bounds.north),
          })}
        </Typography>
        <GeoBoundsPicker bounds={bounds} onCommit={commitBounds} />
        <OutputHandle id="geojson" position={Position.Bottom} />
      </NodeWrapper>
    </>
  );
}

export default GeoBoundsFilterNode;
