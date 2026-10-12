import NewChip from '@/components/NewChip';
import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import { GEOJSON_JSONATA_COUNTS_EVENT, type GeoJsonFeatureCollectionArray } from '@/types/types';
import { Box, FormControlLabel, Switch, TextField } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { LogIn, LogOut } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type GeoJsonJsonataNodeData = {
  query?: string;
  negate?: boolean;
  geojson?: GeoJsonFeatureCollectionArray;
  error?: string;
};

type JsonataCountsEventDetail = {
  nodeId: string;
  inputCount: number;
  outputCount: number;
};

const QUERY_DEBOUNCE_MS = 300;

function GeoJsonJsonataNode({ id, data }: NodeProps<Node<GeoJsonJsonataNodeData>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const storedQuery = data.query ?? '';
  const [draft, setDraft] = useState(storedQuery);
  const [counts, setCounts] = useState<JsonataCountsEventDetail | null>(null);
  // The last query known to match node data. Lets external changes be
  // distinguished from the node's own debounced commits.
  const syncedQueryRef = useRef(storedQuery);

  useEffect(() => {
    const handleCounts = (event: Event) => {
      const detail = (event as CustomEvent<JsonataCountsEventDetail>).detail;

      if (detail.nodeId === id) {
        setCounts(detail);
      }
    };

    window.addEventListener(GEOJSON_JSONATA_COUNTS_EVENT, handleCounts);
    return () => window.removeEventListener(GEOJSON_JSONATA_COUNTS_EVENT, handleCounts);
  }, [id]);

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

  const toggleNegate = useCallback((negate: boolean) => {
    setNodes((current) => current.map((node) =>
      node.id === id
        ? { ...node, data: { ...node.data, negate } }
        : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  }, [id, setNodes]);

  return (
    <>
      <InputHandle id="geojson" position={Position.Top} />
      <NodeWrapper
        type="geojson-jsonata"
        inputCounts={
          <NewChip
            count={counts?.inputCount ?? 0}
            label={''}
            icon={<LogIn size={16} />}
            tooltip={t('pipelineGeoJsonJsonataEntering')}
            fontSize={12}
          />
        }
        outputCounts={
          <NewChip
            variant="important"
            // A failed query passes nothing on, so show zero rather than the last successful count.
            count={data.error !== undefined ? 0 : counts?.outputCount ?? 0}
            label={''}
            icon={<LogOut size={16} />}
            tooltip={t('pipelineGeoJsonJsonataLeaving')}
            fontSize={12}
          />
        }
        tools={<PipelineStageTiming nodeId={id} nodeType={'geojson-jsonata'} />}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pb: 1 }}>
          <FormControlLabel
            className="nodrag nopan"
            label={t('pipelineGeoJsonJsonataNegate')}
            control={
              <Switch
                size="small"
                checked={data.negate === true}
                onChange={(event) => toggleNegate(event.target.checked)}
              />
            }
          />
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
