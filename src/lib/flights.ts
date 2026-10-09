import type { Airport, FlightEntry, GeoJsonFeature, GeoJsonFeatureCollectionArray } from '@/types/types';

type LonLat = [lon: number, lat: number];
type Vector = [x: number, y: number, z: number];

const KM_PER_SEGMENT = 50;
const MIN_SEGMENTS = 16;
const MAX_SEGMENTS = 256;
const EARTH_RADIUS_KM = 6371;
const EPSILON = 1e-9;
// How far the arc's control point sits from the chord, as a fraction of the chord length.
const BOW_RATIO = 0.15;

const toVector = ({ lat, lon }: Airport): Vector => {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  return [Math.cos(latRad) * Math.cos(lonRad), Math.cos(latRad) * Math.sin(lonRad), Math.sin(latRad)];
};

const wrapLon = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180;

// Samples a curved route between two airports as a quadratic curve in lon/lat space.
// The curve bows sideways from the straight chord, so long routes near the poles do
// not climb toward them the way a true great circle does on a flat map. Longitudes are
// not wrapped, so a route crossing the 180° meridian keeps going past it.
export function flightArcPath(from: Airport, to: Airport): LonLat[] {
  const dLon = wrapLon(to.lon - from.lon);
  const dLat = to.lat - from.lat;
  const chord = Math.hypot(dLon, dLat);

  if (chord < EPSILON) {
    return [[from.lon, from.lat], [to.lon, to.lat]];
  }

  // Unit normal to the chord, flipped to point north so every route bows the same way.
  let normalLon = -dLat / chord;
  let normalLat = dLon / chord;
  if (normalLat < 0) {
    normalLon = -normalLon;
    normalLat = -normalLat;
  }

  const bow = BOW_RATIO * chord;
  const controlLon = from.lon + dLon / 2 + normalLon * bow;
  const controlLat = from.lat + dLat / 2 + normalLat * bow;

  const start = toVector(from);
  const end = toVector(to);
  const dot = Math.min(1, Math.max(-1, start[0] * end[0] + start[1] * end[1] + start[2] * end[2]));
  const distanceKm = Math.acos(dot) * EARTH_RADIUS_KM;
  const segments = Math.min(MAX_SEGMENTS, Math.max(MIN_SEGMENTS, Math.ceil(distanceKm / KM_PER_SEGMENT)));
  const path: LonLat[] = [];

  for (let step = 0; step <= segments; step++) {
    const t = step / segments;
    const u = 1 - t;
    const lon = u * u * from.lon + 2 * u * t * controlLon + t * t * (from.lon + dLon);
    const lat = u * u * from.lat + 2 * u * t * controlLat + t * t * to.lat;
    path.push([lon, lat]);
  }

  return path;
}

// Builds one FeatureCollection: a curved line per flight, and a point per airport used.
export function buildFlightPathCollections(flights: FlightEntry[] | undefined): GeoJsonFeatureCollectionArray {
  const features: GeoJsonFeature[] = [];
  // The same airport can sit at two longitudes when a route crosses the 180° meridian.
  const airports = new Map<string, { airport: Airport; lon: number }>();

  const addAirport = (airport: Airport, lon: number) => {
    airports.set(`${airport.iata}@${lon}`, { airport, lon });
  };

  for (const { from, to, price, currency, date, extraText } of flights ?? []) {
    if (!from || !to || from.iata === to.iata) continue;

    const path = flightArcPath(from, to);
    const name = `${from.iata} → ${to.iata}`;
    const priceText = [price, currency].filter((part) => part !== null && part !== '').join(' ');
    const tooltip = [name, priceText, date, extraText].filter((part) => part !== null && part !== '').join(' · ');

    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: path },
      properties: {
        name,
        kind: 'flight',
        from: from.iata,
        to: to.iata,
        price,
        currency,
        date,
        extraText,
        tooltip,
      },
    });

    addAirport(from, path[0][0]);
    addAirport(to, path[path.length - 1][0]);
  }

  if (features.length === 0) return [];

  for (const { airport, lon } of airports.values()) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lon, airport.lat] },
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

export type ParsedFlights = {
  flights: FlightEntry[];
  unknownCodes: string[];
};

// Expects {"flights": [{"from": "WAW", "to": "JFK", "price": 412.5, "currency": "EUR", "date": "2025-06-14", "extraText": "Window seat"}, ...]}.
// Airports are matched by IATA code; flights with an unknown code are left out and their codes are returned so the user can see them.
// The price, currency, date and extraText fields are optional and read as null when missing.
export function parseFlightsFile(text: string, airports: Airport[]): ParsedFlights {
  const parsed: unknown = JSON.parse(text);
  const entries = (parsed as { flights?: unknown } | null)?.flights;

  if (!Array.isArray(entries)) {
    throw new Error('Expected a "flights" list');
  }

  const byCode = new Map(airports.map((airport) => [airport.iata, airport]));
  const flights: FlightEntry[] = [];
  const unknownCodes = new Set<string>();

  const lookup = (value: unknown): Airport | null => {
    if (typeof value !== 'string') {
      throw new Error('Airport codes must be strings');
    }

    const code = value.trim().toUpperCase();
    const airport = byCode.get(code) ?? null;

    if (!airport) unknownCodes.add(code);

    return airport;
  };

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') {
      throw new Error('Each flight must be an object');
    }

    const { from, to, price, currency, date, extraText } = entry as Record<string, unknown>;
    const fromAirport = lookup(from);
    const toAirport = lookup(to);

    if (fromAirport && toAirport) {
      flights.push({
        from: fromAirport,
        to: toAirport,
        price: typeof price === 'number' ? price : null,
        currency: typeof currency === 'string' ? currency : null,
        date: typeof date === 'string' ? date : null,
        extraText: typeof extraText === 'string' ? extraText : null,
      });
    }
  }

  return { flights, unknownCodes: [...unknownCodes] };
}
