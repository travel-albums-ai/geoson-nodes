import type { Airport, FlightEntry, GeoJsonFeature, GeoJsonFeatureCollectionArray } from '@/types/types';

type LonLat = [lon: number, lat: number];
type Vector = [x: number, y: number, z: number];

const KM_PER_SEGMENT = 50;
const MIN_SEGMENTS = 16;
const MAX_SEGMENTS = 256;
const EARTH_RADIUS_KM = 6371;
const EPSILON = 1e-9;

const toVector = ({ lat, lon }: Airport): Vector => {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  return [Math.cos(latRad) * Math.cos(lonRad), Math.cos(latRad) * Math.sin(lonRad), Math.sin(latRad)];
};

const toLonLat = ([x, y, z]: Vector): LonLat => [
  (Math.atan2(y, x) * 180) / Math.PI,
  (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI,
];

// Samples the shortest great-circle arc between two airports, which is the curved
// route a flight follows over the globe.
export function greatCirclePath(from: Airport, to: Airport): LonLat[] {
  const start = toVector(from);
  const end = toVector(to);
  const dot = Math.min(1, Math.max(-1, start[0] * end[0] + start[1] * end[1] + start[2] * end[2]));
  const angle = Math.acos(dot);
  const sinAngle = Math.sin(angle);

  // Identical or antipodal airports have no unique arc; a straight segment is enough.
  if (sinAngle < EPSILON) {
    return [[from.lon, from.lat], [to.lon, to.lat]];
  }

  const distanceKm = angle * EARTH_RADIUS_KM;
  const segments = Math.min(MAX_SEGMENTS, Math.max(MIN_SEGMENTS, Math.ceil(distanceKm / KM_PER_SEGMENT)));
  const path: LonLat[] = [];

  for (let step = 0; step <= segments; step++) {
    const t = step / segments;
    const startWeight = Math.sin((1 - t) * angle) / sinAngle;
    const endWeight = Math.sin(t * angle) / sinAngle;
    path.push(toLonLat([
      start[0] * startWeight + end[0] * endWeight,
      start[1] * startWeight + end[1] * endWeight,
      start[2] * startWeight + end[2] * endWeight,
    ]));
  }

  return path;
}

// Cuts a path where it crosses the 180° meridian, so the map does not draw a line
// across the whole world for routes such as Tokyo to Los Angeles.
export function splitAtAntimeridian(path: LonLat[]): LonLat[][] {
  const lines: LonLat[][] = [];
  let current: LonLat[] = [path[0]];

  for (let index = 1; index < path.length; index++) {
    const [prevLon, prevLat] = path[index - 1];
    const [lon, lat] = path[index];
    const jump = lon - prevLon;

    if (Math.abs(jump) <= 180) {
      current.push([lon, lat]);
      continue;
    }

    // Going east past 180° the longitude jumps by about -360, and the reverse going west.
    const edgeLon = jump < 0 ? 180 : -180;
    const unwrappedLon = lon + (jump < 0 ? 360 : -360);
    const t = (edgeLon - prevLon) / (unwrappedLon - prevLon);
    const edgeLat = prevLat + t * (lat - prevLat);

    current.push([edgeLon, edgeLat]);
    lines.push(current);
    current = [[-edgeLon, edgeLat], [lon, lat]];
  }

  lines.push(current);
  return lines.filter((line) => line.length > 1);
}

// Builds one FeatureCollection: a curved line per flight, and a point per airport used.
export function buildFlightPathCollections(flights: FlightEntry[] | undefined): GeoJsonFeatureCollectionArray {
  const features: GeoJsonFeature[] = [];
  const airports = new Map<string, Airport>();

  for (const { from, to } of flights ?? []) {
    if (!from || !to || from.iata === to.iata) continue;

    const lines = splitAtAntimeridian(greatCirclePath(from, to));

    features.push({
      type: 'Feature',
      geometry: lines.length === 1
        ? { type: 'LineString', coordinates: lines[0] }
        : { type: 'MultiLineString', coordinates: lines },
      properties: {
        name: `${from.iata} → ${to.iata}`,
        kind: 'flight',
        from: from.iata,
        to: to.iata,
      },
    });

    airports.set(from.iata, from);
    airports.set(to.iata, to);
  }

  if (features.length === 0) return [];

  for (const airport of airports.values()) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [airport.lon, airport.lat] },
      properties: {
        name: airport.iata,
        kind: 'airport',
        airportName: airport.name,
        city: airport.city,
        country: airport.country,
      },
    });
  }

  return [{ type: 'FeatureCollection', source: 'Flight path', features }];
}
