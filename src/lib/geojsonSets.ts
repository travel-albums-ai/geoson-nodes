import type {
  GeoJsonFeature,
  GeoJsonFeatureCollectionArray,
} from '@/types/types';

export type GeoJsonSetOperation = 'union' | 'intersection' | 'difference' | 'symmetricDifference';

type KeyedFeature = { feature: GeoJsonFeature; key: string };
type KeyedCollection = {
  collection: GeoJsonFeatureCollectionArray[number];
  features: KeyedFeature[];
};
type SetSource = {
  collections: KeyedCollection[];
  keep: (key: string) => boolean;
};

const compareKeys = ([left]: [string, unknown], [right]: [string, unknown]) =>
  (left < right ? -1 : left > right ? 1 : 0);

// Object keys are sorted so that features with the same content always produce the same key.
export const featureKey = (feature: GeoJsonFeature): string =>
  JSON.stringify(feature, (_key, value: unknown) =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(compareKeys))
      : value);

// Each feature is serialized once; key sets and the output are both derived from these keys.
const keyCollections = (collections: GeoJsonFeatureCollectionArray): KeyedCollection[] =>
  collections.map((collection) => ({
    collection,
    features: collection.features.map((feature) => ({ feature, key: featureKey(feature) })),
  }));

const keySet = (keyed: KeyedCollection[]): Set<string> =>
  new Set(keyed.flatMap((collection) => collection.features.map(({ key }) => key)));

// Walks the sources in order and keeps each distinct feature that passes its source's predicate.
// Collections keep their metadata and are dropped when no feature from them survives.
function collectDistinct(sources: SetSource[]): GeoJsonFeatureCollectionArray {
  const seen = new Set<string>();
  const result: GeoJsonFeatureCollectionArray = [];

  for (const { collections, keep } of sources) {
    for (const { collection, features: keyed } of collections) {
      const features: GeoJsonFeature[] = [];

      for (const { feature, key } of keyed) {
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
  switch (operation) {
    case 'union':
      return collectDistinct([
        { collections: keyCollections(first), keep: () => true },
        { collections: keyCollections(second), keep: () => true },
      ]);
    case 'intersection': {
      const secondKeys = keySet(keyCollections(second));

      return collectDistinct([
        { collections: keyCollections(first), keep: (key) => secondKeys.has(key) },
      ]);
    }
    case 'difference': {
      const secondKeys = keySet(keyCollections(second));

      return collectDistinct([
        { collections: keyCollections(first), keep: (key) => !secondKeys.has(key) },
      ]);
    }
    case 'symmetricDifference': {
      const firstKeyed = keyCollections(first);
      const secondKeyed = keyCollections(second);
      const firstKeys = keySet(firstKeyed);
      const secondKeys = keySet(secondKeyed);

      return collectDistinct([
        { collections: firstKeyed, keep: (key) => !secondKeys.has(key) },
        { collections: secondKeyed, keep: (key) => !firstKeys.has(key) },
      ]);
    }
  }
}
