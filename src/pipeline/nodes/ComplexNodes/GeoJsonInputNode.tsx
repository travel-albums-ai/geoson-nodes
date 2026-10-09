import NewChip from '@/components/NewChip';
import { parseGeoJsonFeatureCollections } from '@/lib/geojson';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import type { GeoJsonFeatureCollectionArray } from '@/types/types';
import { Box, Button, Typography } from '@mui/material';
import { Position, type Node, type NodeProps } from '@xyflow/react';
import { FileJson, Layers, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

function GeoJsonInputNode({ id, data }: NodeProps<Node<{ geojsonFile?: File }>>) {
  const { t } = useTranslation();
  const [file, setFile] = useState(data.geojsonFile);
  const [collections, setCollections] = useState<GeoJsonFeatureCollectionArray | null>(null);
  const [error, setError] = useState<string | null>(null);

  const featureCount = collections?.reduce((total, collection) => total + collection.features.length, 0) ?? 0;

  // Parsing here only drives the node preview; the worker parses the
  // file again when the pipeline evaluates.
  useEffect(() => {
    if (!(file instanceof File)) {
      setCollections(null);
      setError(null);
      return;
    }

    let cancelled = false;

    file.text()
      .then((text) => {
        if (cancelled) return;
        setCollections(parseGeoJsonFeatureCollections(text));
        setError(null);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setCollections(null);
        setError(reason instanceof Error ? reason.message : String(reason));
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  const updateFile = (selected: File | undefined) => {
    if (!selected) return;

    Reflect.set(data, 'geojsonFile', selected);
    setFile(selected);

    window.dispatchEvent(
      new CustomEvent('pipeline:changed')
    );
  };

  return (
    <NodeWrapper type="geojson-input" tools={
      <PipelineStageTiming nodeId={id} nodeType={'geojson-input'} />
    }>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap'}}>
        <Button
          sx={{
            bgcolor: theme => `color-mix(in srgb, ${theme.palette.background.paper} 80%, ${theme.palette.primary.main} 20%)`,
            '&:hover': {
              bgcolor: 'primary.main',
            }
          }}
          fullWidth
          component="label"
          variant="contained"
          startIcon={<FileJson size={16} />}
        >
          {t('pipelineGeoJsonSelectFile')}
          <input
            type="file"
            accept=".json,.geojson,application/geo+json,application/json"
            hidden
            onChange={(event) => {
              updateFile(event.target.files?.[0]);

              // Allows selecting the same file again
              event.target.value = "";
            }}
          />
        </Button>
        <NewChip count={collections?.length ?? 0} label={t('pipelineGeoJsonCollections')} fontSize={16} icon={<Layers size={16} />} sx={{ height: 38 }} />
        <NewChip count={featureCount} label={t('pipelineGeoJsonFeatures')} fontSize={16} icon={<MapPin size={16} />} sx={{ height: 38 }} />
        {file instanceof File && (
          <Typography variant="caption" color="textSecondary" sx={{ width: '100%' }}>
            {file.name}
          </Typography>
        )}
        {error && (
          <Typography variant="caption" color="error" sx={{ width: '100%' }}>
            {error}
          </Typography>
        )}
      </Box>

      {/* <GeoJsonCollectionList collections={collections} emptyMessage={t('pipelineGeoJsonEmpty')} /> */}

      <OutputHandle id="geojson" position={Position.Top} />
    </NodeWrapper>
  );
}

export default GeoJsonInputNode;
