import NewChip from '@/components/NewChip';
import { usePipelineStoreSelector } from '@/context/pipelineStore';
import { GDELT_EVENT_FILE_NAMES, fetchGdeltEventsGeoJson } from '@/lib/gdeltEvents';
import { createGeoJsonFileKey, deleteGeoJsonFile, saveGeoJsonFile } from '@/lib/geojsonFileStore';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { Clock, LogOut, Newspaper } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type GdeltEventsLoaderNodeData = {
  // The loaded FeatureCollection array lives in IndexedDB under fileKey (see geojsonFileStore).
  fileKey?: string;
  fetchedAt?: number;
  featureCount?: number;
  // The daily export picked in the dropdown; defaults to the newest file.
  fileName?: string;
};

function GdeltEventsLoaderNode({ id, data }: NodeProps<Node<GdeltEventsLoaderNodeData>>) {
  const { t, i18n } = useTranslation();
  const { getNodes, setNodes } = useReactFlow();
  const savedPipelines = usePipelineStoreSelector((state) => state.pipelines);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedFileName = data.fileName ?? GDELT_EVENT_FILE_NAMES[0];

  const updateNodeData = (patch: Partial<GdeltEventsLoaderNodeData>) => {
    setNodes((current) => current.map((node) => (
      node.id === id ? { ...node, data: { ...node.data, ...patch } } : node
    )));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  };

  const isFileKeyReferenced = (key: string) =>
    savedPipelines.some((pipeline) => pipeline.nodes.some((node) => node.data.fileKey === key)) ||
    getNodes().some((node) => node.id !== id && node.data.fileKey === key);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      const collections = await fetchGdeltEventsGeoJson(selectedFileName);
      const fileKey = createGeoJsonFileKey();
      const file = new File([JSON.stringify(collections)], 'gdelt-events.geojson', { type: 'application/geo+json' });
      const featureCount = collections.reduce((total, collection) => total + collection.features.length, 0);

      await saveGeoJsonFile(fileKey, file);

      const previousKey = getNodes().find((node) => node.id === id)?.data.fileKey as string | undefined;

      updateNodeData({ fileKey, fetchedAt: Date.now(), featureCount });

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
    <NodeWrapper type="gdelt-events-loader" tools={<PipelineStageTiming nodeId={id} nodeType={'gdelt-events-loader'} />}>
      <Stack spacing={1} sx={{ p: 1, minWidth: 280 }} className="nodrag nopan">
        <Typography variant="body2">{t('pipelineGdeltEventsLoaderHint')}</Typography>
        <TextField
          select
          size="small"
          fullWidth
          label={t('pipelineGdeltEventsLoaderFile')}
          value={selectedFileName}
          onChange={(event) => updateNodeData({ fileName: event.target.value })}
        >
          {GDELT_EVENT_FILE_NAMES.map((fileName) => (
            <MenuItem key={fileName} value={fileName}>
              <Typography variant="body2">{fileName}</Typography>
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="outlined"
          startIcon={<Newspaper size={16} />}
          onClick={loadEvents}
          disabled={loading}
        >
          {loading ? t('pipelineGdeltEventsLoaderLoading') : t('pipelineGdeltEventsLoaderLoad')}
        </Button>
        {error && (
          <Typography variant="caption" color="error">{error}</Typography>
        )}
        {!error && data.fetchedAt !== undefined && (<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NewChip count={new Date(data.fetchedAt).toLocaleTimeString(i18n.language)} icon={<Clock />} label="Fetched" sx={{ height: 30 }} fontSize={12} />
          <NewChip variant="important" count={data.featureCount} icon={<LogOut />} label="Features" sx={{ height: 30 }} fontSize={12} />
        </Box>)}
      </Stack>
      <OutputHandle id="geojson" position={Position.Bottom} />
    </NodeWrapper>
  );
}

export default GdeltEventsLoaderNode;
