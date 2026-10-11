import NewChip from '@/components/NewChip';
import { usePipelineStoreSelector } from '@/context/pipelineStore';
import { parseFitFile } from '@/lib/fit';
import { createFitFilesKey, deleteFitFiles, loadFitFiles, saveFitFiles } from '@/lib/fitFileStore';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import { Box, Button, Typography } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { Bike, FileJson, Layers, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const FIT_EXTENSION = /\.fit$/i;

async function parseFitFiles(files: File[]) {
  return Promise.all(files.map(async (file) => parseFitFile(await file.arrayBuffer(), file.name)));
}

function FitInputNode({ id, data }: NodeProps<Node<{ fileKey?: string }>>) {
  const { t } = useTranslation();
  const { getNodes, setNodes } = useReactFlow();
  const savedPipelines = usePipelineStoreSelector((state) => state.pipelines);
  const [files, setFiles] = useState<File[]>([]);
  // Only the counts are kept; the parsed collections are dropped once counted.
  const [counts, setCounts] = useState<{ collections: number; features: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Restores the files after a reload. The worker reads the same stored
  // records when it evaluates, so this only refreshes the preview.
  useEffect(() => {
    if (!data.fileKey || files.length > 0) return;

    let cancelled = false;

    loadFitFiles(data.fileKey)
      .then((restored) => {
        if (!cancelled) setFiles(restored);
      })
      .catch((reason: unknown) => {
        console.warn('Could not restore FIT files', reason);
      });

    return () => {
      cancelled = true;
    };
  }, [data.fileKey, files.length]);

  // Parsing here only drives the node preview; the worker parses the
  // files again when the pipeline evaluates.
  useEffect(() => {
    if (files.length === 0) {
      setCounts(null);
      return;
    }

    let cancelled = false;

    parseFitFiles(files)
      .then((collections) => {
        if (cancelled) return;
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
  }, [files]);

  // A stored record may still back a saved pipeline or a cloned node on the
  // canvas, so it is only removed when nothing else references it.
  const isFileKeyReferenced = (key: string) =>
    savedPipelines.some((pipeline) => pipeline.nodes.some((node) => node.data.fileKey === key)) ||
    getNodes().some((node) => node.id !== id && node.data.fileKey === key);

  // A new selection replaces the previous one. Files are parsed before they
  // are stored, so an invalid selection leaves the current files in place.
  const updateFiles = async (selected: File[]) => {
    const fitFiles = selected.filter((file) => FIT_EXTENSION.test(file.name));
    if (fitFiles.length === 0) {
      setError(t('pipelineFitInputNoFitFiles'));
      return;
    }

    try {
      await parseFitFiles(fitFiles);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      return;
    }

    const previousKey = data.fileKey;
    const fileKey = createFitFilesKey();

    try {
      await saveFitFiles(fileKey, fitFiles);
    } catch (reason) {
      console.warn('Could not store FIT files', reason);
      setError(t('pipelineFitInputSaveFailed'));
      return;
    }

    setNodes((current) => current.map((node) => (
      node.id === id ? { ...node, data: { ...node.data, fileKey } } : node
    )));
    setFiles(fitFiles);
    window.dispatchEvent(new CustomEvent('pipeline:changed'));

    if (previousKey && !isFileKeyReferenced(previousKey)) {
      deleteFitFiles(previousKey).catch((reason: unknown) => {
        console.warn('Could not delete previous FIT files', reason);
      });
    }
  };

  return (
    <NodeWrapper type="fit-input" tools={
      <PipelineStageTiming nodeId={id} nodeType={'fit-input'} />
    }>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Button
          fullWidth
          component="label"
          variant="outlined"
          startIcon={<Bike size={16} />}
        >
          {t('pipelineFitInputSelectFiles')}
          <input
            type="file"
            accept=".fit"
            multiple
            hidden
            onChange={(event) => {
              const selected = Array.from(event.target.files ?? []);

              // Allows selecting the same files again
              event.target.value = "";
              void updateFiles(selected);
            }}
          />
        </Button>
        <NewChip count={files.length} label={t('pipelineFitInputFiles')} fontSize={16} icon={<FileJson size={16} />} sx={{ height: 38 }} />
        <NewChip count={counts?.collections ?? 0} label={t('pipelineGeoJsonCollections')} fontSize={16} icon={<Layers size={16} />} sx={{ height: 38 }} />
        <NewChip count={counts?.features ?? 0} label={t('pipelineGeoJsonFeatures')} fontSize={16} icon={<MapPin size={16} />} sx={{ height: 38 }} />
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

export default FitInputNode;
