import GeoJsonFeaturePreview from '@/pipeline/components/GeoJsonFeaturePreview';
import type { GeoJsonFeature, GeoJsonFeatureCollectionArray } from '@/types/types';
import { Box, Tooltip, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';

const MAX_LIST_HEIGHT = 400;

type CollectionType = GeoJsonFeatureCollectionArray[number];

type ListRow =
  | { type: 'header'; key: string; collection: CollectionType }
  | { type: 'feature'; key: string; feature: GeoJsonFeature; isLastInCollection: boolean };

function CollectionHeader({ collection }: { collection: CollectionType }) {
  const { t } = useTranslation();
  return (
    <Box sx={{ pt: 0, pb: 0 }}>
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
}

function FeatureRow({ feature, isLastInCollection }: { feature: GeoJsonFeature; isLastInCollection: boolean }) {
  const { t } = useTranslation();
  const name = feature.properties?.name || feature.properties?.name_en;
  const geometryType = feature.geometry?.type;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minWidth: 0,
        pt: 0.5,
        pb: isLastInCollection ? 1 : 0,
        borderBottom: isLastInCollection ? '1px dotted' : 'none',
        borderColor: 'divider',
      }}
    >
      <GeoJsonFeaturePreview feature={feature} />
      <Tooltip title={`${Object.keys(feature.properties ?? {}).length ?? 0} - ${JSON.stringify(feature.properties ?? {})}`} arrow>
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
      </Tooltip>
    </Box>
  );
}

type GeoJsonCollectionListProps = {
  collections: GeoJsonFeatureCollectionArray | null;
  emptyMessage: string;
};

export default function GeoJsonCollectionList({ collections, emptyMessage }: GeoJsonCollectionListProps) {
  const [totalHeight, setTotalHeight] = useState(MAX_LIST_HEIGHT);

  const sortedCollections = useMemo(
    () => [...(collections ?? [])].sort((a, b) => (a.city || '').localeCompare(b.city || '')),
    [collections],
  );
  const rows = useMemo<ListRow[]>(
    () =>
      sortedCollections.flatMap((collection, collectionIndex) => [
        { type: 'header' as const, key: `header-${collectionIndex}`, collection },
        ...collection.features.map((feature, featureIndex) => ({
          type: 'feature' as const,
          key: `feature-${collectionIndex}-${featureIndex}`,
          feature,
          isLastInCollection: featureIndex === collection.features.length - 1,
        })),
      ]),
    [sortedCollections],
  );

  return (
    <Box className="nowheel" sx={{ width: '100%' }}>
      {sortedCollections.length > 0 ? (
        <Virtuoso
          style={{ height: Math.min(totalHeight, MAX_LIST_HEIGHT), minHeight: 100 }}
          totalListHeightChanged={setTotalHeight}
          data={rows}
          defaultItemHeight={44}
          computeItemKey={(_, row) => row.key}
          itemContent={(_, row) =>
            row.type === 'header' ? (
              <CollectionHeader collection={row.collection} />
            ) : (
              <FeatureRow feature={row.feature} isLastInCollection={row.isLastInCollection} />
            )
          }
        />
      ) : (
        <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
          {emptyMessage}
        </Typography>
      )}
    </Box>
  );
}
