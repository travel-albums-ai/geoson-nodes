import NewChip from '@/components/NewChip';
import { usePipelineStoreSelector } from '@/context/pipelineStore';
import { createGeoJsonFileKey, deleteGeoJsonFile, saveGeoJsonFile } from '@/lib/geojsonFileStore';
import { fetchUrlGeoJson, parseHttpUrl, URL_GEOJSON_EXAMPLE_URLS } from '@/lib/urlGeoJson';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import { URL_GEOJSON_LOADER_COUNTS_EVENT } from '@/types/types';
import { Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { Clock, Download, LogOut, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const EXAMPLES = [
  { labelKey: 'pipelineUrlGeoJsonLoaderExampleEonet', url: URL_GEOJSON_EXAMPLE_URLS.eonet },
  { labelKey: 'pipelineUrlGeoJsonLoaderExampleUsgsHour', url: URL_GEOJSON_EXAMPLE_URLS.usgsHour },
  { labelKey: 'pipelineUrlGeoJsonLoaderExampleUsgsSignificantWeek', url: URL_GEOJSON_EXAMPLE_URLS.usgsSignificantWeek },
  { labelKey: 'pipelineUrlGeoJsonLoaderExampleUsgsMagnitude45Day', url: URL_GEOJSON_EXAMPLE_URLS.usgsMagnitude45Day },
  { labelKey: 'pipelineUrlGeoJsonLoaderExampleGdelt', url: URL_GEOJSON_EXAMPLE_URLS.gdeltTimespan15 },
  { labelKey: 'pipelineUrlGeoJsonLoaderExampleGeoMap', url: URL_GEOJSON_EXAMPLE_URLS.geoMap },
  { labelKey: 'pipelineUrlGeoJsonLoaderExampleAirport', url: URL_GEOJSON_EXAMPLE_URLS.airport },
  { labelKey: 'pipelineUrlGeoJsonLoaderExampleUnesco', url: URL_GEOJSON_EXAMPLE_URLS.unesco },
  { labelKey: 'pipelineUrlGeoJsonLoaderExamplePassportIndex', url: URL_GEOJSON_EXAMPLE_URLS.passportIndex },
  { labelKey: 'pipelineUrlGeoJsonLoaderExampleVaccines', url: URL_GEOJSON_EXAMPLE_URLS.vaccines },
];

type UrlGeoJsonLoaderNodeData = {
  // The fetched FeatureCollection array lives in IndexedDB under fileKey (see geojsonFileStore).
  fileKey?: string;
  fetchedAt?: number;
  featureCount?: number;
  // The feed picked in the dropdown; defaults to the first example.
  url?: string;
  // URLs added with the text field.
  entries?: string[];
};

function UrlGeoJsonLoaderNode({ id, data }: NodeProps<Node<UrlGeoJsonLoaderNodeData>>) {
  const { t, i18n } = useTranslation();
  const { getNodes, setNodes } = useReactFlow();
  const savedPipelines = usePipelineStoreSelector((state) => state.pipelines);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [counts, setCounts] = useState<{ outputCount: number } | null>(null);

  useEffect(() => {
    const handleCounts = (event: Event) => {
      const detail = (event as CustomEvent<{ nodeId: string; outputCount: number }>).detail;

      if (detail.nodeId === id) {
        setCounts({ outputCount: detail.outputCount });
      }
    };

    window.addEventListener(URL_GEOJSON_LOADER_COUNTS_EVENT, handleCounts);
    return () => window.removeEventListener(URL_GEOJSON_LOADER_COUNTS_EVENT, handleCounts);
  }, [id]);

  const entries = data.entries ?? [];
  const selectedUrl = data.url ?? EXAMPLES[0].url;
  const options = [...EXAMPLES.map((example) => example.url), ...entries];

  const labelFor = (url: string) => {
    const example = EXAMPLES.find((item) => item.url === url);
    return example ? t(example.labelKey) : url;
  };

  const updateNodeData = (patch: Partial<UrlGeoJsonLoaderNodeData>) => {
    setNodes((current) => current.map((node) => (
      node.id === id ? { ...node, data: { ...node.data, ...patch } } : node
    )));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  };

  const isFileKeyReferenced = (key: string) =>
    savedPipelines.some((pipeline) => pipeline.nodes.some((node) => node.data.fileKey === key)) ||
    getNodes().some((node) => node.id !== id && node.data.fileKey === key);

  const addEntry = () => {
    const href = parseHttpUrl(newUrl);
    if (!href) {
      setError(t('pipelineUrlGeoJsonLoaderInvalidUrl'));
      return;
    }

    const isKnown = options.includes(href);
    updateNodeData({ url: href, entries: isKnown ? entries : [...entries, href] });
    setNewUrl('');
    setError(null);
  };

  const fetchFeed = async () => {
    setFetching(true);
    setError(null);

    try {
      const collections = await fetchUrlGeoJson(selectedUrl);
      const fileKey = createGeoJsonFileKey();
      const file = new File([JSON.stringify(collections)], 'url-geojson.geojson', { type: 'application/geo+json' });
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
      setFetching(false);
    }
  };

  return (
    <NodeWrapper
      hint={<>{t('pipelineUrlGeoJsonLoaderHint')}</>}
      type="url-geojson-loader"
      outputCounts={<>
        {!error && data.fetchedAt !== undefined && (
          <NewChip count={new Date(data.fetchedAt).toLocaleTimeString(i18n.language)} icon={<Clock />} label="Loaded" sx={{ height: 30 }} fontSize={12} />
        )}
        <NewChip
          variant="important"
          count={counts?.outputCount ?? 0}
          label={''}
          icon={<LogOut size={16} />}
          tooltip={t('pipelineUrlGeoJsonLoaderLeaving')}
          fontSize={12}
        />
      </>}
      tools={<PipelineStageTiming nodeId={id} nodeType={'url-geojson-loader'} />}
    >
      <Box sx={{ minWidth: 280, display: 'flex', flexDirection: 'column', gap: 2 }} className="nodrag nopan">
        <TextField
          select
          size="small"
          fullWidth
          label={t('pipelineUrlGeoJsonLoaderSource')}
          value={selectedUrl}
          onChange={(event) => updateNodeData({ url: event.target.value })}
        >
          {options.map((url) => (
            <MenuItem key={url} value={url}>
              <Typography variant="body2" noWrap>{labelFor(url)}</Typography>
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder={t('pipelineUrlGeoJsonLoaderNewUrlPlaceholder')}
            value={newUrl}
            onChange={(event) => setNewUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addEntry();
              }
            }}
          />
          <Button size="small" variant="outlined" onClick={addEntry} disabled={!newUrl.trim()}>
            <Plus size={16} />
          </Button>
        </Box>
        <Button
          variant="contained"
          startIcon={<Download size={16} />}
          onClick={fetchFeed}
          disabled={fetching}
        >
          {fetching ? t('pipelineUrlGeoJsonLoaderFetching') : t('pipelineUrlGeoJsonLoaderFetch')}
        </Button>
        {error && (
          <Typography variant="caption" color="error">{error}</Typography>
        )}
      </Box>
      <OutputHandle id="geojson" position={Position.Bottom} />
    </NodeWrapper>
  );
}

export default UrlGeoJsonLoaderNode;
