import NewChip from '@/components/NewChip';
import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import { GEOJSON_SET_INPUT_HANDLES, GEOJSON_SET_KEYS_EVENT } from '@/types/types';
import { Box, FormControlLabel, MenuItem, Switch, TextField } from '@mui/material';
import { Position, useNodeConnections, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { Link } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const handleLeft = (index: number) =>
  `${((index + 1) / (GEOJSON_SET_INPUT_HANDLES.length + 1)) * 100}%`;

type GeoJsonSetNodeData = { reversed?: boolean; key?: string };
type SetKeysEventDetail = { nodeId: string; keys: string[] };

// Empty key: features match on their full content.
const WHOLE_FEATURE_KEY = '';

// Shared by every set operation node; React Flow passes the node's own type.
function GeoJsonSetNode({ id, type, data }: NodeProps<Node<GeoJsonSetNodeData>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const connections = useNodeConnections({ handleType: 'target' });
  const connectedCount = new Set(connections.map((connection) => connection.targetHandle)).size;
  const [propertyKeys, setPropertyKeys] = useState<string[]>([]);
  const selectedKey = data.key ?? WHOLE_FEATURE_KEY;

  useEffect(() => {
    const handleKeys = (event: Event) => {
      const detail = (event as CustomEvent<SetKeysEventDetail>).detail;

      if (detail.nodeId === id) {
        setPropertyKeys(detail.keys);
      }
    };

    window.addEventListener(GEOJSON_SET_KEYS_EVENT, handleKeys);
    return () => window.removeEventListener(GEOJSON_SET_KEYS_EVENT, handleKeys);
  }, [id]);

  const toggleReversed = useCallback((reversed: boolean) => {
    setNodes((current) => current.map((node) =>
      node.id === id
        ? { ...node, data: { ...node.data, reversed } }
        : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  }, [id, setNodes]);

  const changeKey = useCallback((key: string) => {
    setNodes((current) => current.map((node) =>
      node.id === id
        ? { ...node, data: { ...node.data, key } }
        : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  }, [id, setNodes]);

  // The saved key stays selectable even before the inputs carry it.
  const keyOptions = selectedKey === WHOLE_FEATURE_KEY || propertyKeys.includes(selectedKey)
    ? propertyKeys
    : [selectedKey, ...propertyKeys];

  return (
    <>
      {GEOJSON_SET_INPUT_HANDLES.map((handleId, index) => (
        <InputHandle
          index={index}
          indexValues={['A', "B"]}
          key={handleId}
          id={handleId}
          position={Position.Top}
          style={{ left: handleLeft(index) }}
        />
      ))}
      <NodeWrapper type={type}
        outputCounts={<>
          <NewChip
            count={connectedCount ?? 0}
            label={''}
            icon={<Link size={16} />}
            tooltip={t('pipelineGeoJsonSwitchLeaving')}
            fontSize={12}
          />
        </>}
        tools={<PipelineStageTiming nodeId={id} nodeType={type} />}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FormControlLabel
            className="nodrag nopan"
            label={t('pipelineGeoJsonSetSwapInputs')}
            control={
              <Switch
                checked={data.reversed === true}
                onChange={(event) => toggleReversed(event.target.checked)}
              />
            }
          />
        </Box>
        <TextField
          select
          className="nodrag nopan"
          fullWidth
          size="small"
          label={t('pipelineGeoJsonSetKeyLabel')}
          value={selectedKey}
          onChange={(event) => changeKey(event.target.value)}
          helperText={propertyKeys.length === 0 ? t('pipelineGeoJsonSetNoKeys') : undefined}
          sx={{ mt: 1 }}
        >
          <MenuItem value={WHOLE_FEATURE_KEY}>{t('pipelineGeoJsonSetWholeFeature')}</MenuItem>
          {keyOptions.map((key) => (
            <MenuItem key={key} value={key}>{key}</MenuItem>
          ))}
        </TextField>
        <OutputHandle id="geojson" position={Position.Bottom} />
      </NodeWrapper>
    </>
  );
}

export default GeoJsonSetNode;
