import type { GeoJsonFeatureCollectionArray } from '@/types/types';

// Visual style set by the GeoJSON style node. Opacity is a fraction from 0 to 1
// and applies to both the fill and the stroke.
export type GeoJsonStyleSettings = {
  fill: string;
  stroke: string;
  opacity: number;
};

export const DEFAULT_GEOJSON_STYLE: GeoJsonStyleSettings = {
  fill: '#d32f2f',
  stroke: '#d32f2f',
  opacity: 1,
};

// Property names written onto each feature, following the simplestyle spec.
export const GEOJSON_STYLE_PROPERTY = {
  fill: 'fill',
  fillOpacity: 'fill-opacity',
  stroke: 'stroke',
  strokeOpacity: 'stroke-opacity',
} as const;

// Style read back from a feature's properties. A key is missing when the
// property is absent or invalid, so renderers can fall back to their defaults.
export type FeatureStyle = {
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeOpacity?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toColor = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const toOpacity = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : undefined;

// Accepts whatever the node data holds and returns complete, valid settings.
export function readGeoJsonStyleSettings(value: unknown): GeoJsonStyleSettings {
  const source = isRecord(value) ? value : {};

  return {
    fill: toColor(source.fill) ?? DEFAULT_GEOJSON_STYLE.fill,
    stroke: toColor(source.stroke) ?? DEFAULT_GEOJSON_STYLE.stroke,
    opacity: toOpacity(source.opacity) ?? DEFAULT_GEOJSON_STYLE.opacity,
  };
}

// Reads the style properties of a feature, ignoring any that are invalid.
export function readFeatureStyle(properties: Record<string, unknown> | null | undefined): FeatureStyle {
  if (!properties) return {};

  return {
    fill: toColor(properties[GEOJSON_STYLE_PROPERTY.fill]),
    fillOpacity: toOpacity(properties[GEOJSON_STYLE_PROPERTY.fillOpacity]),
    stroke: toColor(properties[GEOJSON_STYLE_PROPERTY.stroke]),
    strokeOpacity: toOpacity(properties[GEOJSON_STYLE_PROPERTY.strokeOpacity]),
  };
}

// Returns new collections with the style written onto every feature. The inputs are not modified.
export function applyGeoJsonStyle(
  collections: GeoJsonFeatureCollectionArray,
  style: GeoJsonStyleSettings,
): GeoJsonFeatureCollectionArray {
  return collections.map((collection) => ({
    ...collection,
    features: collection.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        [GEOJSON_STYLE_PROPERTY.fill]: style.fill,
        [GEOJSON_STYLE_PROPERTY.fillOpacity]: style.opacity,
        [GEOJSON_STYLE_PROPERTY.stroke]: style.stroke,
        [GEOJSON_STYLE_PROPERTY.strokeOpacity]: style.opacity,
      },
    })),
  }));
}
