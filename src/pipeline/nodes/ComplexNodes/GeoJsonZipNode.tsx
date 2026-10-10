import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import { GEOJSON_ZIP_DEFAULT_KEY, GEOJSON_ZIP_INPUT_HANDLES, GEOJSON_ZIP_KEYS_EVENT } from '@/types/types';
import { MenuItem, TextField, Typography } from '@mui/material';
import { Position, useNodeConnections, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const handleLeft = (index: number) =>
  `${((index + 1) / (GEOJSON_ZIP_INPUT_HANDLES.length + 1)) * 100}%`;

type GeoJsonZipNodeData = { key?: string };
type ZipKeysEventDetail = { nodeId: string; keys: string[] };

function GeoJsonZipNode({ id, data }: NodeProps<Node<GeoJsonZipNodeData>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const connections = useNodeConnections({ handleType: 'target' });
  const connectedCount = new Set(connections.map((connection) => connection.targetHandle)).size;
  const [commonKeys, setCommonKeys] = useState<string[]>([]);
  const selectedKey = data.key ?? GEOJSON_ZIP_DEFAULT_KEY;

  useEffect(() => {
    const handleKeys = (event: Event) => {
      const detail = (event as CustomEvent<ZipKeysEventDetail>).detail;

      if (detail.nodeId === id) {
        setCommonKeys(detail.keys);
      }
    };

    window.addEventListener(GEOJSON_ZIP_KEYS_EVENT, handleKeys);
    return () => window.removeEventListener(GEOJSON_ZIP_KEYS_EVENT, handleKeys);
  }, [id]);

  const changeKey = useCallback((key: string) => {
    setNodes((current) => current.map((node) =>
      node.id === id
        ? { ...node, data: { ...node.data, key } }
        : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  }, [id, setNodes]);

  // The saved key stays selectable even before the inputs share it.
  const keyOptions = commonKeys.includes(selectedKey) ? commonKeys : [selectedKey, ...commonKeys];

  return (
    <>
      {GEOJSON_ZIP_INPUT_HANDLES.map((handleId, index) => (
        <InputHandle
          key={handleId}
          id={handleId}
          position={Position.Top}
          style={{ left: handleLeft(index) }}
        />
      ))}
      <NodeWrapper type="geojson-zip" tools={<PipelineStageTiming nodeId={id} nodeType={'geojson-zip'} />}>
        <Typography variant="body2" color="text.secondary" sx={{ pb: 1 }}>
          {t('pipelineGeoJsonSetConnected', {
            connected: connectedCount,
            total: GEOJSON_ZIP_INPUT_HANDLES.length,
          })}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ pb: 1 }}>
          {t('pipelineGeoJsonZipHint')}
        </Typography>
        <TextField
          select
          className="nodrag nopan"
          fullWidth
          size="small"
          label={t('pipelineGeoJsonZipKeyLabel')}
          value={selectedKey}
          onChange={(event) => changeKey(event.target.value)}
          helperText={commonKeys.length === 0 ? t('pipelineGeoJsonZipNoCommonKeys') : undefined}
        >
          {keyOptions.map((key) => (
            <MenuItem key={key} value={key}>{key}</MenuItem>
          ))}
        </TextField>
        <OutputHandle id="geojson" position={Position.Bottom} />
      </NodeWrapper>
    </>
  );
}

export default GeoJsonZipNode;
