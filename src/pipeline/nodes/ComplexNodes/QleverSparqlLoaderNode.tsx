import NewChip from '@/components/NewChip';
import { usePipelineStoreSelector } from '@/context/pipelineStore';
import { createGeoJsonFileKey, deleteGeoJsonFile, saveGeoJsonFile } from '@/lib/geojsonFileStore';
import { buildChatGptQueryPrompt, buildChatGptUrl, DEFAULT_QLEVER_QUERY, runQleverSparql, sparqlResultsToGeoJson } from '@/lib/qleverSparql';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { Clock, Database, LogOut, MessageSquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type QleverSparqlLoaderNodeData = {
  // The SPARQL script last run; kept so the editor restores it after a reload.
  query?: string;
  // The GeoJSON FeatureCollection array lives in IndexedDB under fileKey (see geojsonFileStore).
  fileKey?: string;
  fetchedAt?: number;
  featureCount?: number;
};

const QUERY_DEBOUNCE_MS = 300;

function QleverSparqlLoaderNode({ id, data }: NodeProps<Node<QleverSparqlLoaderNodeData>>) {
  const { t, i18n } = useTranslation();
  const { getNodes, setNodes } = useReactFlow();
  const savedPipelines = usePipelineStoreSelector((state) => state.pipelines);
  const storedQuery = data.query ?? DEFAULT_QLEVER_QUERY;
  const [draft, setDraft] = useState(storedQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The last query known to match node data, so external changes can be told apart from our own commits.
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

  const openInChatGpt = () => {
    window.open(buildChatGptUrl(buildChatGptQueryPrompt(draft)), '_blank', 'noopener,noreferrer');
  };

  const updateNodeData = (patch: Partial<QleverSparqlLoaderNodeData>) => {
    setNodes((current) => current.map((node) => (
      node.id === id ? { ...node, data: { ...node.data, ...patch } } : node
    )));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  };

  const isFileKeyReferenced = (key: string) =>
    savedPipelines.some((pipeline) => pipeline.nodes.some((node) => node.data.fileKey === key)) ||
    getNodes().some((node) => node.id !== id && node.data.fileKey === key);

  const runQuery = async () => {
    setLoading(true);
    setError(null);

    try {
      syncedQueryRef.current = draft;
      const collections = sparqlResultsToGeoJson(await runQleverSparql(draft));
      const fileKey = createGeoJsonFileKey();
      const file = new File([JSON.stringify(collections)], 'qlever-sparql.geojson', { type: 'application/geo+json' });
      const featureCount = collections.reduce((total, collection) => total + collection.features.length, 0);

      await saveGeoJsonFile(fileKey, file);

      const previousKey = getNodes().find((node) => node.id === id)?.data.fileKey as string | undefined;

      updateNodeData({ query: draft, fileKey, fetchedAt: Date.now(), featureCount });

      if (previousKey && previousKey !== fileKey && !isFileKeyReferenced(previousKey)) {
        await deleteGeoJsonFile(previousKey);
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  };

  return (
    <NodeWrapper type="qlever-sparql-loader"
      defaultSize={{ height: 420 }}
      outputCounts={<>
        {data.featureCount !== undefined && <NewChip variant="important" count={data.featureCount} icon={<LogOut />} label="" fontSize={12} />}
      </>}
      tools={<PipelineStageTiming nodeId={id} nodeType={'qlever-sparql-loader'} />}>
      <Stack spacing={1} sx={{ minWidth: 320, flex: 1, minHeight: 0 }} className="nodrag nopan">
        <Typography variant="body2">{t('pipelineQleverSparqlLoaderHint')}</Typography>
        <TextField
          className="nowheel"
          multiline
          rows={6}
          fullWidth
          size="small"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          label={t('pipelineQleverSparqlLoaderQueryLabel')}
          placeholder={t('pipelineQleverSparqlLoaderPlaceholder')}
          helperText={t('pipelineQleverSparqlLoaderQueryHint')}
          sx={{
            flex: 1,
            minHeight: 0,
            '& .MuiInputBase-root': { flex: 1, minHeight: 0, alignItems: 'stretch' },
            '& textarea': { fontFamily: 'monospace', height: '100% !important', boxSizing: 'border-box' },
          }}
        />
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<Database size={16} />}
            onClick={runQuery}
            disabled={loading || draft.trim() === ''}
          >
            {loading ? t('pipelineQleverSparqlLoaderRunning') : t('pipelineQleverSparqlLoaderRun')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<MessageSquare size={16} />}
            onClick={openInChatGpt}
            disabled={draft.trim() === ''}
          >
            {t('pipelineQleverSparqlLoaderChatGpt')}
          </Button>
        </Stack>
        {error && (
          <Typography variant="caption" color="error" sx={{ whiteSpace: 'pre-wrap' }}>{error}</Typography>
        )}
        {!error && data.fetchedAt !== undefined && (<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NewChip count={new Date(data.fetchedAt).toLocaleTimeString(i18n.language)} icon={<Clock />} label={t('pipelineQleverSparqlLoaderFetched')} sx={{ height: 30 }} fontSize={12} />
        </Box>)}
      </Stack>
      <OutputHandle id="geojson" position={Position.Bottom} />
    </NodeWrapper>
  );
}

export default QleverSparqlLoaderNode;
