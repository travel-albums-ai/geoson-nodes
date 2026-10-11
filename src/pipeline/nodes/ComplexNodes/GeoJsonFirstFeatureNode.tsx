import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import type { GeoJsonFeature, GeoJsonFeatureCollectionArray } from '@/types/types';
import { Box, Typography } from '@mui/material';
import { Position, type Node, type NodeProps } from '@xyflow/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

function GeoJsonFirstFeatureNode({ id, data }: NodeProps<Node<{ geojson?: GeoJsonFeatureCollectionArray }>>) {
  const { t } = useTranslation();
  const firstFeature = useMemo<GeoJsonFeature | undefined>(
    () => data.geojson?.find((collection) => collection.features.length > 0)?.features[0],
    [data.geojson],
  );

  return (
    <>
      <InputHandle id="geojson" position={Position.Top} />
      <NodeWrapper type="geojson-first-feature" defaultSize={{ width: 400 }} tools={<PipelineStageTiming nodeId={id} nodeType={'geojson-first-feature'} />}>
        {firstFeature ? (<>
          <Box
            component="textarea"
            className="nodrag nopan nowheel"
            readOnly
            value={JSON.stringify(firstFeature.properties ?? {}, null, 4)}
            sx={{ display: 'block', width: '100%', height: 100, resize: 'none', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: 12 }}
          />
          <iframe src={firstFeature?.properties?.SOURCEURL || 'http://'} style={{ width: '100%', height: '100%', border: 'none' }} />
        </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t('pipelineGeoJsonFirstFeatureEmpty')}
          </Typography>
        )}
      </NodeWrapper>
    </>
  );
}

export default GeoJsonFirstFeatureNode;
