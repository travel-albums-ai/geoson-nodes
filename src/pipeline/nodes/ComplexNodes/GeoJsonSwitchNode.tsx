import NewChip from '@/components/NewChip';
import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import { GEOJSON_SWITCH_COUNTS_EVENT, GEOJSON_SWITCH_INPUT_HANDLES } from '@/types/types';
import { Box, FormControlLabel, Switch } from '@mui/material';
import { Position, useNodeConnections, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { Link, LogIn, LogOut } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type SwitchCountsEventDetail = {
  nodeId: string;
  inputCounts: Record<string, number>;
  outputCount: number;
};

// Shown on the input chips, in the same order as GEOJSON_SWITCH_INPUT_HANDLES.
const SWITCH_INPUT_NAMES = ['A', 'B'];

const handleLeft = (index: number) =>
  `${((index + 1) / (GEOJSON_SWITCH_INPUT_HANDLES.length + 1)) * 100}%`;

function GeoJsonSwitchNode({ id, data }: NodeProps<Node<{ serveB?: boolean }>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const connections = useNodeConnections({ handleType: 'target' });
  const connectedCount = new Set(connections.map((connection) => connection.targetHandle)).size;
  const [counts, setCounts] = useState<SwitchCountsEventDetail | null>(null);

  useEffect(() => {
    const handleCounts = (event: Event) => {
      const detail = (event as CustomEvent<SwitchCountsEventDetail>).detail;

      if (detail.nodeId === id) {
        setCounts(detail);
      }
    };

    window.addEventListener(GEOJSON_SWITCH_COUNTS_EVENT, handleCounts);
    return () => window.removeEventListener(GEOJSON_SWITCH_COUNTS_EVENT, handleCounts);
  }, [id]);

  const toggleServeB = useCallback((serveB: boolean) => {
    setNodes((current) => current.map((node) =>
      node.id === id
        ? { ...node, data: { ...node.data, serveB } }
        : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  }, [id, setNodes]);

  return (
    <>
      {GEOJSON_SWITCH_INPUT_HANDLES.map((handleId, index) => (
        <InputHandle
          indexValues={['A', 'B']}
          index={index}
          key={handleId}
          id={handleId}
          position={Position.Top}
          style={{ left: handleLeft(index) }}
        />
      ))}
      <NodeWrapper
        hint={<>{t('pipelineGeoJsonSwitchHint')}</>}
        type="geojson-switch"
        inputCounts={<>
          {GEOJSON_SWITCH_INPUT_HANDLES.map((handleId, index) => (
            <NewChip
              key={handleId}
              variant={(data.serveB === true) === (index === 1) ? 'important' : 'text'}
              count={counts?.inputCounts[handleId] ?? 0}
              label={SWITCH_INPUT_NAMES[index]}
              icon={<LogIn size={16} />}
              tooltip={t('pipelineGeoJsonSwitchEntering', { input: SWITCH_INPUT_NAMES[index] })}
              fontSize={12}
            />
          ))}
        </>}
        outputCounts={<>
          <NewChip
            count={connectedCount ?? 0}
            label={''}
            icon={<Link size={16} />}
            tooltip={t('pipelineGeoJsonSwitchLeaving')}
            fontSize={12}
          />
          <NewChip
            variant="important"
            count={counts?.outputCount ?? 0}
            label={''}
            icon={<LogOut size={16} />}
            tooltip={t('pipelineGeoJsonSwitchLeaving')}
            fontSize={12}
          />
        </>}
        tools={<PipelineStageTiming nodeId={id} nodeType={'geojson-switch'} />}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FormControlLabel
            className="nodrag nopan"
            label={t('pipelineGeoJsonSwitchServeB')}
            control={
              <Switch
                checked={data.serveB === true}
                onChange={(event) => toggleServeB(event.target.checked)}
              />
            }
          />
        </Box>
        <OutputHandle id="geojson" position={Position.Bottom} />
      </NodeWrapper>
    </>
  );
}

export default GeoJsonSwitchNode;
