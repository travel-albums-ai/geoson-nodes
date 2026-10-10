import type {
  GeoJsonFeature,
  GeoJsonFeatureCollectionArray,
} from '@/types/types';
import { featureKey } from '@/lib/geojsonSets';
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

// Compiled expressions are reused across runs. Bounded so many distinct
// queries cannot grow the cache without limit.
const COMPILED_QUERY_LIMIT = 64;
const compiledQueries = new Map<string, ReturnType<typeof jsonata>>();

// Compile errors throw before anything is cached, so a bad query is retried each time.
function compileQuery(expression: string): ReturnType<typeof jsonata> {
  const cached = compiledQueries.get(expression);
  if (cached) return cached;

  const compiled = jsonata(expression);

  if (compiledQueries.size >= COMPILED_QUERY_LIMIT) {
    const oldest = compiledQueries.keys().next();
    if (!oldest.done) compiledQueries.delete(oldest.value);
  }

  compiledQueries.set(expression, compiled);
  return compiled;
}

// Keeps the input features that the query did not select. Features match by content, as in the set
// operations, so a copy of a selected feature also counts as selected.
function leftOutFeatures(
  collections: GeoJsonFeatureCollectionArray,
  selected: GeoJsonFeatureCollectionArray,
): GeoJsonFeatureCollectionArray {
  const selectedKeys = new Set(selected.flatMap((collection) => collection.features.map(featureKey)));
  const result: GeoJsonFeatureCollectionArray = [];

  for (const collection of collections) {
    const features = collection.features.filter((feature) => !selectedKeys.has(featureKey(feature)));

    if (features.length > 0) {
      result.push({ ...collection, features });
    }
  }

  return result;
}

// An empty query selects everything. Otherwise the query runs against the whole
// list, so paths like features[...] span every collection. With negate on, the
// result is the input features the query left out, in place of the query result.
export async function runGeoJsonQuery(
  collections: GeoJsonFeatureCollectionArray,
  query: string,
  negate = false,
): Promise<GeoJsonFeatureCollectionArray> {
  const expression = query.trim();

  if (expression === '') {
    return negate ? [] : collections;
  }

  let result: unknown;

  try {
    result = await compileQuery(expression).evaluate(collections);
  } catch (error) {
    // JSONata throws plain objects with a message rather than Error instances.
    throw toError(error);
  }

  const selected = toFeatureCollections(result);

  return negate ? leftOutFeatures(collections, selected) : selected;
}
