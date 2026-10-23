import { buildAskGptPrompt, listPropertyKeys } from '@/lib/askGpt';
import { buildChatGptUrl } from '@/lib/qleverSparql';
import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import type { GeoJsonFeatureCollectionArray } from '@/types/types';
import { Box, Button, TextField, Typography } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type AskGptNodeData = { geojson?: GeoJsonFeatureCollectionArray; propertyKeys?: string[] };

function AskGptNode({ id, data }: NodeProps<Node<AskGptNodeData>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const collections = useMemo(() => data.geojson ?? [], [data.geojson]);
  const availableKeys = useMemo(() => listPropertyKeys(collections), [collections]);
  // Keys saved on the node may refer to properties the current input no longer has.
  const selectedKeys = useMemo(
    () => (data.propertyKeys ?? []).filter((key) => availableKeys.includes(key)),
    [data.propertyKeys, availableKeys]
  );
  const featureCount = collections.reduce((total, collection) => total + collection.features.length, 0);

  const updateSelectedKeys = (propertyKeys: string[]) => {
    setNodes((current) => current.map((node) =>
      node.id === id ? { ...node, data: { ...node.data, propertyKeys } } : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  };

  const askGpt = () => {
    window.open(buildChatGptUrl(buildAskGptPrompt(collections, selectedKeys)), '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <InputHandle id="geojson" position={Position.Top} />
      <NodeWrapper
        hint={<>{t('pipelineAskGptHint')}</>}
        type="ask-gpt"
        defaultSize={{ width: 360 }}
        tools={<PipelineStageTiming nodeId={id} nodeType={'ask-gpt'} />}
      >XXX
        <Box className="nodrag nopan" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Autocomplete<string, true>
            multiple
            size="small"
            options={availableKeys}
            value={selectedKeys}
            onChange={(_event, keys) => updateSelectedKeys(keys)}
            filterSelectedOptions
            noOptionsText={t('pipelineAskGptNoKeys')}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('pipelineAskGptKeys')}
                placeholder={t('pipelineAskGptKeysPlaceholder')}
                helperText={featureCount === 0 ? t('pipelineAskGptConnect') : t('pipelineAskGptKeysHint')}
              />
            )}
          />
          <Typography variant="body2" color="text.secondary">
            {featureCount > 0 && selectedKeys.length > 0
              ? t('pipelineAskGptSummary', { features: featureCount, keys: selectedKeys.length })
              : null}
          </Typography>
          <Button
            fullWidth
            variant="contained"
            startIcon={<MessageSquare size={16} />}
            onClick={askGpt}
            disabled={featureCount === 0 || selectedKeys.length === 0}
          >
            {t('pipelineAskGptAsk')}
          </Button>
        </Box>
      </NodeWrapper>
    </>
  );
}

export default AskGptNode;
