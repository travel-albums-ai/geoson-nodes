import type { GeoJsonFeature, GeoJsonFeatureCollectionArray } from '@/types/types';
import stc from 'string-to-color';

// Where a feature's color comes from: the palette color picked by the user,
// or a color generated from one of the feature's property values.
export type GeoJsonColorSource = 'palette' | 'generated';

// Visual style set by the GeoJSON style node. Opacity is a fraction from 0 to 1
// and applies to both the fill and the stroke. Stroke width is in pixels.
export type GeoJsonStyleSettings = {
  fill: string;
  fillSource: GeoJsonColorSource;
  fillKey: string;
  stroke: string;
  strokeSource: GeoJsonColorSource;
  strokeKey: string;
  strokeWidth: number;
  opacity: number;
};

export const GEOJSON_STROKE_WIDTH = { min: 0, max: 10, step: 0.5, default: 3 } as const;

export const DEFAULT_GEOJSON_STYLE: GeoJsonStyleSettings = {
  fill: '#d32f2f',
  fillSource: 'palette',
  fillKey: '',
  stroke: '#d32f2f',
  strokeSource: 'palette',
  strokeKey: '',
  strokeWidth: GEOJSON_STROKE_WIDTH.default,
  opacity: 1,
};

// Property names written onto each feature, following the simplestyle spec.
export const GEOJSON_STYLE_PROPERTY = {
  fill: 'fill',
  fillOpacity: 'fill-opacity',
  stroke: 'stroke',
  strokeOpacity: 'stroke-opacity',
  strokeWidth: 'stroke-width',
} as const;

const GEOJSON_STYLE_PROPERTY_NAMES: ReadonlySet<string> = new Set(Object.values(GEOJSON_STYLE_PROPERTY));

// Style read back from a feature's properties. A key is missing when the
// property is absent or invalid, so renderers can fall back to their defaults.
export type FeatureStyle = {
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeOpacity?: number;
  strokeWidth?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toColor = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const toOpacity = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : undefined;

const toStrokeWidth = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(GEOJSON_STROKE_WIDTH.max, Math.max(GEOJSON_STROKE_WIDTH.min, value))
    : undefined;

const toColorSource = (value: unknown): GeoJsonColorSource =>
  value === 'generated' ? 'generated' : 'palette';

const toPropertyKey = (value: unknown): string =>
  typeof value === 'string' ? value : '';

// Accepts whatever the node data holds and returns complete, valid settings.
export function readGeoJsonStyleSettings(value: unknown): GeoJsonStyleSettings {
  const source = isRecord(value) ? value : {};

  return {
    fill: toColor(source.fill) ?? DEFAULT_GEOJSON_STYLE.fill,
    fillSource: toColorSource(source.fillSource),
    fillKey: toPropertyKey(source.fillKey),
    stroke: toColor(source.stroke) ?? DEFAULT_GEOJSON_STYLE.stroke,
    strokeSource: toColorSource(source.strokeSource),
    strokeKey: toPropertyKey(source.strokeKey),
    strokeWidth: toStrokeWidth(source.strokeWidth) ?? DEFAULT_GEOJSON_STYLE.strokeWidth,
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
    strokeWidth: toStrokeWidth(properties[GEOJSON_STYLE_PROPERTY.strokeWidth]),
  };
}

// Returns the sorted property names found on the features, leaving out the
// style properties this module writes, so a style can be chained onto another.
export function listFeaturePropertyKeys(collections: GeoJsonFeatureCollectionArray): string[] {
  const keys = new Set<string>();

  for (const collection of collections) {
    for (const feature of collection.features) {
      for (const key of Object.keys(feature.properties ?? {})) {
        if (!GEOJSON_STYLE_PROPERTY_NAMES.has(key)) keys.add(key);
      }
    }
  }

  return [...keys].sort();
}

// Picks the color for one feature: a color generated from the value of the chosen
// property, or the palette color when generation is off or the feature lacks the property.
export function resolveFeatureColor(
  properties: Record<string, unknown> | null | undefined,
  source: GeoJsonColorSource,
  key: string,
  paletteColor: string,
): string {
  if (source !== 'generated' || key === '') return paletteColor;

  const value = properties?.[key];
  if (value === undefined || value === null) return paletteColor;

  return stc(typeof value === 'object' ? JSON.stringify(value) : String(value));
}

function styleFeature(feature: GeoJsonFeature, style: GeoJsonStyleSettings): GeoJsonFeature {
  return {
    ...feature,
    properties: {
      ...feature.properties,
      [GEOJSON_STYLE_PROPERTY.fill]: resolveFeatureColor(feature.properties, style.fillSource, style.fillKey, style.fill),
      [GEOJSON_STYLE_PROPERTY.fillOpacity]: style.opacity,
      [GEOJSON_STYLE_PROPERTY.stroke]: resolveFeatureColor(feature.properties, style.strokeSource, style.strokeKey, style.stroke),
      [GEOJSON_STYLE_PROPERTY.strokeOpacity]: style.opacity,
      [GEOJSON_STYLE_PROPERTY.strokeWidth]: style.strokeWidth,
    },
  };
}

// Returns new collections with the style written onto every feature. The inputs are not modified.
export function applyGeoJsonStyle(
  collections: GeoJsonFeatureCollectionArray,
  style: GeoJsonStyleSettings,
): GeoJsonFeatureCollectionArray {
  return collections.map((collection) => ({
    ...collection,
    features: collection.features.map((feature) => styleFeature(feature, style)),
  }));
}
