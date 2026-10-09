import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import { GEOJSON_SET_INPUT_HANDLES } from '@/types/types';
import { FormControlLabel, Switch, Typography } from '@mui/material';
import { Position, useNodeConnections, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const handleLeft = (index: number) =>
  `${((index + 1) / (GEOJSON_SET_INPUT_HANDLES.length + 1)) * 100}%`;

// Shared by every set operation node; React Flow passes the node's own type.
function GeoJsonSetNode({ id, type, data }: NodeProps<Node<{ reversed?: boolean }>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const connections = useNodeConnections({ handleType: 'target' });
  const connectedCount = new Set(connections.map((connection) => connection.targetHandle)).size;

  const toggleReversed = useCallback((reversed: boolean) => {
    setNodes((current) => current.map((node) =>
      node.id === id
        ? { ...node, data: { ...node.data, reversed } }
        : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  }, [id, setNodes]);

  return (
    <>
      {GEOJSON_SET_INPUT_HANDLES.map((handleId, index) => (
        <InputHandle
          key={handleId}
          id={handleId}
          position={Position.Top}
          style={{ left: handleLeft(index) }}
        />
      ))}
      <NodeWrapper type={type}>
        <Typography variant="body2" color="text.secondary" sx={{ pb: 1 }}>
          {t('pipelineGeoJsonSetConnected', {
            connected: connectedCount,
            total: GEOJSON_SET_INPUT_HANDLES.length,
          })}
        </Typography>
        <FormControlLabel
          className="nodrag nopan"
          label={t('pipelineGeoJsonSetSwapInputs')}
          control={
            <Switch
              size="small"
              checked={data.reversed === true}
              onChange={(event) => toggleReversed(event.target.checked)}
            />
          }
        />
        <OutputHandle id="geojson" position={Position.Bottom} />
      </NodeWrapper>
    </>
  );
}

export default GeoJsonSetNode;
