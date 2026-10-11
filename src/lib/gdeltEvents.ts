import { unzipSync } from 'fflate';
import type { GeoJsonFeature, GeoJsonFeatureCollectionArray } from '@/types/types';

const GDELT_EVENTS_BASE_URL = 'https://data.gdeltproject.org/events/';

// Daily event exports from https://data.gdeltproject.org/events/index.html, newest first.
// The 1979-2013 master archive is left out: at about 1.1 GB it is too large to download in a browser tab.
export const GDELT_EVENT_FILE_NAMES = [
  '20261010.export.CSV.zip',
  '20261009.export.CSV.zip',
  '20261008.export.CSV.zip',
  '20261007.export.CSV.zip',
  '20261006.export.CSV.zip',
  '20261005.export.CSV.zip',
  '20261004.export.CSV.zip',
  '20261003.export.CSV.zip',
  '20261002.export.CSV.zip',
  '20261001.export.CSV.zip',
  '20260930.export.CSV.zip',
  '20260929.export.CSV.zip',
  '20260928.export.CSV.zip',
  '20260927.export.CSV.zip',
  '20260926.export.CSV.zip',
  '20260925.export.CSV.zip',
  '20260924.export.CSV.zip',
  '20260923.export.CSV.zip',
  '20260922.export.CSV.zip',
] as const;

// The export files are tab-separated with no header row, despite their .CSV name.
const COLUMN_COUNT = 58;

// Column positions (zero-based) in the 58-column layout, with the GDELT codebook names used as property keys.
const PROPERTY_COLUMNS: ReadonlyArray<{ key: string; index: number; numeric?: boolean }> = [
  { key: 'GLOBALEVENTID', index: 0, numeric: true },
  { key: 'SQLDATE', index: 1, numeric: true },
  { key: 'Actor1Name', index: 6 },
  { key: 'Actor1CountryCode', index: 7 },
  { key: 'Actor2Name', index: 16 },
  { key: 'Actor2CountryCode', index: 17 },
  { key: 'EventCode', index: 26 },
  { key: 'EventRootCode', index: 28 },
  { key: 'QuadClass', index: 29, numeric: true },
  { key: 'GoldsteinScale', index: 30, numeric: true },
  { key: 'NumMentions', index: 31, numeric: true },
  { key: 'NumSources', index: 32, numeric: true },
  { key: 'NumArticles', index: 33, numeric: true },
  { key: 'AvgTone', index: 34, numeric: true },
  { key: 'ActionGeo_FullName', index: 50 },
  { key: 'ActionGeo_CountryCode', index: 51 },
  { key: 'DATEADDED', index: 56, numeric: true },
  { key: 'SOURCEURL', index: 57 },
];

const ACTION_GEO_FULL_NAME = 50;
const ACTION_GEO_LAT = 53;
const ACTION_GEO_LONG = 54;

function parseCoordinate(value: string, limit: number): number | null {
  if (value.trim() === '') return null;

  const coordinate = Number(value);
  return Number.isFinite(coordinate) && Math.abs(coordinate) <= limit ? coordinate : null;
}

// One point per event at its action location. Events without a usable location are skipped.
function parseGdeltEventsTsv(text: string): GeoJsonFeature[] {
  const features: GeoJsonFeature[] = [];

  for (const line of text.split(/\r?\n/)) {
    if (line === '') continue;

    const fields = line.split('\t');
    if (fields.length !== COLUMN_COUNT) continue;

    const latitude = parseCoordinate(fields[ACTION_GEO_LAT], 90);
    const longitude = parseCoordinate(fields[ACTION_GEO_LONG], 180);
    if (latitude === null || longitude === null) continue;

    const properties: Record<string, unknown> = {};

    for (const column of PROPERTY_COLUMNS) {
      const raw = fields[column.index];
      if (raw === '') continue;

      if (!column.numeric) {
        properties[column.key] = raw;
        continue;
      }

      const value = Number(raw);
      if (Number.isFinite(value)) properties[column.key] = value;
    }

    const locationName = fields[ACTION_GEO_FULL_NAME];
    if (locationName !== '') properties.name = locationName;

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [longitude, latitude] },
      properties,
    });
  }

  if (features.length === 0) {
    throw new Error('No events with a location were found in this GDELT file');
  }

  return features;
}

export async function fetchGdeltEventsGeoJson(fileName: string): Promise<GeoJsonFeatureCollectionArray> {
  const url = `${GDELT_EVENTS_BASE_URL}${fileName}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GDELT request failed with HTTP ${response.status}`);
  }

  const entries = unzipSync(new Uint8Array(await response.arrayBuffer()));
  const entryNames = Object.keys(entries);
  const entryName = entryNames.find((name) => name.toLowerCase().endsWith('.csv')) ?? entryNames[0];
  const content = entryName === undefined ? undefined : entries[entryName];

  if (!content) {
    throw new Error('The GDELT zip file contains no events file');
  }

  return [{
    type: 'FeatureCollection',
    source: 'GDELT Events',
    url,
    features: parseGdeltEventsTsv(new TextDecoder().decode(content)),
  }];
}
