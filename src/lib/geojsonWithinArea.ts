import bbox from '@turf/bbox';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import type { BBox, MultiPolygon, Polygon } from 'geojson';
import type {
  GeoJsonFeatureCollectionArray,
} from '@/types/types';

type AreaGeometry = Polygon | MultiPolygon;
type AreaPolygon = { geometry: AreaGeometry; box: BBox };
type Position = [number, number];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPosition = (value: unknown[]): value is Position =>
  typeof value[0] === 'number' && typeof value[1] === 'number';

// Coordinate arrays nest to different depths per geometry type; a flat array of numbers is one position.
const allPositionsInside = (coordinates: unknown, isInside: (position: Position) => boolean): boolean => {
  if (!Array.isArray(coordinates) || coordinates.length === 0) return false;
  if (typeof coordinates[0] === 'number') return isPosition(coordinates) && isInside(coordinates);
  return coordinates.every((nested) => allPositionsInside(nested, isInside));
};

const geometryInside = (geometry: unknown, isInside: (position: Position) => boolean): boolean => {
  if (!isObject(geometry)) return false;
  if (geometry.type === 'GeometryCollection') {
    return Array.isArray(geometry.geometries)
      && geometry.geometries.length > 0
      && geometry.geometries.every((member) => geometryInside(member, isInside));
  }
  return allPositionsInside(geometry.coordinates, isInside);
};

const collectAreaPolygons = (geometry: unknown, polygons: AreaPolygon[]): void => {
  if (!isObject(geometry)) return;

  if (geometry.type === 'GeometryCollection' && Array.isArray(geometry.geometries)) {
    geometry.geometries.forEach((member) => collectAreaPolygons(member, polygons));
    return;
  }

  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return;

  const areaGeometry = geometry as unknown as AreaGeometry;
  polygons.push({ geometry: areaGeometry, box: bbox(areaGeometry) });
};

const isInsideAnyPolygon = (position: Position, polygons: AreaPolygon[]): boolean =>
  polygons.some(({ geometry, box }) =>
    position[0] >= box[0]
    && position[0] <= box[2]
    && position[1] >= box[1]
    && position[1] <= box[3]
    && booleanPointInPolygon(position, geometry));

// Keeps the features of `features` that lie inside the combined area of every polygon in `area`.
// A feature is inside only when all of its positions are inside, so points are tested directly and
// lines or polygons must lie entirely within the area. In "outside" mode the complement is kept,
// so features that are partly inside are kept too. Metadata is kept and empty collections are dropped.
export function filterGeoJsonWithinArea(
  area: GeoJsonFeatureCollectionArray,
  features: GeoJsonFeatureCollectionArray,
  outside = false,
): GeoJsonFeatureCollectionArray {
  const polygons: AreaPolygon[] = [];
  area.forEach((collection) =>
    collection.features.forEach((feature) => collectAreaPolygons(feature.geometry, polygons)));

  if (polygons.length === 0 && !outside) {
    return [];
  }

  const isInside = (position: Position) => isInsideAnyPolygon(position, polygons);
  const result: GeoJsonFeatureCollectionArray = [];

  for (const collection of features) {
    const kept = collection.features.filter((feature) =>
      geometryInside(feature.geometry, isInside) !== outside);

    if (kept.length > 0) {
      result.push({ ...collection, features: kept });
    }
  }

  return result;
}
