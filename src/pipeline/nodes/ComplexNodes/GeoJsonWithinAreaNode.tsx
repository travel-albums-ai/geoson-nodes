import NewChip from '@/components/NewChip';
import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import { GEOJSON_WITHIN_AREA_COUNTS_EVENT, GEOJSON_WITHIN_AREA_INPUT_HANDLES } from '@/types/types';
import { FormControlLabel, Switch, Typography } from '@mui/material';
import { Position, useNodeConnections, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { LogIn, LogOut } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type WithinAreaCountsEventDetail = {
  nodeId: string;
  inputCounts: Record<string, number>;
  outputCount: number;
};

// Shown on the input chips, in the same order as GEOJSON_WITHIN_AREA_INPUT_HANDLES.
const WITHIN_AREA_INPUT_NAMES = ['A', 'B'];

const handleLeft = (index: number) =>
  `${((index + 1) / (GEOJSON_WITHIN_AREA_INPUT_HANDLES.length + 1)) * 100}%`;

function GeoJsonWithinAreaNode({ id, data }: NodeProps<Node<{ outside?: boolean }>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const connections = useNodeConnections({ handleType: 'target' });
  const connectedCount = new Set(connections.map((connection) => connection.targetHandle)).size;
  const [counts, setCounts] = useState<WithinAreaCountsEventDetail | null>(null);

  useEffect(() => {
    const handleCounts = (event: Event) => {
      const detail = (event as CustomEvent<WithinAreaCountsEventDetail>).detail;

      if (detail.nodeId === id) {
        setCounts(detail);
      }
    };

    window.addEventListener(GEOJSON_WITHIN_AREA_COUNTS_EVENT, handleCounts);
    return () => window.removeEventListener(GEOJSON_WITHIN_AREA_COUNTS_EVENT, handleCounts);
  }, [id]);

  const toggleOutside = useCallback((outside: boolean) => {
    setNodes((current) => current.map((node) =>
      node.id === id
        ? { ...node, data: { ...node.data, outside } }
        : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  }, [id, setNodes]);

  return (
    <>
      {GEOJSON_WITHIN_AREA_INPUT_HANDLES.map((handleId, index) => (
        <InputHandle
          key={handleId}
          id={handleId}
          position={Position.Top}
          style={{ left: handleLeft(index) }}
        />
      ))}
      <NodeWrapper
        type="geojson-within-area"
        inputCounts={<>
          {GEOJSON_WITHIN_AREA_INPUT_HANDLES.map((handleId, index) => (
            <NewChip
              key={handleId}
              count={counts?.inputCounts[handleId] ?? 0}
              label={WITHIN_AREA_INPUT_NAMES[index]}
              icon={<LogIn size={16} />}
              tooltip={t('pipelineGeoJsonWithinAreaEntering', { input: WITHIN_AREA_INPUT_NAMES[index] })}
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
            tooltip={t('pipelineGeoJsonWithinAreaLeaving')}
            fontSize={12}
          />
        }
        tools={<PipelineStageTiming nodeId={id} nodeType={'geojson-within-area'} />}
      >
        <Typography variant="body2" color="text.secondary" sx={{ pb: 1 }}>
          {t('pipelineGeoJsonSetConnected', {
            connected: connectedCount,
            total: GEOJSON_WITHIN_AREA_INPUT_HANDLES.length,
          })}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ pb: 1 }}>
          {t('pipelineGeoJsonWithinAreaHint')}
        </Typography>
        <FormControlLabel
          className="nodrag nopan"
          label={t('pipelineGeoJsonWithinAreaOutside')}
          control={
            <Switch
              size="small"
              checked={data.outside === true}
              onChange={(event) => toggleOutside(event.target.checked)}
            />
          }
        />
        <OutputHandle id="geojson" position={Position.Bottom} />
      </NodeWrapper>
    </>
  );
}

export default GeoJsonWithinAreaNode;
