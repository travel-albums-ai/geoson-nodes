import type {
  GeoJsonFeature,
  GeoJsonFeatureCollectionArray,
} from '@/types/types';
import jsonata from 'jsonata';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFeature = (value: unknown): value is GeoJsonFeature =>
  isObject(value) && value.type === 'Feature';

const isFeatureCollection = (value: unknown): boolean =>
  isObject(value) && value.type === 'FeatureCollection' && Array.isArray(value.features);

function toError(error: unknown): Error {
  if (error instanceof Error) return error;

  if (isObject(error) && typeof error.message === 'string') {
    return new Error(error.message);
  }

  return new Error(String(error));
}

// Bare features are wrapped into one collection so downstream nodes keep receiving collections.
function toFeatureCollections(result: unknown): GeoJsonFeatureCollectionArray {
  if (result === undefined || result === null) return [];

  const items: unknown[] = Array.isArray(result) ? result : [result];

  if (items.every(isFeatureCollection)) {
    return items as GeoJsonFeatureCollectionArray;
  }

  if (items.every(isFeature)) {
    return [{ type: 'FeatureCollection', features: items as GeoJsonFeature[] }];
  }

  throw new Error('The query must return FeatureCollections or Features');
}

// An empty query passes the collections through unchanged. Otherwise the
// query runs against the whole list, so paths like features[...] span every collection.
export async function runGeoJsonQuery(
  collections: GeoJsonFeatureCollectionArray,
  query: string,
): Promise<GeoJsonFeatureCollectionArray> {
  const expression = query.trim();

  if (expression === '') return collections;

  let result: unknown;

  try {
    result = await jsonata(expression).evaluate(collections);
  } catch (error) {
    // JSONata throws plain objects with a message rather than Error instances.
    throw toError(error);
  }

  return toFeatureCollections(result);
}
