import NewChip from '@/components/NewChip';
import GeoJsonMap from '@/pipeline/components/GeoJsonMap';
import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import type { GeoJsonFeatureCollectionArray } from '@/types/types';
import { Box } from '@mui/material';
import { Position, type Node, type NodeProps } from '@xyflow/react';
import { Hash } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

function GpsMapNode({ id, data }: NodeProps<Node<{ geojson?: GeoJsonFeatureCollectionArray; skip?: boolean }>>) {
  const { t } = useTranslation();
  const hasCollections = (data.geojson ?? []).length > 0;
  const features = useMemo(
    () => (data.geojson ?? []).flatMap((collection) => collection.features),
    [data.geojson]
  );
  const drawStartedAtRef = useRef<number | null>(null);

  // The worker's timing for this node only covers a passthrough, so the time is
  // measured here: from stage start until the map has drawn and loaded its tiles.
  useEffect(() => {
    const handleStarted = (event: Event) => {
      const { nodeId } = (event as CustomEvent<{ nodeId: string }>).detail;

      if (nodeId === id) drawStartedAtRef.current = performance.now();
    };

    window.addEventListener('gps-map:stageStarted', handleStarted);
    return () => window.removeEventListener('gps-map:stageStarted', handleStarted);
  }, [id]);

  const handleMapLoaded = useCallback(() => {
    const startedAt = drawStartedAtRef.current;
    if (startedAt === null) return;

    drawStartedAtRef.current = null;
    window.dispatchEvent(new CustomEvent('gps-map:stageTiming', {
      detail: { nodeId: id, durationMs: performance.now() - startedAt },
    }));
  }, [id]);

  return (
    <>
      <InputHandle id="geojson" position={Position.Top} />
      <NodeWrapper type="gps-map" defaultSize={{ width: 528 }} tools={<>
        <PipelineStageTiming nodeId={id} nodeType={'gps-map'} />
      </>}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <NewChip count={''} label={t('pipelineGpsMarkers', { count: features.length })} fontSize={16} icon={<Hash />} sx={{ height: 38 }} />
        </Box>
        {data.skip !== true && (
          <GeoJsonMap
            features={features}
            emptyMessage={hasCollections ? t('pipelineGeoJsonNoFeatures') : t('pipelineGpsMapConnectGeoJson')}
            onLoaded={handleMapLoaded}
          />
        )}
      </NodeWrapper>
    </>
  );
}

export default GpsMapNode;
