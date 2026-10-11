import { parseGeoJsonFeatureCollections } from '@/lib/geojson';
import type { GeoJsonFeatureCollectionArray } from '@/types/types';

const GDELT_GKG_GEOJSON_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events/geojson?days=30&status=all';
export const GDELT_TIMESPAN_MINUTES = 15;

const GDELT_ERROR_PREFIX = 'ERROR:';

// GDELT reports failures as one placeholder feature instead of an HTTP error.
function gdeltErrorMessage(collections: GeoJsonFeatureCollectionArray): string | null {
  const features = collections.flatMap((collection) => collection.features);
  if (features.length !== 1) return null;

  const name = features[0].properties?.name;
  return typeof name === 'string' && name.startsWith(GDELT_ERROR_PREFIX) ? name : null;
}

export async function fetchGdeltGkgGeoJson(): Promise<GeoJsonFeatureCollectionArray> {
  const url = `${GDELT_GKG_GEOJSON_URL}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GDELT request failed with HTTP ${response.status}`);
  }

  const collections = parseGeoJsonFeatureCollections(await response.text());

  const errorMessage = gdeltErrorMessage(collections);
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return collections.map((collection) => ({ ...collection, source: 'GDELT GKG', url }));
}
