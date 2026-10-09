import NewChip from '@/components/NewChip';
import GeoJsonCollectionList from '@/pipeline/components/GeoJsonCollectionList';
import GeoJsonMap from '@/pipeline/components/GeoJsonMap';
import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import type { GeoJsonFeatureCollectionArray } from '@/types/types';
import { Box } from '@mui/material';
import { Position, type Node, type NodeProps } from '@xyflow/react';
import { Layers, MapPin } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

function GeoJsonViewerNode({ data }: NodeProps<Node<{ geojson?: GeoJsonFeatureCollectionArray }>>) {
  const { t } = useTranslation();
  const collections = data.geojson ?? null;
  const features = useMemo(
    () => (collections ?? []).flatMap((collection) => collection.features),
    [collections]
  );

  return (
    <>
      <InputHandle id="geojson" position={Position.Top} />
      <NodeWrapper type="geojson-viewer">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pb: 1 }}>
          <NewChip count={collections?.length ?? 0} label={t('pipelineGeoJsonCollections')} fontSize={16} icon={<Layers size={16} />} sx={{ height: 38 }} />
          <NewChip count={features.length} label={t('pipelineGeoJsonFeatures')} fontSize={16} icon={<MapPin size={16} />} sx={{ height: 38 }} />
        </Box>
        <GeoJsonMap
          features={features}
          emptyMessage={(collections?.length ?? 0) > 0 ? t('pipelineGeoJsonNoFeatures') : t('pipelineGpsMapConnectGeoJson')}
        />
        <Box sx={{ pt: 1 }}>
          <GeoJsonCollectionList collections={collections} emptyMessage={t('pipelineGeoJsonViewerEmpty')} />
        </Box>
      </NodeWrapper>
    </>
  );
}

export default GeoJsonViewerNode;
