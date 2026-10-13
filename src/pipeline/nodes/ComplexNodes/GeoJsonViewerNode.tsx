import NewChip from '@/components/NewChip';
import GeoJsonCollectionList from '@/pipeline/components/GeoJsonCollectionList';
import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import type { GeoJsonFeatureCollectionArray } from '@/types/types';
import { Box } from '@mui/material';
import { Position, type Node, type NodeProps } from '@xyflow/react';
import { LogIn } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

function GeoJsonViewerNode({ id, data }: NodeProps<Node<{ geojson?: GeoJsonFeatureCollectionArray, skip?: boolean }>>) {
  const { t } = useTranslation();
  const collections = data.geojson ?? null;
  const features = useMemo(
    () => (collections ?? []).flatMap((collection) => collection.features),
    [collections]
  );

  return (
    <>
      <InputHandle id="geojson" position={Position.Top} />
      <NodeWrapper
        type="geojson-viewer"
        defaultSize={{ width: 508, height: 520 }}
        inputCounts={
          <NewChip
            count={features.length}
            label={''}
            icon={<LogIn size={16} />}
            tooltip={t('pipelineGeoJsonViewerEntering')}
            fontSize={12}
          />
        }
        tools={<PipelineStageTiming nodeId={id} nodeType={'geojson-viewer'} />}
      >
        <Box sx={{ pt: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {data.skip !== true && (<GeoJsonCollectionList collections={collections} emptyMessage={t('pipelineGeoJsonViewerEmpty')} />)}
        </Box>
      </NodeWrapper>
    </>
  );
}

export default GeoJsonViewerNode;
