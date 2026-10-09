import GeoJsonFeaturePreview from '@/pipeline/components/GeoJsonFeaturePreview';
import type { GeoJsonFeatureCollectionArray } from '@/types/types';
import { Box, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GroupedVirtuoso } from 'react-virtuoso';

const MAX_LIST_HEIGHT = 400;

type GeoJsonCollectionListProps = {
  collections: GeoJsonFeatureCollectionArray | null;
  emptyMessage: string;
};

export default function GeoJsonCollectionList({ collections, emptyMessage }: GeoJsonCollectionListProps) {
  const { t } = useTranslation();
  const [totalHeight, setTotalHeight] = useState(MAX_LIST_HEIGHT);

  const sortedCollections = useMemo(
    () => [...(collections ?? [])].sort((a, b) => (a.city || '').localeCompare(b.city || '')),
    [collections],
  );
  const groupCounts = useMemo(() => sortedCollections.map((collection) => collection.features.length), [sortedCollections]);
  const features = useMemo(() => sortedCollections.flatMap((collection) => collection.features), [sortedCollections]);
  const groupEnds = useMemo(() => {
    const ends: number[] = [];
    let total = 0;
    for (const count of groupCounts) {
      total += count;
      ends.push(total);
    }
    return ends;
  }, [groupCounts]);

  return (
    <Box className="nowheel" sx={{ width: '480px' }}>
      {sortedCollections.length > 0 ? (
        <GroupedVirtuoso
          style={{ height: Math.min(totalHeight, MAX_LIST_HEIGHT) }}
          totalListHeightChanged={setTotalHeight}
          groupCounts={groupCounts}
          groupContent={(groupIndex) => {
            const collection = sortedCollections[groupIndex];
            return (
              <Box sx={{ pt: 1, pb: 1.5 }}>
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
            );
          }}
          itemContent={(index, groupIndex) => {
            const feature = features[index];
            const name = feature.properties?.name || feature.properties?.name_en;
            const geometryType = feature.geometry?.type;
            const isLastInGroup = index + 1 === groupEnds[groupIndex];
            return (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  minWidth: 0,
                  pt: 0.5,
                  pb: isLastInGroup ? 1 : 0,
                  borderBottom: isLastInGroup ? '1px dotted' : 'none',
                  borderColor: 'divider',
                }}
              >
                <GeoJsonFeaturePreview feature={feature} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" component="div" noWrap>
                    {typeof name === 'string' && name.length > 0 ? name : t('pipelineGeoJsonUnnamedFeature')}
                  </Typography>
                  {typeof geometryType === 'string' && (
                    <Typography variant="caption" color="textSecondary" component="div" noWrap>
                      {geometryType}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          }}
        />
      ) : (
        <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
          {emptyMessage}
        </Typography>
      )}
    </Box>
  );
}
