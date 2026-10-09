import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import { GEOJSON_MERGE_INPUT_HANDLES } from '@/types/types';
import { Typography } from '@mui/material';
import { Position, useNodeConnections } from '@xyflow/react';
import { useTranslation } from 'react-i18next';

const handleLeft = (index: number) =>
  `${((index + 1) / (GEOJSON_MERGE_INPUT_HANDLES.length + 1)) * 100}%`;

function GeoJsonMergeNode() {
  const { t } = useTranslation();
  const connections = useNodeConnections({ handleType: 'target' });
  const connectedCount = new Set(connections.map((connection) => connection.targetHandle)).size;

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
      <NodeWrapper type="geojson-merge">
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
