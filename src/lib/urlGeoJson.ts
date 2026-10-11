import { parseGeoJsonFeatureCollections } from '@/lib/geojson';
import type { GeoJsonFeatureCollectionArray } from '@/types/types';

export const URL_GEOJSON_EXAMPLE_URLS = {
  eonet: 'https://eonet.gsfc.nasa.gov/api/v3/events/geojson?days=30&status=all',
  usgsHour: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
  usgsSignificantWeek: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson',
  usgsMagnitude45Day: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson',
  gdeltTimespan15: 'https://api.gdeltproject.org/api/v1/gkg_geojson?TIMESPAN=15',
  geoMap: 'https://axx2igptegogljsl.public.blob.vercel-storage.com/custom.geo.json',
  airport: 'https://axx2igptegogljsl.public.blob.vercel-storage.com/airports.geojson',
  unesco: 'https://axx2igptegogljsl.public.blob.vercel-storage.com/whc001.geojson',
  passportIndex: 'https://axx2igptegogljsl.public.blob.vercel-storage.com/passport-index-formatted.geojson',
  vaccines: 'https://axx2igptegogljsl.public.blob.vercel-storage.com/vaccines-processed.geojson'
} as const;

const GDELT_ERROR_PREFIX = 'ERROR:';

// Returns the normalized URL when the input is an absolute http(s) URL, otherwise null.
export function parseHttpUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

// GDELT reports failures as one placeholder feature instead of an HTTP error.
function gdeltErrorMessage(url: URL, collections: GeoJsonFeatureCollectionArray): string | null {
  if (!url.hostname.endsWith('gdeltproject.org')) return null;

  const features = collections.flatMap((collection) => collection.features);
  if (features.length !== 1) return null;

  const name = features[0].properties?.name;
  return typeof name === 'string' && name.startsWith(GDELT_ERROR_PREFIX) ? name : null;
}

export async function fetchUrlGeoJson(href: string): Promise<GeoJsonFeatureCollectionArray> {
  const url = new URL(href);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with HTTP ${response.status}`);
  }

  const collections = parseGeoJsonFeatureCollections(await response.text());

  const errorMessage = gdeltErrorMessage(url, collections);
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return collections.map((collection) => ({ ...collection, source: url.hostname, url: url.href }));
}
