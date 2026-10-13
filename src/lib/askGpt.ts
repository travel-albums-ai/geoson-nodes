import type { GeoJsonFeatureCollectionArray } from '@/types/types';

export function listPropertyKeys(collections: GeoJsonFeatureCollectionArray): string[] {
  const keys = new Set<string>();

  for (const collection of collections) {
    for (const feature of collection.features) {
      for (const key of Object.keys(feature.properties ?? {})) {
        keys.add(key);
      }
    }
  }

  return [...keys].sort();
}

export function serializeSelectedProperties(
  collections: GeoJsonFeatureCollectionArray,
  keys: string[],
): Array<Record<string, unknown>> {
  return collections
    .flatMap((collection) => collection.features)
    .map((feature) => {
      const properties = feature.properties ?? {};
      const picked: Record<string, unknown> = {};

      for (const key of keys) {
        if (key in properties) picked[key] = properties[key];
      }

      return picked;
    });
}

export function buildAskGptPrompt(collections: GeoJsonFeatureCollectionArray, keys: string[]): string {
  const objects = serializeSelectedProperties(collections, keys);

  return [
    `Below is a JSON array with one object per GeoJSON feature (${objects.length} in total), containing only the properties ${keys.join(', ')}.`,
    '',
    '```json',
    JSON.stringify(objects),
    '```',
  ].join('\n');
}
