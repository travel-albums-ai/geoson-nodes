import { GEOJSON_STYLE_PROPERTY, GEOJSON_STYLE_PROPERTY_NAMES } from '@/lib/geojsonStyle';
import type { GeoJsonFeature, GeoJsonFeatureCollectionArray } from '@/types/types';
import { isobands } from '@turf/isobands';
import type { Feature, FeatureCollection, GeoJsonProperties, Point, Position } from 'geojson';

export type GeoJsonHeatmapSettings = {
  granularity: number;
  complexity: number;
  smoothing: number;
  // Property whose numeric value sets each feature's intensity; empty when every feature weighs the same.
  intensityKey: string;
};

export const HEATMAP_GRANULARITY = { min: 1, max: 10, step: 1, default: 4 } as const;
export const HEATMAP_COMPLEXITY = { min: 1, max: 10, step: 1, default: 5 } as const;
export const HEATMAP_SMOOTHING = { min: 1, max: 10, step: 1, default: 5 } as const;

const GRID_CELLS_PER_GRANULARITY = 24;
const MIN_SPAN_DEGREES = 0.5;
// Bandwidth is a share of the data span per smoothing step, so granularity changes the resolution, not the overall look.
const BANDWIDTH_SHARE_PER_SMOOTHING_STEP = 0.02;
const PADDING_IN_BANDWIDTHS = 3;
const LOWEST_LEVEL = 0.05;
// Slightly above 1 so the densest cells fall inside the top band.
const TOP_BREAK = 1.000001;
const DENSITY_PROPERTY = 'density';
const COLOR_RAMP = ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c'];
const FILL_OPACITY = { min: 0.25, max: 0.75 } as const;

type Sample = { lon: number; lat: number; weight: number };

type DensityGrid = {
  values: Float64Array;
  cols: number;
  rows: number;
  x0: number;
  y0: number;
  cell: number;
  cosLat: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isMissing = (value: unknown): boolean =>
  value === null || value === undefined || (typeof value === 'string' && value.trim() === '');

// Numbers, and strings holding a number, count as numeric.
const parseNumeric = (value: unknown): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const toRange = (value: unknown, range: { min: number; max: number; default: number }): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(range.max, Math.max(range.min, Math.round(value)))
    : range.default;

export function readGeoJsonHeatmapSettings(value: unknown): GeoJsonHeatmapSettings {
  const source = isRecord(value) ? value : {};

  return {
    granularity: toRange(source.granularity, HEATMAP_GRANULARITY),
    complexity: toRange(source.complexity, HEATMAP_COMPLEXITY),
    smoothing: toRange(source.smoothing, HEATMAP_SMOOTHING),
    intensityKey: typeof source.intensityKey === 'string' ? source.intensityKey : '',
  };
}

// A key is listed only when every value it holds across the collections is numeric. Missing values are ignored.
export function listNumericPropertyKeys(collections: GeoJsonFeatureCollectionArray): string[] {
  const numeric = new Set<string>();
  const notNumeric = new Set<string>();

  for (const collection of collections) {
    for (const feature of collection.features) {
      for (const [key, value] of Object.entries(feature.properties ?? {})) {
        if (GEOJSON_STYLE_PROPERTY_NAMES.has(key) || isMissing(value)) continue;
        if (parseNumeric(value) === undefined) notNumeric.add(key);
        else numeric.add(key);
      }
    }
  }

  return [...numeric].filter((key) => !notNumeric.has(key)).sort();
}

// Visits every coordinate pair in a geometry, however deeply its coordinates are nested.
function collectPositions(value: unknown, out: Position[]): void {
  if (!Array.isArray(value)) return;
  if (typeof value[0] === 'number') {
    out.push(value as Position);
    return;
  }
  for (const item of value) collectPositions(item, out);
}

function collectGeometryPositions(geometry: Record<string, unknown> | null, out: Position[]): void {
  if (!geometry) return;
  if (geometry.type === 'GeometryCollection' && Array.isArray(geometry.geometries)) {
    for (const child of geometry.geometries) {
      if (isRecord(child)) collectGeometryPositions(child, out);
    }
    return;
  }
  collectPositions(geometry.coordinates, out);
}

// A feature weighs one unit, or its intensity value when a numeric key is chosen. Features without a usable value weigh nothing.
function featureWeight(feature: GeoJsonFeature, intensityKey: string | null): number {
  if (intensityKey === null) return 1;
  const value = parseNumeric(feature.properties?.[intensityKey]);
  return value === undefined ? 0 : Math.max(0, value);
}

// A feature's weight is shared across its vertices.
function collectSamples(collections: GeoJsonFeatureCollectionArray, intensityKey: string | null): Sample[] {
  const samples: Sample[] = [];

  for (const collection of collections) {
    for (const feature of collection.features) {
      const weight = featureWeight(feature, intensityKey);
      if (weight <= 0) continue;

      const positions: Position[] = [];
      collectGeometryPositions(feature.geometry, positions);
      const valid = positions.filter((position) => Number.isFinite(position[0]) && Number.isFinite(position[1]));
      if (valid.length === 0) continue;

      const share = weight / valid.length;
      for (const [lon, lat] of valid) samples.push({ lon, lat, weight: share });
    }
  }

  return samples;
}

// Splats samples onto a grid with bilinear weights, then blurs them with a separable Gaussian.
// Coordinates are scaled by cos(latitude) so cells are roughly square on the ground.
function buildDensityGrid(samples: Sample[], granularity: number, smoothing: number): DensityGrid {
  const meanLat = samples.reduce((sum, sample) => sum + sample.lat, 0) / samples.length;
  const cosLat = Math.cos((meanLat * Math.PI) / 180);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const sample of samples) {
    const x = sample.lon * cosLat;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, sample.lat);
    maxY = Math.max(maxY, sample.lat);
  }

  const span = Math.max(maxX - minX, maxY - minY, MIN_SPAN_DEGREES);
  const bandwidth = span * BANDWIDTH_SHARE_PER_SMOOTHING_STEP * smoothing;
  const padding = bandwidth * PADDING_IN_BANDWIDTHS;
  const x0 = minX - padding;
  const y0 = minY - padding;
  const longest = Math.max(maxX - minX, maxY - minY) + 2 * padding;
  const cell = longest / (GRID_CELLS_PER_GRANULARITY * granularity - 1);
  const cols = Math.ceil((maxX - minX + 2 * padding) / cell) + 1;
  const rows = Math.ceil((maxY - minY + 2 * padding) / cell) + 1;

  const splatted = new Float64Array(cols * rows);
  for (const sample of samples) {
    const gx = (sample.lon * cosLat - x0) / cell;
    const gy = (sample.lat - y0) / cell;
    const ix = Math.min(Math.floor(gx), cols - 2);
    const iy = Math.min(Math.floor(gy), rows - 2);
    const fx = gx - ix;
    const fy = gy - iy;
    const base = iy * cols + ix;
    splatted[base] += sample.weight * (1 - fx) * (1 - fy);
    splatted[base + 1] += sample.weight * fx * (1 - fy);
    splatted[base + cols] += sample.weight * (1 - fx) * fy;
    splatted[base + cols + 1] += sample.weight * fx * fy;
  }

  const values = gaussianBlur(splatted, cols, rows, bandwidth / cell);

  let max = 0;
  for (const value of values) max = Math.max(max, value);
  for (let i = 0; i < values.length; i++) values[i] /= max;

  return { values, cols, rows, x0, y0, cell, cosLat };
}

function gaussianBlur(source: Float64Array, cols: number, rows: number, sigma: number): Float64Array {
  const radius = Math.max(1, Math.ceil(3 * sigma));
  const kernel = new Float64Array(2 * radius + 1);
  let kernelSum = 0;
  for (let k = -radius; k <= radius; k++) {
    const weight = Math.exp(-(k * k) / (2 * sigma * sigma));
    kernel[k + radius] = weight;
    kernelSum += weight;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= kernelSum;

  const horizontal = new Float64Array(source.length);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const kStart = Math.max(-radius, -col);
      const kEnd = Math.min(radius, cols - 1 - col);
      let acc = 0;
      for (let k = kStart; k <= kEnd; k++) acc += source[row * cols + col + k] * kernel[k + radius];
      horizontal[row * cols + col] = acc;
    }
  }

  const blurred = new Float64Array(source.length);
  for (let row = 0; row < rows; row++) {
    const kStart = Math.max(-radius, -row);
    const kEnd = Math.min(radius, rows - 1 - row);
    for (let col = 0; col < cols; col++) {
      let acc = 0;
      for (let k = kStart; k <= kEnd; k++) acc += horizontal[(row + k) * cols + col] * kernel[k + radius];
      blurred[row * cols + col] = acc;
    }
  }

  return blurred;
}

// Each grid cell becomes a point whose density is the z value that isobands contours.
function buildDensityPoints(grid: DensityGrid): FeatureCollection<Point> {
  const features: Feature<Point>[] = [];

  for (let row = 0; row < grid.rows; row++) {
    const lat = grid.y0 + row * grid.cell;
    for (let col = 0; col < grid.cols; col++) {
      features.push({
        type: 'Feature',
        properties: { [DENSITY_PROPERTY]: grid.values[row * grid.cols + col] },
        geometry: { type: 'Point', coordinates: [(grid.x0 + col * grid.cell) / grid.cosLat, lat] },
      });
    }
  }

  return { type: 'FeatureCollection', features };
}

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rampColor(t: number): string {
  const segments = COLOR_RAMP.length - 1;
  const position = Math.min(1, Math.max(0, t)) * segments;
  const index = Math.min(Math.floor(position), segments - 1);
  const fraction = position - index;
  const from = hexToRgb(COLOR_RAMP[index]);
  const to = hexToRgb(COLOR_RAMP[index + 1]);
  const channels = from.map((channel, i) => Math.round(channel + (to[i] - channel) * fraction));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function bandProperties(t: number): GeoJsonProperties {
  return {
    [GEOJSON_STYLE_PROPERTY.fill]: rampColor(t),
    [GEOJSON_STYLE_PROPERTY.fillOpacity]: FILL_OPACITY.min + (FILL_OPACITY.max - FILL_OPACITY.min) * t,
    [GEOJSON_STYLE_PROPERTY.stroke]: rampColor(t),
    [GEOJSON_STYLE_PROPERTY.strokeWidth]: 0,
  };
}

// Complexity sets how many color bands the density is split into, from two to twelve.
function buildBands(grid: DensityGrid, complexity: number): GeoJsonFeature[] {
  const bandCount = complexity + 2;
  const breaks = Array.from(
    { length: bandCount + 1 },
    (_, i) => LOWEST_LEVEL + ((1 - LOWEST_LEVEL) * i) / bandCount,
  );
  breaks[bandCount] = TOP_BREAK;

  const breaksProperties = Array.from({ length: bandCount }, (_, i) => bandProperties((i + 0.5) / bandCount));

  const contours = isobands(buildDensityPoints(grid), breaks, {
    zProperty: DENSITY_PROPERTY,
    breaksProperties,
  });

  return contours.features
    .filter((feature) => feature.geometry.coordinates.length > 0)
    .map((feature) => ({ type: 'Feature', geometry: { ...feature.geometry }, properties: feature.properties }));
}

export function buildGeoJsonHeatmap(
  collections: GeoJsonFeatureCollectionArray,
  settings: unknown,
): GeoJsonFeatureCollectionArray {
  const { granularity, complexity, smoothing, intensityKey } = readGeoJsonHeatmapSettings(settings);
  const activeIntensityKey = intensityKey !== '' && listNumericPropertyKeys(collections).includes(intensityKey)
    ? intensityKey
    : null;
  const samples = collectSamples(collections, activeIntensityKey);
  if (samples.length === 0) return [];

  const grid = buildDensityGrid(samples, granularity, smoothing);
  return [{ type: 'FeatureCollection', features: buildBands(grid, complexity) }];
}
