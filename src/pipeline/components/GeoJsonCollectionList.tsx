import NewChip from '@/components/NewChip';
import GeoJsonFeaturePreview from '@/pipeline/components/GeoJsonFeaturePreview';
import type { GeoJsonFeature, GeoJsonFeatureCollectionArray } from '@/types/types';
import { Box, Button, Tooltip, Typography } from '@mui/material';
import { forwardRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { VirtuosoGrid, type GridComponents } from 'react-virtuoso';

const CARD_HEIGHT = 240;
const CARD_MIN_WIDTH = 280;

type FeatureEntry = { key: string; feature: GeoJsonFeature };

const GridList: GridComponents['List'] = forwardRef(function GridList({ style, ...props }, ref) {
  return (
    <Box
      {...props}
      ref={ref}
      style={style}
      sx={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_MIN_WIDTH}px, 1fr))`, gap: 1 }}
    />
  );
});

const gridComponents = { List: GridList };

const excludedProperties = ['name', 'name_en', 'title', 'SQLDATE', 'EventCode', 'EventRootCode', 'GLOBALEVENTID', 'Actor1Name', 'Actor2Name', 'QuadClass', "GoldsteinScale", 'AvgTone', 'ActionGeo_CountryCode', 'Actor1CountryCode', 'website', 'Actor2CountryCode', 'DATEADDED', "SOURCEURL", "ActionGeo_FullName"];

const urlProperties = ['SOURCEURL', 'url', 'website', 'link', 'source', 'source_url', 'sourceUrl', 'url_source', 'urlSource', 'url_source_url', 'url_sourceUrl', 'url_source_url_source', 'url_source_urlSource'];

const parseProperties = ['SOURCEURL']

function FeatureRow({ feature }: { feature: GeoJsonFeature }) {
  const { t } = useTranslation();
  const name = feature.properties?.name || feature.properties?.name_en || feature.properties?.title;
  const geometryType = feature.geometry?.type;
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        minWidth: 0,
        height: CARD_HEIGHT,
        p: 1,
        overflow: 'hidden',
        border: '1px dotted',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        <GeoJsonFeaturePreview feature={feature} />

        <Box sx={{ minWidth: 0, flex: 1 }}>
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
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
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
              <textarea key={key} readOnly value={parsedValue} style={{ fontFamily: 'inherit', width: '100%', resize: 'none', height: '100px', border: '0', outline: 'none' }} />
            );
          })}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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
  const entries = useMemo<FeatureEntry[]>(
    () =>
      [...(collections ?? [])]
        .sort((a, b) => (a.city || '').localeCompare(b.city || ''))
        .flatMap((collection, collectionIndex) =>
          collection.features.map((feature, featureIndex) => ({
            key: `feature-${collectionIndex}-${featureIndex}`,
            feature,
          })),
        ),
    [collections],
  );

  return (
    <Box className="nowheel" sx={{ width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {entries.length > 0 ? (
        <VirtuosoGrid
          style={{ height: '100%', minHeight: 100 }}
          data={entries}
          computeItemKey={(_, entry) => entry.key}
          components={gridComponents}
          itemContent={(_, entry) => <FeatureRow feature={entry.feature} />}
        />
      ) : (
        <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
          {emptyMessage}
        </Typography>
      )}
    </Box>
  );
}
