import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import { GEOJSON_WITHIN_AREA_INPUT_HANDLES } from '@/types/types';
import { FormControlLabel, Switch, Typography } from '@mui/material';
import { Position, useNodeConnections, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const handleLeft = (index: number) =>
  `${((index + 1) / (GEOJSON_WITHIN_AREA_INPUT_HANDLES.length + 1)) * 100}%`;

function GeoJsonWithinAreaNode({ id, data }: NodeProps<Node<{ outside?: boolean }>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const connections = useNodeConnections({ handleType: 'target' });
  const connectedCount = new Set(connections.map((connection) => connection.targetHandle)).size;

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
      <NodeWrapper type="geojson-within-area">
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
