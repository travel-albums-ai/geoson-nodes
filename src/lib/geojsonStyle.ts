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
  fillBase: string;
  stroke: string;
  strokeSource: GeoJsonColorSource;
  strokeKey: string;
  strokeBase: string;
  strokeWidth: number;
  opacity: number;
};

// A generated color is this share of the base color mixed with the string-to-color
// color; the rest comes from string-to-color.
export const GEOJSON_GENERATED_BASE_SHARE = 0.8;

export const GEOJSON_STROKE_WIDTH = { min: 0, max: 10, step: 0.5, default: 3 } as const;

export const DEFAULT_GEOJSON_STYLE: GeoJsonStyleSettings = {
  fill: '#d32f2f',
  fillSource: 'palette',
  fillKey: '',
  fillBase: '#d32f2f',
  stroke: '#d32f2f',
  strokeSource: 'palette',
  strokeKey: '',
  strokeBase: '#d32f2f',
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

export const GEOJSON_STYLE_PROPERTY_NAMES: ReadonlySet<string> = new Set(Object.values(GEOJSON_STYLE_PROPERTY));

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
    fillBase: toColor(source.fillBase) ?? DEFAULT_GEOJSON_STYLE.fillBase,
    stroke: toColor(source.stroke) ?? DEFAULT_GEOJSON_STYLE.stroke,
    strokeSource: toColorSource(source.strokeSource),
    strokeKey: toPropertyKey(source.strokeKey),
    strokeBase: toColor(source.strokeBase) ?? DEFAULT_GEOJSON_STYLE.strokeBase,
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

type ColorHex = [number, number, number];

const parseHex = (value: string): ColorHex | undefined => {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return undefined;

  const digits = match[1].length === 3 ? [...match[1]].map((digit) => digit + digit).join('') : match[1];
  return [0, 2, 4].map((offset) => parseInt(digits.slice(offset, offset + 2), 16)) as ColorHex;
};

// Mixes two hex colors channel by channel. The base color gets GEOJSON_GENERATED_BASE_SHARE
// of the result. If either color is not a hex color, the base color is returned unchanged.
export function mixColors(base: string, generated: string): string {
  const baseRgb = parseHex(base);
  const generatedRgb = parseHex(generated);
  if (!baseRgb || !generatedRgb) return base;

  const hex = baseRgb.map((channel, index) => {
    const mixed = Math.round(channel * GEOJSON_GENERATED_BASE_SHARE + generatedRgb[index] * (1 - GEOJSON_GENERATED_BASE_SHARE));
    return mixed.toString(16).padStart(2, '0');
  });

  return `#${hex.join('')}`;
}

// Picks the color for one feature. With palette, the palette color is used. With generated,
// the base color is mixed with a string-to-color color from the chosen property's value;
// a feature without that property gets the base color.
export function resolveFeatureColor(
  properties: Record<string, unknown> | null | undefined,
  choice: { source: GeoJsonColorSource; key: string; paletteColor: string; baseColor: string },
): string {
  if (choice.source !== 'generated') return choice.paletteColor;
  if (choice.key === '') return choice.baseColor;

  const value = properties?.[choice.key];
  if (value === undefined || value === null) return choice.baseColor;

  return mixColors(choice.baseColor, stc(typeof value === 'object' ? JSON.stringify(value) : String(value)));
}

function styleFeature(feature: GeoJsonFeature, style: GeoJsonStyleSettings): GeoJsonFeature {
  return {
    ...feature,
    properties: {
      ...feature.properties,
      [GEOJSON_STYLE_PROPERTY.fill]: resolveFeatureColor(feature.properties, {
        source: style.fillSource, key: style.fillKey, paletteColor: style.fill, baseColor: style.fillBase,
      }),
      [GEOJSON_STYLE_PROPERTY.fillOpacity]: style.opacity,
      [GEOJSON_STYLE_PROPERTY.stroke]: resolveFeatureColor(feature.properties, {
        source: style.strokeSource, key: style.strokeKey, paletteColor: style.stroke, baseColor: style.strokeBase,
      }),
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
