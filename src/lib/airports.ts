import type { Airport } from '@/types/types';

// Compact row layout of src/assets/airports-iata.json (source: OurAirports, public domain).
type AirportRow = [iata: string, name: string, city: string, country: string, lat: number, lon: number];

let airportsPromise: Promise<Airport[]> | null = null;

// Fetched on first use so the list is not part of the startup bundle.
export function loadAirports(): Promise<Airport[]> {
  airportsPromise ??= fetch(`${import.meta.env.BASE_URL}airports-iata.json`)
    .then((response) => {
      if (!response.ok) throw new Error(`Failed to load airports: ${response.status}`);
      return response.json() as Promise<AirportRow[]>;
    })
    .then((rows) => rows.map(([iata, name, city, country, lat, lon]) => ({
      iata,
      name,
      city,
      country,
      lat,
      lon,
    })))
    .catch((error: unknown) => {
      airportsPromise = null;
      throw error;
    });

  return airportsPromise;
}
