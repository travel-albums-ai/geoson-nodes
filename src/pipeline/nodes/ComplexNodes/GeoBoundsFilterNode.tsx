import NewChip from '@/components/NewChip';
import { normalizeGeoBounds } from '@/lib/geojson';
import GeoBoundsPicker from '@/pipeline/components/GeoBoundsPicker';
import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import { GEO_BOUNDS_FILTER_COUNTS_EVENT, type GeoBounds } from '@/types/types';
import { Box } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, LogIn, LogOut } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type BoundsFilterCountsEventDetail = {
  nodeId: string;
  inputCount: number;
  outputCount: number;
};

const formatDegrees = (value: number) => value.toFixed(2);

function GeoBoundsFilterNode({ id, data }: NodeProps<Node<{ bounds?: GeoBounds }>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const bounds = useMemo(() => normalizeGeoBounds(data.bounds), [data.bounds]);
  const [counts, setCounts] = useState<BoundsFilterCountsEventDetail | null>(null);

  useEffect(() => {
    const handleCounts = (event: Event) => {
      const detail = (event as CustomEvent<BoundsFilterCountsEventDetail>).detail;

      if (detail.nodeId === id) {
        setCounts(detail);
      }
    };

    window.addEventListener(GEO_BOUNDS_FILTER_COUNTS_EVENT, handleCounts);
    return () => window.removeEventListener(GEO_BOUNDS_FILTER_COUNTS_EVENT, handleCounts);
  }, [id]);

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
      <NodeWrapper
        type="geo-bounds-filter"
        defaultSize={{ width: 448 }}
        inputCounts={
          <NewChip
            count={counts?.inputCount ?? 0}
            label={''}
            icon={<LogIn size={16} />}
            tooltip={t('pipelineGeoBoundsFilterEntering')}
            fontSize={12}
          />
        }
        outputCounts={
          <NewChip
            variant="important"
            count={counts?.outputCount ?? 0}
            label={''}
            icon={<LogOut size={16} />}
            tooltip={t('pipelineGeoBoundsFilterLeaving')}
            fontSize={12}
          />
        }
        tools={<PipelineStageTiming nodeId={id} nodeType={'geo-bounds-filter'} />}
      >
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <NewChip count={formatDegrees(bounds.west)} icon={<ArrowLeft />} label="West" sx={{ height: 30 }} fontSize={12} />
          <NewChip count={formatDegrees(bounds.east)} icon={<ArrowRight />} label="East" sx={{ height: 30 }} fontSize={12} />
          <NewChip count={formatDegrees(bounds.south)} icon={<ArrowDown />} label="South" sx={{ height: 30 }} fontSize={12} />
          <NewChip count={formatDegrees(bounds.north)} icon={<ArrowUp />} label="North" sx={{ height: 30 }} fontSize={12} />
        </Box>
        <GeoBoundsPicker bounds={bounds} onCommit={commitBounds} />
        <OutputHandle id="geojson" position={Position.Bottom} />
      </NodeWrapper>
    </>
  );
}

export default GeoBoundsFilterNode;
