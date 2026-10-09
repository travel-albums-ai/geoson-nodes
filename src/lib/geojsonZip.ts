import type { GeoJsonFeature, GeoJsonFeatureCollectionArray } from '@/types/types';

type KeyValue = string | number;

const isKeyValue = (value: unknown): value is KeyValue =>
  typeof value === 'string' || typeof value === 'number';

const featuresOf = (collections: GeoJsonFeatureCollectionArray): GeoJsonFeature[] =>
  collections.flatMap((collection) => collection.features);

// Only text and number properties are offered as match keys.
const matchableKeysOf = (collections: GeoJsonFeatureCollectionArray): Set<string> => {
  const keys = new Set<string>();

  for (const feature of featuresOf(collections)) {
    for (const [key, value] of Object.entries(feature.properties ?? {})) {
      if (isKeyValue(value)) keys.add(key);
    }
  }

  return keys;
};

// Property names that both inputs carry as text or numbers, sorted for display.
export function commonPropertyKeys(
  primary: GeoJsonFeatureCollectionArray,
  secondary: GeoJsonFeatureCollectionArray,
): string[] {
  const secondaryKeys = matchableKeysOf(secondary);

  return [...matchableKeysOf(primary)]
    .filter((key) => secondaryKeys.has(key))
    .sort((left, right) => left.localeCompare(right));
}

// Every feature of `primary` is kept with its geometry. Each one is matched to the first feature in
// `secondary` with the same `key` value, and that feature's properties fill in the ones it lacks.
// Values already on the primary feature win. Secondary features without a match are dropped.
export function zipGeoJsonByKey(
  primary: GeoJsonFeatureCollectionArray,
  secondary: GeoJsonFeatureCollectionArray,
  key: string,
): GeoJsonFeatureCollectionArray {
  const secondaryByValue = new Map<string, Record<string, unknown>>();

  for (const feature of featuresOf(secondary)) {
    const value = feature.properties?.[key];

    if (!isKeyValue(value) || secondaryByValue.has(String(value))) continue;

    secondaryByValue.set(String(value), feature.properties ?? {});
  }

  return primary.map((collection) => ({
    ...collection,
    features: collection.features.map((feature) => {
      const value = feature.properties?.[key];

      if (!isKeyValue(value)) return feature;

      const match = secondaryByValue.get(String(value));

      if (!match) return feature;

      return { ...feature, properties: { ...match, ...feature.properties } };
    }),
  }));
}
