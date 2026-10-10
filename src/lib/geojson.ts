import type {
  GeoBounds,
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  GeoJsonFeatureCollectionArray,
} from '@/types/types';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export const WORLD_GEO_BOUNDS: GeoBounds = { west: -180, east: 180, south: -90, north: 90 };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Missing or invalid values fall back to the whole world; swapped edges are sorted.
export function normalizeGeoBounds(value: unknown): GeoBounds {
  const source = isObject(value) ? value : {};
  const readEdge = (key: keyof GeoBounds, min: number, max: number): number => {
    const edge = source[key];
    return typeof edge === 'number' && Number.isFinite(edge)
      ? clamp(edge, min, max)
      : WORLD_GEO_BOUNDS[key];
  };

  const westEdge = readEdge('west', -180, 180);
  const eastEdge = readEdge('east', -180, 180);
  const southEdge = readEdge('south', -90, 90);
  const northEdge = readEdge('north', -90, 90);

  return {
    west: Math.min(westEdge, eastEdge),
    east: Math.max(westEdge, eastEdge),
    south: Math.min(southEdge, northEdge),
    north: Math.max(southEdge, northEdge),
  };
}

const isPositionInBounds = (position: unknown[], bounds: GeoBounds): boolean => {
  const [longitude, latitude] = position;
  return typeof longitude === 'number'
    && typeof latitude === 'number'
    && longitude >= bounds.west
    && longitude <= bounds.east
    && latitude >= bounds.south
    && latitude <= bounds.north;
};

// Coordinate arrays nest to different depths per geometry type; a flat array of numbers is one position.
const hasPositionInBounds = (coordinates: unknown, bounds: GeoBounds): boolean => {
  if (!Array.isArray(coordinates)) return false;
  if (typeof coordinates[0] === 'number') return isPositionInBounds(coordinates, bounds);
  return coordinates.some((nested) => hasPositionInBounds(nested, bounds));
};

const geometryHasPositionInBounds = (geometry: unknown, bounds: GeoBounds): boolean => {
  if (!isObject(geometry)) return false;
  if (geometry.type === 'GeometryCollection') {
    return Array.isArray(geometry.geometries)
      && geometry.geometries.some((member) => geometryHasPositionInBounds(member, bounds));
  }
  return hasPositionInBounds(geometry.coordinates, bounds);
};

// A feature passes when any of its positions lies inside the bounds; features without geometry are dropped.
export function filterGeoJsonByBounds(
  collections: GeoJsonFeatureCollectionArray,
  bounds: GeoBounds,
): GeoJsonFeatureCollectionArray {
  return collections.map((collection) => ({
    ...collection,
    features: collection.features.filter((feature) => geometryHasPositionInBounds(feature.geometry, bounds)),
  }));
}

export function countGeoJsonFeatures(collections: GeoJsonFeatureCollectionArray): number {
  return collections.reduce((total, collection) => total + collection.features.length, 0);
}

// Features are counted across all collections in order. The result holds one collection with just that feature.
export function pickGeoJsonFeature(
  collections: GeoJsonFeatureCollectionArray,
  index: number,
): GeoJsonFeatureCollectionArray {
  if (!Number.isInteger(index) || index < 0) {
    return [];
  }

  let remaining = index;

  for (const collection of collections) {
    if (remaining < collection.features.length) {
      return [{ ...collection, features: [collection.features[remaining]] }];
    }

    remaining -= collection.features.length;
  }

  return [];
}

// Accepts either a single FeatureCollection or an array of them.
export function parseGeoJsonFeatureCollections(text: string): GeoJsonFeatureCollectionArray {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON');
  }

  const entries: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

  return entries.map((entry, index): GeoJsonFeatureCollection => {
    if (!isObject(entry) || entry.type !== 'FeatureCollection' || !Array.isArray(entry.features)) {
      throw new Error(`Entry ${index} is not a FeatureCollection with a features array`);
    }

    entry.features.forEach((feature: unknown, featureIndex: number) => {
      if (!isObject(feature) || feature.type !== 'Feature') {
        throw new Error(`Entry ${index} has a non-Feature item at features[${featureIndex}]`);
      }
    });

    return {
      type: 'FeatureCollection',
      city: optionalString(entry.city),
      source: optionalString(entry.source),
      url: optionalString(entry.url),
      features: entry.features as GeoJsonFeature[],
    };
  });
}
