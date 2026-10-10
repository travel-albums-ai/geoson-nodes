import NewChip from '@/components/NewChip';
import GeoJsonMap from '@/pipeline/components/GeoJsonMap';
import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import type { GeoJsonFeatureCollectionArray } from '@/types/types';
import { Box } from '@mui/material';
import { Position, type Node, type NodeProps } from '@xyflow/react';
import { Hash } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

function GpsMapNode({ id, data }: NodeProps<Node<{ geojson?: GeoJsonFeatureCollectionArray; skip?: boolean }>>) {
  const { t } = useTranslation();
  const hasCollections = (data.geojson ?? []).length > 0;
  const features = useMemo(
    () => (data.geojson ?? []).flatMap((collection) => collection.features),
    [data.geojson]
  );

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
          />
        )}
      </NodeWrapper>
    </>
  );
}

export default GpsMapNode;
