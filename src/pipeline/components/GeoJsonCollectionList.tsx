import type { GeoJsonFeatureCollectionArray } from '@/types/types';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

type GeoJsonCollectionListProps = {
  collections: GeoJsonFeatureCollectionArray | null;
  emptyMessage: string;
};

export default function GeoJsonCollectionList({ collections, emptyMessage }: GeoJsonCollectionListProps) {
  const { t } = useTranslation();

  return (
    <Box
      className="nowheel"
      sx={{
        maxHeight: '400px',
        width: '480px',
        overflow: 'auto',
      }}
    >
      {collections && collections.length > 0 ? (
        collections.map((collection, index) => (
          <Box key={index} sx={{ py: 1, borderBottom: '1px dotted', borderColor: 'divider' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {collection.city || t('pipelineGeoJsonUnknownCity')}
            </Typography>
            <Typography variant="caption" color="textSecondary" component="div">
              {collection.source}
            </Typography>
            <Typography variant="caption" color="textSecondary" component="div" sx={{ wordBreak: 'break-all' }}>
              {collection.url}
            </Typography>
            <Typography variant="caption" component="div">
              {t('pipelineGeoJsonFeatureCount', { count: collection.features.length })}
            </Typography>
          </Box>
        ))
      ) : (
        <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
          {emptyMessage}
        </Typography>
      )}
    </Box>
  );
}
