import type { GeoJsonFeature, GeoJsonFeatureCollectionArray } from '@/types/types';

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

// Current-weather variables, named as Open-Meteo names them. Every fetch asks for all of them,
// so the node can change which ones it outputs without fetching again.
export const OPEN_METEO_VARIABLES = ['temperature_2m', 'rain', 'apparent_temperature', 'weather_code'] as const;

export type OpenMeteoVariable = (typeof OPEN_METEO_VARIABLES)[number];

type OpenMeteoResponse = {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  current?: { time?: string } & Partial<Record<OpenMeteoVariable, number>>;
  error?: boolean;
  reason?: string;
};

// Returns the value as a number when it is finite and within the limit, otherwise null.
export function readCoordinate(value: string, limit: number): number | null {
  if (value.trim() === '') return null;

  const coordinate = Number(value);
  return Number.isFinite(coordinate) && Math.abs(coordinate) <= limit ? coordinate : null;
}

// One point at the location with the current weather, following the GeoJSON collection contract.
export async function fetchOpenMeteoGeoJson(latitude: number, longitude: number): Promise<GeoJsonFeatureCollectionArray> {
  const url = new URL(OPEN_METEO_FORECAST_URL);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', OPEN_METEO_VARIABLES.join(','));
  url.searchParams.set('timezone', 'auto');

  const response = await fetch(url);
  const body = await response.json().catch(() => null) as OpenMeteoResponse | null;

  if (!response.ok) {
    throw new Error(body?.reason ?? `Open-Meteo request failed with HTTP ${response.status}`);
  }

  if (!body?.current || body.latitude === undefined || body.longitude === undefined) {
    throw new Error('Open-Meteo response has no current weather');
  }

  const properties: Record<string, unknown> = { time: body.current.time, timezone: body.timezone };

  for (const variable of OPEN_METEO_VARIABLES) {
    const value = body.current[variable];
    if (typeof value === 'number') properties[variable] = value;
  }

  const feature: GeoJsonFeature = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [body.longitude, body.latitude] },
    properties,
  };

  return [{
    type: 'FeatureCollection',
    source: 'Open-Meteo',
    url: url.toString(),
    features: [feature],
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
