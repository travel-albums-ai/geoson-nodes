import NewChip from '@/components/NewChip';
import { usePipelineStoreSelector } from '@/context/pipelineStore';
import { normalizeGeoBounds } from '@/lib/geojson';
import { createGeoJsonFileKey, deleteGeoJsonFile, saveGeoJsonFile } from '@/lib/geojsonFileStore';
import { OPEN_METEO_GRID_STEP, OPEN_METEO_MAX_LOCATIONS, OPEN_METEO_VARIABLES, countOpenMeteoGridPoints, fetchOpenMeteoGeoJson, type OpenMeteoVariable } from '@/lib/openMeteo';
import GeoBoundsPicker from '@/pipeline/components/GeoBoundsPicker';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import { Box, Button, Checkbox, FormControlLabel, FormGroup, Typography } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { Clock, CloudSun, LogOut } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GeoBounds } from '@/types/types';

type OpenMeteoLoaderNodeData = {
  // The loaded FeatureCollection array lives in IndexedDB under fileKey (see geojsonFileStore).
  fileKey?: string;
  fetchedAt?: number;
  featureCount?: number;
  // The map box that Load fetches weather for.
  bounds?: GeoBounds;
  // Filters the stored data in the worker, so changing it does not need a new fetch.
  variables?: OpenMeteoVariable[];
};

// Berlin and its surroundings, so the first load gives a small grid.
const DEFAULT_BOUNDS: GeoBounds = { west: 12.5, east: 14, south: 52, north: 53 };

const VARIABLE_LABEL_KEYS: Record<OpenMeteoVariable, string> = {
  temperature_2m: 'pipelineOpenMeteoLoaderTemperature',
  rain: 'pipelineOpenMeteoLoaderRain',
  apparent_temperature: 'pipelineOpenMeteoLoaderApparentTemperature',
  weather_code: 'pipelineOpenMeteoLoaderWeatherCode',
};

const formatDegrees = (value: number) => value.toFixed(2);

// Kept outside the component so the timestamp is not read during render.
async function loadOpenMeteoFile(bounds: GeoBounds) {
  const collections = await fetchOpenMeteoGeoJson(bounds);
  const fileKey = createGeoJsonFileKey();
  const file = new File([JSON.stringify(collections)], 'open-meteo.geojson', { type: 'application/geo+json' });
  const featureCount = collections.reduce((total, collection) => total + collection.features.length, 0);

  await saveGeoJsonFile(fileKey, file);

  return { fileKey, featureCount, fetchedAt: Date.now() };
}

function OpenMeteoLoaderNode({ id, data }: NodeProps<Node<OpenMeteoLoaderNodeData>>) {
  const { t, i18n } = useTranslation();
  const { getNodes, setNodes } = useReactFlow();
  const savedPipelines = usePipelineStoreSelector((state) => state.pipelines);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bounds = useMemo(() => normalizeGeoBounds(data.bounds ?? DEFAULT_BOUNDS), [data.bounds]);
  const pointCount = countOpenMeteoGridPoints(bounds);
  const selectedVariables = data.variables ?? [...OPEN_METEO_VARIABLES];

  const updateNodeData = (patch: Partial<OpenMeteoLoaderNodeData>) => {
    setNodes((current) => current.map((node) => (
      node.id === id ? { ...node, data: { ...node.data, ...patch } } : node
    )));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  };

  const commitBounds = (next: GeoBounds) => updateNodeData({ bounds: next });

  const toggleVariable = (variable: OpenMeteoVariable, checked: boolean) => {
    const next = checked
      ? OPEN_METEO_VARIABLES.filter((name) => name === variable || selectedVariables.includes(name))
      : selectedVariables.filter((name) => name !== variable);

    // At least one variable stays selected so the output always has weather data.
    if (next.length > 0) updateNodeData({ variables: [...next] });
  };

  const isFileKeyReferenced = (key: string) =>
    savedPipelines.some((pipeline) => pipeline.nodes.some((node) => node.data.fileKey === key)) ||
    getNodes().some((node) => node.id !== id && node.data.fileKey === key);

  const loadWeather = async () => {
    if (pointCount === 0) {
      setError(t('pipelineOpenMeteoLoaderNoPoints'));
      return;
    }

    if (pointCount > OPEN_METEO_MAX_LOCATIONS) {
      setError(t('pipelineOpenMeteoLoaderTooManyPoints', { count: pointCount, max: OPEN_METEO_MAX_LOCATIONS }));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { fileKey, featureCount, fetchedAt } = await loadOpenMeteoFile(bounds);
      const previousKey = getNodes().find((node) => node.id === id)?.data.fileKey as string | undefined;

      updateNodeData({ fileKey, fetchedAt, featureCount });

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
    <NodeWrapper type="open-meteo-loader"
      defaultSize={{ width: 448 }}
      outputCounts={<>
        <NewChip variant="important" count={data.featureCount} icon={<LogOut />} label="" fontSize={12} />
      </>}
      tools={<PipelineStageTiming nodeId={id} nodeType={'open-meteo-loader'} />}>
      <Typography variant="body2">{t('pipelineOpenMeteoLoaderHint')}</Typography>
      <Typography variant="body2" color="text.secondary">
        {t('pipelineGpsBoundsValues', {
          west: formatDegrees(bounds.west),
          east: formatDegrees(bounds.east),
          south: formatDegrees(bounds.south),
          north: formatDegrees(bounds.north),
        })}
      </Typography>
      <GeoBoundsPicker bounds={bounds} onCommit={commitBounds} />
      <Typography variant="caption" color={pointCount > OPEN_METEO_MAX_LOCATIONS ? 'error' : 'text.secondary'}>
        {t('pipelineOpenMeteoLoaderPoints', { count: pointCount, step: OPEN_METEO_GRID_STEP })}
      </Typography>
      <Typography variant="subtitle2">{t('pipelineOpenMeteoLoaderShow')}</Typography>
      <FormGroup className="nodrag nopan">
        {OPEN_METEO_VARIABLES.map((variable) => (
          <FormControlLabel
            key={variable}
            control={
              <Checkbox
                size="small"
                checked={selectedVariables.includes(variable)}
                onChange={(event) => toggleVariable(variable, event.target.checked)}
              />
            }
            label={<Typography variant="body2">{t(VARIABLE_LABEL_KEYS[variable])}</Typography>}
          />
        ))}
      </FormGroup>
      <Button
        variant="outlined"
        startIcon={<CloudSun size={16} />}
        onClick={loadWeather}
        disabled={loading}
        className="nodrag nopan"
      >
        {loading ? t('pipelineOpenMeteoLoaderLoading') : t('pipelineOpenMeteoLoaderLoad')}
      </Button>
      {error && (
        <Typography variant="caption" color="error">{error}</Typography>
      )}
      {!error && data.fetchedAt !== undefined && (<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <NewChip count={new Date(data.fetchedAt).toLocaleTimeString(i18n.language)} icon={<Clock />} label="Fetched" sx={{ height: 30 }} fontSize={12} />
      </Box>)}
      <OutputHandle id="geojson" position={Position.Bottom} />
    </NodeWrapper>
  );
}

export default OpenMeteoLoaderNode;
