import NewChip from '@/components/NewChip';
import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import { GEOJSON_MERGE_COUNTS_EVENT, GEOJSON_MERGE_INPUT_HANDLES } from '@/types/types';
import { Typography } from '@mui/material';
import { Position, useNodeConnections, type NodeProps } from '@xyflow/react';
import { LogIn, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type MergeCountsEventDetail = {
  nodeId: string;
  inputCounts: Record<string, number>;
  outputCount: number;
};

const handleLeft = (index: number) =>
  `${((index + 1) / (GEOJSON_MERGE_INPUT_HANDLES.length + 1)) * 100}%`;

function GeoJsonMergeNode({ id }: NodeProps) {
  const { t } = useTranslation();
  const connections = useNodeConnections({ handleType: 'target' });
  const connectedCount = new Set(connections.map((connection) => connection.targetHandle)).size;
  const [counts, setCounts] = useState<MergeCountsEventDetail | null>(null);

  useEffect(() => {
    const handleCounts = (event: Event) => {
      const detail = (event as CustomEvent<MergeCountsEventDetail>).detail;

      if (detail.nodeId === id) {
        setCounts(detail);
      }
    };

    window.addEventListener(GEOJSON_MERGE_COUNTS_EVENT, handleCounts);
    return () => window.removeEventListener(GEOJSON_MERGE_COUNTS_EVENT, handleCounts);
  }, [id]);

  return (
    <>
      {GEOJSON_MERGE_INPUT_HANDLES.map((handleId, index) => (
        <InputHandle
          key={handleId}
          id={handleId}
          position={Position.Top}
          style={{ left: handleLeft(index) }}
        />
      ))}
      <NodeWrapper type="geojson-merge"
        inputCounts={<>
          {GEOJSON_MERGE_INPUT_HANDLES
            .filter((handleId) => counts?.inputCounts[handleId] ?? 0 > 0)
            .map((handleId, index) => (
              <NewChip
                key={handleId}
                count={counts?.inputCounts[handleId] ?? 0}
                label={''}

                icon={<LogIn size={16} />}
                tooltip={t('pipelineGeoJsonMergeEntering', { input: index + 1 })}
                fontSize={12}
              />
            ))}
        </>}
        outputCounts={
          <NewChip
            variant="important"
            count={counts?.outputCount ?? 0}
            label={''}
            icon={<LogOut size={16} />}
            tooltip={t('pipelineGeoJsonMergeLeaving')}
            fontSize={12}
          />
        }
        tools={<PipelineStageTiming nodeId={id} nodeType={'geojson-merge'} />}>
        <Typography variant="body2" color="text.secondary" sx={{ pb: 1 }}>
          {t('pipelineGeoJsonMergeConnected', {
            connected: connectedCount,
            total: GEOJSON_MERGE_INPUT_HANDLES.length,
          })}
        </Typography>
        <OutputHandle id="geojson" position={Position.Bottom} />
      </NodeWrapper>
    </>
  );
}

export default GeoJsonMergeNode;
