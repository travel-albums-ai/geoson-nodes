import NewChip from '@/components/NewChip';
import GeoJsonMap from '@/pipeline/components/GeoJsonMap';
import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import type { GeoJsonFeatureCollectionArray } from '@/types/types';
import { Box, Chip } from '@mui/material';
import { Position, type Node, type NodeProps } from '@xyflow/react';
import { LogIn } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

function GpsMapNode({ id, data }: NodeProps<Node<{ geojson?: GeoJsonFeatureCollectionArray; skip?: boolean }>>) {
  const { t } = useTranslation();
  const hasCollections = (data.geojson ?? []).length > 0;
  const features = useMemo(
    () => (data.geojson ?? []).flatMap((collection) => collection.features),
    [data.geojson]
  );
  const propertyKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const feature of features) {
      Object.keys(feature.properties ?? {}).forEach((key) => keys.add(key));
    }
    return [...keys].sort();
  }, [features]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const markerKeys = useMemo(
    () => propertyKeys.filter((key) => selectedKeys.includes(key)),
    [propertyKeys, selectedKeys]
  );
  const drawStartedAtRef = useRef<number | null>(null);

  const toggleKey = useCallback((key: string) => {
    setSelectedKeys((previous) =>
      previous.includes(key) ? previous.filter((item) => item !== key) : [...previous, key]
    );
  }, []);

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
      <NodeWrapper type="gps-map" defaultSize={{ width: 528 }}
        inputCounts={<>
          <NewChip count={features.length} label="" fontSize={12} icon={<LogIn />} sx={{ height: 30 }} />
        </>}
        tools={<>
          <PipelineStageTiming nodeId={id} nodeType={'gps-map'} />
        </>}>
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, gap: 1 }}>
          {propertyKeys.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: '100px', overflow: 'auto' }}>
              {propertyKeys.map((key) => {
                const selected = selectedKeys.includes(key);
                return (
                  <Chip
                    key={key}
                    label={key}
                    size="small"
                    color={selected ? 'primary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                    onClick={() => toggleKey(key)}
                  />
                );
              })}
            </Box>
          )}
          {data.skip !== true && (
            <GeoJsonMap
              features={features}
              emptyMessage={hasCollections ? t('pipelineGeoJsonNoFeatures') : t('pipelineGpsMapConnectGeoJson')}
              onLoaded={handleMapLoaded}
              markerKeys={markerKeys}
            />
          )}
        </Box>
      </NodeWrapper>
    </>
  );
}

export default GpsMapNode;
