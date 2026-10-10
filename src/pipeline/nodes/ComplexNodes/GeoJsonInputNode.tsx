import NewChip from '@/components/NewChip';
import { usePipelineStoreSelector } from '@/context/pipelineStore';
import { parseGeoJsonFeatureCollections } from '@/lib/geojson';
import { createGeoJsonFileKey, deleteGeoJsonFile, loadGeoJsonFile, saveGeoJsonFile } from '@/lib/geojsonFileStore';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import { Box, Button, Typography } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { FileJson, Layers, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

function GeoJsonInputNode({ id, data }: NodeProps<Node<{ geojsonFile?: File; fileKey?: string }>>) {
  const { t } = useTranslation();
  const { getNodes } = useReactFlow();
  const savedPipelines = usePipelineStoreSelector((state) => state.pipelines);
  const [file, setFile] = useState(data.geojsonFile);
  // Only the counts are kept; the parsed collections are dropped once counted.
  const [counts, setCounts] = useState<{ collections: number; features: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const featureCount = counts?.features ?? 0;

  // Restores the file after a reload. The worker reads the same stored
  // record when it evaluates, so this only needs to refresh the preview.
  useEffect(() => {
    if (!data.fileKey || file) return;

    let cancelled = false;

    loadGeoJsonFile(data.fileKey)
      .then((restored) => {
        if (cancelled || !restored) return;
        setFile(restored);
      })
      .catch((reason: unknown) => {
        console.warn('Could not restore GeoJSON file', reason);
      });

    return () => {
      cancelled = true;
    };
  }, [data.fileKey, file]);

  // Parsing here only drives the node preview; the worker parses the
  // file again when the pipeline evaluates.
  useEffect(() => {
    if (!(file instanceof File)) {
      setCounts(null);
      setError(null);
      return;
    }

    let cancelled = false;

    file.text()
      .then((text) => {
        if (cancelled) return;
        const collections = parseGeoJsonFeatureCollections(text);
        setCounts({
          collections: collections.length,
          features: collections.reduce((total, collection) => total + collection.features.length, 0),
        });
        setError(null);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setCounts(null);
        setError(reason instanceof Error ? reason.message : String(reason));
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  // A stored record may still back a saved pipeline or a cloned node on the
  // canvas, so it is only removed when nothing else references it.
  const isFileKeyReferenced = (key: string) =>
    savedPipelines.some((pipeline) => pipeline.nodes.some((node) => node.data.fileKey === key)) ||
    getNodes().some((node) => node.id !== id && node.data.fileKey === key);

  const updateFile = (selected: File | undefined) => {
    if (!selected) return;

    const previousKey = data.fileKey;
    const fileKey = createGeoJsonFileKey();

    Reflect.set(data, 'geojsonFile', selected);
    Reflect.set(data, 'fileKey', fileKey);
    setFile(selected);

    window.dispatchEvent(
      new CustomEvent('pipeline:changed')
    );

    saveGeoJsonFile(fileKey, selected)
      .then(() => {
        if (previousKey && !isFileKeyReferenced(previousKey)) {
          return deleteGeoJsonFile(previousKey);
        }
      })
      .catch((reason: unknown) => {
        console.warn('Could not store GeoJSON file', reason);
      });
  };

  return (
    <NodeWrapper type="geojson-input" tools={
      <PipelineStageTiming nodeId={id} nodeType={'geojson-input'} />
    }>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap'}}>
        <Button
          fullWidth
          component="label"
          variant="outlined"
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
        <NewChip count={counts?.collections ?? 0} label={t('pipelineGeoJsonCollections')} fontSize={16} icon={<Layers size={16} />} sx={{ height: 38 }} />
        <NewChip count={featureCount} label={t('pipelineGeoJsonFeatures')} fontSize={16} icon={<MapPin size={16} />} sx={{ height: 38 }} />
        {file instanceof File && (
          <NewChip label={file.name} fontSize={16} icon={<FileJson size={16} />} sx={{ height: 38 }} />
        )}
        {error && (
          <Typography variant="caption" color="error" sx={{ width: '100%' }}>
            {error}
          </Typography>
        )}
      </Box>

      <OutputHandle id="geojson" position={Position.Top} />
    </NodeWrapper>
  );
}

export default GeoJsonInputNode;
