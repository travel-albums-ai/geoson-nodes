import NewChip from '@/components/NewChip';
import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import type { GeoJsonFeatureCollectionArray } from '@/types/types';
import { Box, TextField } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { Layers, MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type GeoJsonJsonataNodeData = {
  query?: string;
  geojson?: GeoJsonFeatureCollectionArray;
  error?: string;
};

const QUERY_DEBOUNCE_MS = 300;

function GeoJsonJsonataNode({ id, data }: NodeProps<Node<GeoJsonJsonataNodeData>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const storedQuery = data.query ?? '';
  const [draft, setDraft] = useState(storedQuery);
  // The last query known to match node data. Lets external changes be
  // distinguished from the node's own debounced commits.
  const syncedQueryRef = useRef(storedQuery);

  useEffect(() => {
    if (storedQuery === syncedQueryRef.current) return;

    syncedQueryRef.current = storedQuery;
    setDraft(storedQuery);
  }, [storedQuery]);

  useEffect(() => {
    if (draft === syncedQueryRef.current) return;

    const timer = window.setTimeout(() => {
      syncedQueryRef.current = draft;
      setNodes((current) => current.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, query: draft } }
          : node
      ));
      window.dispatchEvent(new CustomEvent('pipeline:changed'));
    }, QUERY_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [draft, id, setNodes]);

  const collections = data.geojson ?? [];
  const featureCount = collections.reduce((total, collection) => total + collection.features.length, 0);

  return (
    <>
      <InputHandle id="geojson" position={Position.Top} />
      <NodeWrapper type="geojson-jsonata" tools={<PipelineStageTiming nodeId={id} nodeType={'geojson-jsonata'} />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pb: 1 }}>
          <NewChip count={collections.length} label={t('pipelineGeoJsonCollections')} fontSize={16} icon={<Layers size={16} />} sx={{ height: 38 }} />
          <NewChip count={featureCount} label={t('pipelineGeoJsonFeatures')} fontSize={16} icon={<MapPin size={16} />} sx={{ height: 38 }} />
        </Box>
        <TextField
          className="nowheel"
          multiline
          minRows={3}
          maxRows={10}
          fullWidth
          size="small"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t('pipelineGeoJsonJsonataPlaceholder')}
          label={t('pipelineGeoJsonJsonataQueryLabel')}
          error={data.error !== undefined}
          helperText={data.error ?? t('pipelineGeoJsonJsonataHint')}
          sx={{ '& textarea': { fontFamily: 'monospace' } }}
        />
        <OutputHandle id="geojson" position={Position.Bottom} />
      </NodeWrapper>
    </>
  );
}

export default GeoJsonJsonataNode;
