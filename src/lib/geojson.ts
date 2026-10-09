import type {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  GeoJsonFeatureCollectionArray,
} from '@/types/types';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

// Accepts either a single FeatureCollection or an array of them.
export function parseGeoJsonFeatureCollections(text: string): GeoJsonFeatureCollectionArray {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON');
  }

  const entries: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

  return entries.map((entry, index): GeoJsonFeatureCollection => {
    if (!isObject(entry) || entry.type !== 'FeatureCollection' || !Array.isArray(entry.features)) {
      throw new Error(`Entry ${index} is not a FeatureCollection with a features array`);
    }

    entry.features.forEach((feature: unknown, featureIndex: number) => {
      if (!isObject(feature) || feature.type !== 'Feature') {
        throw new Error(`Entry ${index} has a non-Feature item at features[${featureIndex}]`);
      }
    });

    return {
      type: 'FeatureCollection',
      city: optionalString(entry.city),
      source: optionalString(entry.source),
      url: optionalString(entry.url),
      features: entry.features as GeoJsonFeature[],
    };
  });
}
