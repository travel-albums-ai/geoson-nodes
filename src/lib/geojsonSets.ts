import type {
  GeoJsonFeature,
  GeoJsonFeatureCollectionArray,
} from '@/types/types';

export type GeoJsonSetOperation = 'union' | 'intersection' | 'difference' | 'symmetricDifference';

type SetSource = {
  collections: GeoJsonFeatureCollectionArray;
  keep: (key: string) => boolean;
};

const compareKeys = ([left]: [string, unknown], [right]: [string, unknown]) =>
  (left < right ? -1 : left > right ? 1 : 0);

// Object keys are sorted so that features with the same content always produce the same key.
const featureKey = (feature: GeoJsonFeature): string =>
  JSON.stringify(feature, (_key, value: unknown) =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(compareKeys))
      : value);

const featureKeys = (collections: GeoJsonFeatureCollectionArray): Set<string> =>
  new Set(collections.flatMap((collection) => collection.features.map(featureKey)));

// Walks the sources in order and keeps each distinct feature that passes its source's predicate.
// Collections keep their metadata and are dropped when no feature from them survives.
function collectDistinct(sources: SetSource[]): GeoJsonFeatureCollectionArray {
  const seen = new Set<string>();
  const result: GeoJsonFeatureCollectionArray = [];

  for (const { collections, keep } of sources) {
    for (const collection of collections) {
      const features: GeoJsonFeature[] = [];

      for (const feature of collection.features) {
        const key = featureKey(feature);

        if (!seen.has(key) && keep(key)) {
          seen.add(key);
          features.push(feature);
        }
      }

      if (features.length > 0) {
        result.push({ ...collection, features });
      }
    }
  }

  return result;
}

// Features are the set elements; two features are equal when their full content matches.
// Results list the first operand's collections before the second's, each keeping its own metadata.
export function applyGeoJsonSetOperation(
  operation: GeoJsonSetOperation,
  first: GeoJsonFeatureCollectionArray,
  second: GeoJsonFeatureCollectionArray,
): GeoJsonFeatureCollectionArray {
  const firstKeys = featureKeys(first);
  const secondKeys = featureKeys(second);

  switch (operation) {
    case 'union':
      return collectDistinct([
        { collections: first, keep: () => true },
        { collections: second, keep: () => true },
      ]);
    case 'intersection':
      return collectDistinct([
        { collections: first, keep: (key) => secondKeys.has(key) },
      ]);
    case 'difference':
      return collectDistinct([
        { collections: first, keep: (key) => !secondKeys.has(key) },
      ]);
    case 'symmetricDifference':
      return collectDistinct([
        { collections: first, keep: (key) => !secondKeys.has(key) },
        { collections: second, keep: (key) => !firstKeys.has(key) },
      ]);
  }
}
