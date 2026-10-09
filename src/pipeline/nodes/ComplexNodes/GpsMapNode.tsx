import GeoJsonMap from '@/pipeline/components/GeoJsonMap';
import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import type { GeoJsonFeatureCollectionArray } from '@/types/types';
import { Typography } from '@mui/material';
import { Position, type Node, type NodeProps } from '@xyflow/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

function GpsMapNode({ data }: NodeProps<Node<{ geojson?: GeoJsonFeatureCollectionArray }>>) {
  const { t } = useTranslation();
  const hasCollections = (data.geojson ?? []).length > 0;
  const features = useMemo(
    () => (data.geojson ?? []).flatMap((collection) => collection.features),
    [data.geojson]
  );

  return (
    <>
      <InputHandle id="geojson" position={Position.Top} />
      <NodeWrapper type="gps-map">
        <Typography variant="body2" color="text.secondary" sx={{ pb: 1 }}>
          {t('pipelineGpsMarkers', { count: features.length })}
        </Typography>
        <GeoJsonMap
          features={features}
          emptyMessage={hasCollections ? t('pipelineGeoJsonNoFeatures') : t('pipelineGpsMapConnectGeoJson')}
        />
      </NodeWrapper>
    </>
  );
}

export default GpsMapNode;
