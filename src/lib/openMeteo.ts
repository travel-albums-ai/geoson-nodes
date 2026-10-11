import type { GeoBounds, GeoJsonFeature, GeoJsonFeatureCollectionArray } from '@/types/types';

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

// Bounding-box queries only work with gridded models; this one has a 0.25 degree grid.
const OPEN_METEO_MODEL = 'ecmwf_ifs025';
export const OPEN_METEO_GRID_STEP = 0.25;
// Open-Meteo refuses a single request for more locations than this.
export const OPEN_METEO_MAX_LOCATIONS = 1000;

// Current-weather variables, named as Open-Meteo names them. Every fetch asks for all of them,
// so the node can change which ones it outputs without fetching again.
export const OPEN_METEO_VARIABLES = ['temperature_2m', 'rain', 'apparent_temperature', 'weather_code'] as const;

export type OpenMeteoVariable = (typeof OPEN_METEO_VARIABLES)[number];

type OpenMeteoLocation = {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  current?: { time?: string } & Partial<Record<OpenMeteoVariable, number>>;
};

type OpenMeteoErrorResponse = {
  error?: boolean;
  reason?: string;
};

// Grid points inside the box: the south and west edges are included, the north and east edges are not.
export function countOpenMeteoGridPoints(bounds: GeoBounds): number {
  const rows = Math.ceil(bounds.north / OPEN_METEO_GRID_STEP) - Math.ceil(bounds.south / OPEN_METEO_GRID_STEP);
  const columns = Math.ceil(bounds.east / OPEN_METEO_GRID_STEP) - Math.ceil(bounds.west / OPEN_METEO_GRID_STEP);

  return Math.max(0, rows) * Math.max(0, columns);
}

// One point per grid cell in the box, each with the current weather, following the GeoJSON collection contract.
export async function fetchOpenMeteoGeoJson(bounds: GeoBounds): Promise<GeoJsonFeatureCollectionArray> {
  const url = new URL(OPEN_METEO_FORECAST_URL);
  // Open-Meteo expects south,west,north,east.
  url.searchParams.set('bounding_box', [bounds.south, bounds.west, bounds.north, bounds.east].join(','));
  url.searchParams.set('models', OPEN_METEO_MODEL);
  url.searchParams.set('current', OPEN_METEO_VARIABLES.join(','));
  // No timezone parameter: Open-Meteo rejects timezone=auto with a bounding box, so times are GMT.

  const response = await fetch(url);
  const body = await response.json().catch(() => null) as OpenMeteoLocation[] | OpenMeteoErrorResponse | null;

  if (!response.ok) {
    const reason = body && !Array.isArray(body) ? body.reason : undefined;
    throw new Error(reason ?? `Open-Meteo request failed with HTTP ${response.status}`);
  }

  if (!Array.isArray(body)) {
    throw new Error('Open-Meteo response has no grid points');
  }

  const features = body.flatMap((location): GeoJsonFeature[] => {
    if (!location.current || location.latitude === undefined || location.longitude === undefined) return [];

    const properties: Record<string, unknown> = { time: location.current.time, timezone: location.timezone };

    for (const variable of OPEN_METEO_VARIABLES) {
      const value = location.current[variable];
      if (typeof value === 'number') properties[variable] = value;
    }

    return [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [location.longitude, location.latitude] },
      properties,
    }];
  });

  return [{
    type: 'FeatureCollection',
    source: 'Open-Meteo',
    url: url.toString(),
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
