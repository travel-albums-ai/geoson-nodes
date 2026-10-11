import NewChip from '@/components/NewChip';
import { usePipelineStoreSelector } from '@/context/pipelineStore';
import { createGeoJsonFileKey, deleteGeoJsonFile, saveGeoJsonFile } from '@/lib/geojsonFileStore';
import { OPEN_METEO_VARIABLES, fetchOpenMeteoGeoJson, readCoordinate, type OpenMeteoVariable } from '@/lib/openMeteo';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import { Box, Button, Checkbox, FormControlLabel, FormGroup, Stack, TextField, Typography } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { Clock, CloudSun, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type OpenMeteoLoaderNodeData = {
  // The loaded FeatureCollection array lives in IndexedDB under fileKey (see geojsonFileStore).
  fileKey?: string;
  fetchedAt?: number;
  featureCount?: number;
  // Kept as text so a partially typed coordinate is not lost while editing.
  latitude?: string;
  longitude?: string;
  // Filters the stored data in the worker, so changing it does not need a new fetch.
  variables?: OpenMeteoVariable[];
};

const DEFAULT_LATITUDE = '52.52';
const DEFAULT_LONGITUDE = '13.41';

const VARIABLE_LABEL_KEYS: Record<OpenMeteoVariable, string> = {
  temperature_2m: 'pipelineOpenMeteoLoaderTemperature',
  rain: 'pipelineOpenMeteoLoaderRain',
  apparent_temperature: 'pipelineOpenMeteoLoaderApparentTemperature',
  weather_code: 'pipelineOpenMeteoLoaderWeatherCode',
};

function OpenMeteoLoaderNode({ id, data }: NodeProps<Node<OpenMeteoLoaderNodeData>>) {
  const { t, i18n } = useTranslation();
  const { getNodes, setNodes } = useReactFlow();
  const savedPipelines = usePipelineStoreSelector((state) => state.pipelines);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latitude = data.latitude ?? DEFAULT_LATITUDE;
  const longitude = data.longitude ?? DEFAULT_LONGITUDE;
  const selectedVariables = data.variables ?? [...OPEN_METEO_VARIABLES];

  const updateNodeData = (patch: Partial<OpenMeteoLoaderNodeData>) => {
    setNodes((current) => current.map((node) => (
      node.id === id ? { ...node, data: { ...node.data, ...patch } } : node
    )));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  };

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
    const lat = readCoordinate(latitude, 90);
    const lon = readCoordinate(longitude, 180);

    if (lat === null || lon === null) {
      setError(t('pipelineOpenMeteoLoaderInvalidCoordinates'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const collections = await fetchOpenMeteoGeoJson(lat, lon);
      const fileKey = createGeoJsonFileKey();
      const file = new File([JSON.stringify(collections)], 'open-meteo.geojson', { type: 'application/geo+json' });
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
    <NodeWrapper type="open-meteo-loader"
      outputCounts={<>
        <NewChip variant="important" count={data.featureCount} icon={<LogOut />} label="" fontSize={12} />
      </>}
      tools={<PipelineStageTiming nodeId={id} nodeType={'open-meteo-loader'} />}>
      <Stack spacing={1} sx={{ minWidth: 280 }} className="nodrag nopan">
        <Typography variant="body2">{t('pipelineOpenMeteoLoaderHint')}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            label={t('pipelineOpenMeteoLoaderLatitude')}
            value={latitude}
            onChange={(event) => updateNodeData({ latitude: event.target.value })}
            error={readCoordinate(latitude, 90) === null}
          />
          <TextField
            size="small"
            label={t('pipelineOpenMeteoLoaderLongitude')}
            value={longitude}
            onChange={(event) => updateNodeData({ longitude: event.target.value })}
            error={readCoordinate(longitude, 180) === null}
          />
        </Box>
        <Typography variant="subtitle2">{t('pipelineOpenMeteoLoaderShow')}</Typography>
        <FormGroup>
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
        >
          {loading ? t('pipelineOpenMeteoLoaderLoading') : t('pipelineOpenMeteoLoaderLoad')}
        </Button>
        {error && (
          <Typography variant="caption" color="error">{error}</Typography>
        )}
        {!error && data.fetchedAt !== undefined && (<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NewChip count={new Date(data.fetchedAt).toLocaleTimeString(i18n.language)} icon={<Clock />} label="Fetched" sx={{ height: 30 }} fontSize={12} />
        </Box>)}
      </Stack>
      <OutputHandle id="geojson" position={Position.Bottom} />
    </NodeWrapper>
  );
}

export default OpenMeteoLoaderNode;
