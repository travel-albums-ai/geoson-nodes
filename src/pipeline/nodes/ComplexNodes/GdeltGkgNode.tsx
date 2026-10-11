import { usePipelineStoreSelector } from '@/context/pipelineStore';
import { GDELT_TIMESPAN_MINUTES, fetchGdeltGkgGeoJson } from '@/lib/gdeltGkg';
import { createGeoJsonFileKey, deleteGeoJsonFile, saveGeoJsonFile } from '@/lib/geojsonFileStore';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import { Button, Stack, Typography } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { Newspaper } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type GdeltGkgNodeData = {
  // The fetched FeatureCollection array lives in IndexedDB under fileKey (see geojsonFileStore).
  fileKey?: string;
  fetchedAt?: number;
  featureCount?: number;
};

function GdeltGkgNode({ id, data }: NodeProps<Node<GdeltGkgNodeData>>) {
  const { t, i18n } = useTranslation();
  const { getNodes, setNodes } = useReactFlow();
  const savedPipelines = usePipelineStoreSelector((state) => state.pipelines);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFileKeyReferenced = (key: string) =>
    savedPipelines.some((pipeline) => pipeline.nodes.some((node) => node.data.fileKey === key)) ||
    getNodes().some((node) => node.id !== id && node.data.fileKey === key);

  const fetchNews = async () => {
    setFetching(true);
    setError(null);

    try {
      const collections = await fetchGdeltGkgGeoJson();
      const fileKey = createGeoJsonFileKey();
      const file = new File([JSON.stringify(collections)], 'gdelt-gkg.geojson', { type: 'application/geo+json' });
      const featureCount = collections.reduce((total, collection) => total + collection.features.length, 0);

      await saveGeoJsonFile(fileKey, file);

      const previousKey = getNodes().find((node) => node.id === id)?.data.fileKey as string | undefined;

      setNodes((current) => current.map((node) => (
        node.id === id
          ? { ...node, data: { ...node.data, fileKey, fetchedAt: Date.now(), featureCount } }
          : node
      )));
      window.dispatchEvent(new CustomEvent('pipeline:changed'));

      if (previousKey && previousKey !== fileKey && !isFileKeyReferenced(previousKey)) {
        await deleteGeoJsonFile(previousKey);
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setFetching(false);
    }
  };

  return (
    <NodeWrapper type="gdelt-gkg-geojson" tools={<PipelineStageTiming nodeId={id} nodeType={'gdelt-gkg-geojson'} />}>
      <Stack spacing={1} sx={{ p: 1, minWidth: 220 }}>
        <Typography variant="body2">
          {t('pipelineGdeltGkgHint', { minutes: GDELT_TIMESPAN_MINUTES })}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Newspaper size={16} />}
          onClick={fetchNews}
          disabled={fetching}
          className="nodrag nopan"
        >
          {fetching ? t('pipelineGdeltGkgFetching') : t('pipelineGdeltGkgFetch')}
        </Button>
        {error && (
          <Typography variant="caption" color="error">{error}</Typography>
        )}
        {!error && data.fetchedAt !== undefined && (
          <Typography variant="caption" color="text.secondary">
            {t('pipelineGdeltGkgSummary', {
              count: data.featureCount ?? 0,
              time: new Date(data.fetchedAt).toLocaleTimeString(i18n.language),
            })}
          </Typography>
        )}
      </Stack>
      <OutputHandle id="geojson" position={Position.Bottom} />
    </NodeWrapper>
  );
}

export default GdeltGkgNode;
