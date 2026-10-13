import { parseNumeric } from '@/lib/geojsonHeatmap';
import type { GeoJsonFeatureCollectionArray } from '@/types/types';

// One value per feature across all collections, in order. Features without a numeric value give null, which leaves a gap in the chart.
export function collectNumericValues(collections: GeoJsonFeatureCollectionArray, key: string): Array<number | null> {
  const values: Array<number | null> = [];

  for (const collection of collections) {
    for (const feature of collection.features) {
      values.push(parseNumeric(feature.properties?.[key]) ?? null);
    }
  }

  return values;
}
