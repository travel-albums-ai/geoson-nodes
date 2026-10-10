import NewChip from '@/components/NewChip';
import { usePipelineStoreSelector } from '@/context/pipelineStore';
import { parseGeoJsonFeatureCollections } from '@/lib/geojson';
import { createGeoJsonFileKey, deleteGeoJsonFile, loadGeoJsonFile, saveGeoJsonFile } from '@/lib/geojsonFileStore';
import GeoJsonCollectionList from '@/pipeline/components/GeoJsonCollectionList';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import type { GeoJsonFeature, GeoJsonFeatureCollectionArray } from '@/types/types';
import { Box, Button, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { Eye, EyeOff, FileJson, Layers, MapPin } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const SEARCH_DEBOUNCE_MS = 300;

function matchesSearch(feature: GeoJsonFeature, term: string): boolean {
  const geometryType = feature.geometry?.type;
  if (typeof geometryType === 'string' && geometryType.toLowerCase().includes(term)) return true;

  return Object.values(feature.properties ?? {}).some(
    (value) => typeof value === 'string' && value.toLowerCase().includes(term),
  );
}

function GeoJsonInputNode({
  id,
  data,
}: NodeProps<Node<{ geojsonFile?: File; fileKey?: string; showPreview?: boolean; searchTerm?: string }>>) {
  const { t } = useTranslation();
  const { getNodes, setNodes } = useReactFlow();
  const savedPipelines = usePipelineStoreSelector((state) => state.pipelines);
  const [file, setFile] = useState(data.geojsonFile);
  // Only the counts are kept; the parsed collections are dropped once counted.
  const [counts, setCounts] = useState<{ collections: number; features: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Shown unless hidden, as in the GeoJSON viewer.
  const showPreview = data.showPreview !== false;
  const [previewCollections, setPreviewCollections] = useState<GeoJsonFeatureCollectionArray | null>(null);
  const storedSearchTerm = data.searchTerm ?? '';
  const [searchDraft, setSearchDraft] = useState(storedSearchTerm);
  // Tells external changes apart from this node's own debounced commits.
  const syncedSearchRef = useRef(storedSearchTerm);

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

  // Parsed only while the preview is visible, so a hidden preview holds no collections.
  useEffect(() => {
    if (!showPreview || !(file instanceof File)) {
      setPreviewCollections(null);
      return;
    }

    let cancelled = false;

    file.text()
      .then((text) => {
        if (!cancelled) setPreviewCollections(parseGeoJsonFeatureCollections(text));
      })
      .catch(() => {
        // The counts effect reports read and parse errors.
        if (!cancelled) setPreviewCollections(null);
      });

    return () => {
      cancelled = true;
    };
  }, [file, showPreview]);

  useEffect(() => {
    if (storedSearchTerm === syncedSearchRef.current) return;

    syncedSearchRef.current = storedSearchTerm;
    setSearchDraft(storedSearchTerm);
  }, [storedSearchTerm]);

  useEffect(() => {
    if (searchDraft === syncedSearchRef.current) return;

    const timer = window.setTimeout(() => {
      syncedSearchRef.current = searchDraft;
      setNodes((current) => current.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, searchTerm: searchDraft } }
          : node
      ));
      window.dispatchEvent(new CustomEvent('pipeline:changed'));
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchDraft, id, setNodes]);

  const normalizedSearch = storedSearchTerm.trim().toLowerCase();
  const filteredCollections = useMemo<GeoJsonFeatureCollectionArray>(() => {
    const collections = previewCollections ?? [];
    if (!normalizedSearch) return collections;

    return collections
      .map((collection) => ({
        ...collection,
        features: collection.features.filter((feature) => matchesSearch(feature, normalizedSearch)),
      }))
      .filter((collection) => collection.features.length > 0);
  }, [previewCollections, normalizedSearch]);

  const togglePreview = () => {
    setNodes((current) => current.map((node) =>
      node.id === id
        ? { ...node, data: { ...node.data, showPreview: !showPreview } }
        : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  };

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
          <>
            <NewChip label={file.name} fontSize={16} icon={<FileJson size={16} />} sx={{ height: 38 }} />
            <Tooltip title={showPreview ? t('pipelineGeoJsonHidePreview') : t('pipelineGeoJsonShowPreview')}>
              <IconButton
                size="small"
                aria-label={showPreview ? t('pipelineGeoJsonHidePreview') : t('pipelineGeoJsonShowPreview')}
                onClick={togglePreview}
              >
                {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
              </IconButton>
            </Tooltip>
          </>
        )}
        {error && (
          <Typography variant="caption" color="error" sx={{ width: '100%' }}>
            {error}
          </Typography>
        )}
      </Box>

      {showPreview && previewCollections && (
        <Box sx={{ pt: 1 }}>
          <TextField
            className="nodrag nopan nowheel"
            type="search"
            size="small"
            fullWidth
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            label={t('pipelineGeoJsonSearchLabel')}
            placeholder={t('pipelineGeoJsonSearchPlaceholder')}
            sx={{ mb: 1 }}
          />
          <GeoJsonCollectionList
            collections={filteredCollections}
            emptyMessage={normalizedSearch && previewCollections.length > 0
              ? t('pipelineGeoJsonSearchNoMatches')
              : t('pipelineGeoJsonPreviewEmpty')}
          />
        </Box>
      )}

      <OutputHandle id="geojson" position={Position.Top} />
    </NodeWrapper>
  );
}

export default GeoJsonInputNode;
