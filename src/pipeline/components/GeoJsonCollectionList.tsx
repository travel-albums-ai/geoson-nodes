import NewChip from '@/components/NewChip';
import GeoJsonFeaturePreview from '@/pipeline/components/GeoJsonFeaturePreview';
import type { GeoJsonFeature, GeoJsonFeatureCollectionArray } from '@/types/types';
import { Box, Button, Tooltip, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';

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

const excludedProperties = ['name', 'name_en', 'title', 'SQLDATE', 'EventCode', 'EventRootCode', 'GLOBALEVENTID', 'Actor1Name', 'Actor2Name', 'QuadClass', "GoldsteinScale", 'AvgTone', 'ActionGeo_CountryCode', 'Actor1CountryCode', 'website', 'Actor2CountryCode', 'DATEADDED', "SOURCEURL", "ActionGeo_FullName"];

const urlProperties = ['SOURCEURL', 'url', 'website', 'link', 'source', 'source_url', 'sourceUrl', 'url_source', 'urlSource', 'url_source_url', 'url_sourceUrl', 'url_source_url_source', 'url_source_urlSource'];

const parseProperties = ['SOURCEURL']

function FeatureRow({ feature, isLastInCollection }: { feature: GeoJsonFeature; isLastInCollection: boolean }) {
  const { t } = useTranslation();
  const name = feature.properties?.name || feature.properties?.name_en || feature.properties?.title;
  const geometryType = feature.geometry?.type;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        minWidth: 0,
        pt: 0.5,
        pb: 1,
        borderBottom: '1px dotted',
        borderColor: 'divider',
      }}
    >
      <GeoJsonFeaturePreview feature={feature} />

      <Box sx={{ minWidth: 0 }}>
        <Tooltip title={`${Object.keys(feature.properties ?? {}).length ?? 0} - ${JSON.stringify(feature.properties ?? {})}`} arrow>
          <Typography variant="caption" component="div" noWrap>
            {typeof name === 'string' && name.length > 0 ? name : t('pipelineGeoJsonUnnamedFeature')}
          </Typography>
        </Tooltip>
        {typeof geometryType === 'string' && (
          <Typography variant="caption" color="textSecondary" component="div" noWrap>
            {geometryType}
          </Typography>
        )}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pb: 1 }}>
          {Object.entries(feature.properties ?? {})
            .filter(([key]) => parseProperties.includes(key))
            .map(([key, value]) => {
              const parsedValue = String(value || '')
                .replace("http://", "")
                .replace("https://", "")
                .replaceAll('"', ' ')
                .replaceAll('-', ' ')
                .replaceAll('www.', '')
                .replaceAll('.html', '')
                .split('/')
                .join(' ');

              return (
                <textarea readOnly value={parsedValue} style={{ width: '400px', resize: 'none', height: '100px', border: '0', outline: 'none' }} />
              );
            })}
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pb: 1, maxHeight: '100px', overflow: 'auto' }}>
          {Object.entries(feature.properties ?? {})
            .filter(([key]) => urlProperties.includes(key))
            .map(([key, value]) => (
              <Button key={key} href={String(value)} target="_blank" rel="noopener noreferrer" size="small" variant="outlined">
                {String(value).substring(0, 25)+'...'}
              </Button>
            ))}
          {Object.entries(feature.properties ?? {})
            .filter(([key]) => !excludedProperties.includes(key))
            .map(([key, value]) => (
              <NewChip key={key} label={String(key)} count={value || 0} />
            ))}

        </Box>

        {/* <textarea readOnly value={JSON.stringify(feature.properties ?? {}, null, 4)} style={{ width: '400px', resize: 'none', height: '300px' }} /> */}
      </Box>
    </Box>
  );
}

type GeoJsonCollectionListProps = {
  collections: GeoJsonFeatureCollectionArray | null;
  emptyMessage: string;
};

export default function GeoJsonCollectionList({ collections, emptyMessage }: GeoJsonCollectionListProps) {
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
    <Box className="nowheel" sx={{ width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {sortedCollections.length > 0 ? (
        <Virtuoso
          style={{ height: '100%', minHeight: 100 }}
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
