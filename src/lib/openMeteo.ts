import type { GeoBounds, GeoJsonFeature, GeoJsonFeatureCollectionArray } from '@/types/types';

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

// Grid spacing in degrees, used until the user picks another one.
export const OPEN_METEO_DEFAULT_GRID_STEP = 0.25;
export const OPEN_METEO_MIN_GRID_STEP = 0.01;
// Open-Meteo refuses a single request for more locations than this.
export const OPEN_METEO_MAX_LOCATIONS = 1000;
// Longer lists push the URL past the server limit (HTTP 414 above about 500 locations).
const LOCATIONS_PER_REQUEST = 250;
// Absorbs float error in south / step, so a point exactly on a grid line is not lost.
const GRID_EPSILON = 1e-9;

// Current-weather variables, named as Open-Meteo names them. Every fetch asks for all of them,
// so the node can change which ones it outputs without fetching again.
export const OPEN_METEO_VARIABLES = ['temperature_2m', 'rain', 'apparent_temperature', 'weather_code'] as const;

export type OpenMeteoVariable = (typeof OPEN_METEO_VARIABLES)[number];

export type GridPoint = { latitude: number; longitude: number };

type OpenMeteoLocation = {
  timezone?: string;
  current?: { time?: string } & Partial<Record<OpenMeteoVariable, number>>;
};

type OpenMeteoErrorResponse = {
  error?: boolean;
  reason?: string;
};

// Multiples of step in [min, max): min is included, max is not. Returns the first index and the end index.
function gridIndexRange(min: number, max: number, step: number): [number, number] {
  const first = Math.ceil(min / step - GRID_EPSILON);
  const end = Math.ceil(max / step - GRID_EPSILON);

  return [first, Math.max(first, end)];
}

const roundDegrees = (value: number) => Math.round(value * 1e6) / 1e6;

export function countOpenMeteoGridPoints(bounds: GeoBounds, step: number): number {
  const [rowStart, rowEnd] = gridIndexRange(bounds.south, bounds.north, step);
  const [columnStart, columnEnd] = gridIndexRange(bounds.west, bounds.east, step);

  return (rowEnd - rowStart) * (columnEnd - columnStart);
}

// Grid points inside the box, one per multiple of step. Only call this after checking the count.
export function listOpenMeteoGridPoints(bounds: GeoBounds, step: number): GridPoint[] {
  const [rowStart, rowEnd] = gridIndexRange(bounds.south, bounds.north, step);
  const [columnStart, columnEnd] = gridIndexRange(bounds.west, bounds.east, step);
  const points: GridPoint[] = [];

  for (let row = rowStart; row < rowEnd; row++) {
    for (let column = columnStart; column < columnEnd; column++) {
      points.push({ latitude: roundDegrees(row * step), longitude: roundDegrees(column * step) });
    }
  }

  return points;
}

function buildForecastUrl(points: GridPoint[]): URL {
  const url = new URL(OPEN_METEO_FORECAST_URL);
  url.searchParams.set('latitude', points.map((point) => point.latitude).join(','));
  url.searchParams.set('longitude', points.map((point) => point.longitude).join(','));
  url.searchParams.set('current', OPEN_METEO_VARIABLES.join(','));
  // Each point gets the time in its own timezone.
  url.searchParams.set('timezone', 'auto');

  return url;
}

async function fetchForecastBatch(points: GridPoint[]): Promise<OpenMeteoLocation[]> {
  const response = await fetch(buildForecastUrl(points));
  const body = await response.json().catch(() => null) as OpenMeteoLocation[] | OpenMeteoErrorResponse | null;

  if (!response.ok) {
    const reason = body && !Array.isArray(body) ? body.reason : undefined;
    throw new Error(reason ?? `Open-Meteo request failed with HTTP ${response.status}`);
  }

  if (!Array.isArray(body) || body.length !== points.length) {
    throw new Error('Open-Meteo response does not match the requested grid points');
  }

  return body;
}

// One point per grid point in the box, each with the current weather, following the GeoJSON collection contract.
// Points are placed at the requested grid coordinates; Open-Meteo answers from the nearest model cell.
export async function fetchOpenMeteoGeoJson(bounds: GeoBounds, step: number): Promise<GeoJsonFeatureCollectionArray> {
  const pointCount = countOpenMeteoGridPoints(bounds, step);

  if (pointCount === 0) throw new Error('The box has no grid points at this step');
  if (pointCount > OPEN_METEO_MAX_LOCATIONS) {
    throw new Error(`${pointCount} grid points is over the ${OPEN_METEO_MAX_LOCATIONS} limit`);
  }

  const points = listOpenMeteoGridPoints(bounds, step);
  const features: GeoJsonFeature[] = [];

  for (let start = 0; start < points.length; start += LOCATIONS_PER_REQUEST) {
    const batch = points.slice(start, start + LOCATIONS_PER_REQUEST);
    const locations = await fetchForecastBatch(batch);

    locations.forEach((location, index) => {
      if (!location.current) return;

      const properties: Record<string, unknown> = { time: location.current.time, timezone: location.timezone };

      for (const variable of OPEN_METEO_VARIABLES) {
        const value = location.current[variable];
        if (typeof value === 'number') properties[variable] = value;
      }

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [batch[index].longitude, batch[index].latitude] },
        properties,
      });
    });
  }

  return [{
    type: 'FeatureCollection',
    source: 'Open-Meteo',
    url: OPEN_METEO_FORECAST_URL,
    features,
  }];
}

// Removes the weather variables that are not selected, keeping time, timezone and the rest of each feature.
export function selectOpenMeteoVariables(
  collections: GeoJsonFeatureCollectionArray,
  variables: readonly string[],
): GeoJsonFeatureCollectionArray {
  const selected = new Set(variables);

  return collections.map((collection) => ({
    ...collection,
    features: collection.features.map((feature) => {
      const properties = { ...feature.properties };

      for (const variable of OPEN_METEO_VARIABLES) {
        if (!selected.has(variable)) delete properties[variable];
      }

      return { ...feature, properties };
    }),
  }));
}
