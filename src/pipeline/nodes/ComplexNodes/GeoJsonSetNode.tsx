import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import { GEOJSON_SET_INPUT_HANDLES } from '@/types/types';
import { Typography } from '@mui/material';
import { Position, useNodeConnections, type NodeProps } from '@xyflow/react';
import { useTranslation } from 'react-i18next';

const handleLeft = (index: number) =>
  `${((index + 1) / (GEOJSON_SET_INPUT_HANDLES.length + 1)) * 100}%`;

// Shared by every set operation node; React Flow passes the node's own type.
function GeoJsonSetNode({ type }: NodeProps) {
  const { t } = useTranslation();
  const connections = useNodeConnections({ handleType: 'target' });
  const connectedCount = new Set(connections.map((connection) => connection.targetHandle)).size;

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
        <OutputHandle id="geojson" position={Position.Bottom} />
      </NodeWrapper>
    </>
  );
}

export default GeoJsonSetNode;
