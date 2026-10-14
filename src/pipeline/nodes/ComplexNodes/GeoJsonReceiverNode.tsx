import { findPipelinesWithNode, usePipelineStoreSelector } from '@/context/pipelineStore';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import { Box, TextField, Typography } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type GeoJsonReceiverNodeData = { hash?: string };

function GeoJsonReceiverNode({ id, data }: NodeProps<Node<GeoJsonReceiverNodeData>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const savedPipelines = usePipelineStoreSelector((state) => state.pipelines);
  const currentPipeline = usePipelineStoreSelector((state) => state.currentPipeline);
  const storedHash = typeof data.hash === 'string' ? data.hash : '';
  const [draft, setDraft] = useState(storedHash);
  const [syncedHash, setSyncedHash] = useState(storedHash);

  if (storedHash !== syncedHash) {
    setSyncedHash(storedHash);
    setDraft(storedHash);
  }

  const broadcastPipelineNames = storedHash
    ? findPipelinesWithNode(savedPipelines, currentPipeline, 'geojson-broadcast', storedHash)
      .map((pipeline) => pipeline.name || t('untitledPipeline'))
    : [];

  const commit = () => {
    const hash = draft.trim();
    if (hash === storedHash) return;
    setDraft(hash);
    setNodes((current) => current.map((node) =>
      node.id === id ? { ...node, data: { ...node.data, hash } } : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  };

  return (
    <>
      <NodeWrapper type="geojson-receiver" defaultSize={{ width: 340 }} hint={t('pipelineGeoJsonReceiverHint')}>
        <TextField
          className="nodrag nopan"
          size="small"
          fullWidth
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
          }}
          placeholder={t('pipelineGeoJsonReceiverPlaceholder')}
          slotProps={{ htmlInput: { 'aria-label': t('pipelineGeoJsonReceiverHash'), spellCheck: false, autoComplete: 'off' } }}
        />
        {!storedHash && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('pipelineGeoJsonReceiverEmpty')}
            </Typography>
          </Box>
        )}
        {storedHash && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {broadcastPipelineNames.length > 0
                ? t('pipelineGeoJsonReceiverSourcePipelines', { names: broadcastPipelineNames.join(', ') })
                : t('pipelineGeoJsonReceiverSourceNone')}
            </Typography>
          </Box>
        )}
      </NodeWrapper>
      <OutputHandle id="geojson" position={Position.Bottom} />
    </>
  );
}

export default GeoJsonReceiverNode;
