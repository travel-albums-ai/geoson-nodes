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

// Property names found on the features of either input, sorted for display.
export function listSetPropertyKeys(
  first: GeoJsonFeatureCollectionArray,
  second: GeoJsonFeatureCollectionArray,
): string[] {
  const keys = new Set<string>();

  for (const collection of [...first, ...second]) {
    for (const feature of collection.features) {
      for (const key of Object.keys(feature.properties ?? {})) {
        keys.add(key);
      }
    }
  }

  return [...keys].sort((left, right) => left.localeCompare(right));
}

// Without a match key, features match on their full content. With one, they match on that property's
// value, and a feature that lacks the property falls back to full-content matching.
const identityOf = (feature: GeoJsonFeature, matchKey: string | undefined): string => {
  if (matchKey === undefined) return featureKey(feature);

  const { properties } = feature;

  if (properties === null || !Object.hasOwn(properties, matchKey)) {
    return `content:${featureKey(feature)}`;
  }

  return `value:${JSON.stringify(properties[matchKey])}`;
};

// Each feature is serialized once; key sets and the output are both derived from these keys.
const keyCollections = (
  collections: GeoJsonFeatureCollectionArray,
  matchKey: string | undefined,
): KeyedCollection[] =>
  collections.map((collection) => ({
    collection,
    features: collection.features.map((feature) => ({ feature, key: identityOf(feature, matchKey) })),
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

// Features are the set elements; two features are equal when their identity matches (see identityOf).
// Results list the first operand's collections before the second's, each keeping its own metadata.
export function applyGeoJsonSetOperation(
  operation: GeoJsonSetOperation,
  first: GeoJsonFeatureCollectionArray,
  second: GeoJsonFeatureCollectionArray,
  matchKey?: string,
): GeoJsonFeatureCollectionArray {
  switch (operation) {
    case 'union':
      return collectDistinct([
        { collections: keyCollections(first, matchKey), keep: () => true },
        { collections: keyCollections(second, matchKey), keep: () => true },
      ]);
    case 'intersection': {
      const secondKeys = keySet(keyCollections(second, matchKey));

      return collectDistinct([
        { collections: keyCollections(first, matchKey), keep: (key) => secondKeys.has(key) },
      ]);
    }
    case 'difference': {
      const secondKeys = keySet(keyCollections(second, matchKey));

      return collectDistinct([
        { collections: keyCollections(first, matchKey), keep: (key) => !secondKeys.has(key) },
      ]);
    }
    case 'symmetricDifference': {
      const firstKeyed = keyCollections(first, matchKey);
      const secondKeyed = keyCollections(second, matchKey);
      const firstKeys = keySet(firstKeyed);
      const secondKeys = keySet(secondKeyed);

      return collectDistinct([
        { collections: firstKeyed, keep: (key) => !secondKeys.has(key) },
        { collections: secondKeyed, keep: (key) => !firstKeys.has(key) },
      ]);
    }
  }
}
