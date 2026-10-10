// IndexedDB storage for flight lists loaded into flight-path nodes.
// Lists live here instead of in node data so the pipeline store only persists
// a small key, keeping saved pipelines well under localStorage's quota.
// Kept in a separate database so it does not touch the geojson file schema.

import type { FlightEntry } from '@/types/types';

const DATABASE_NAME = 'geoson-flights';
const STORE_NAME = 'flightLists';

let databasePromise: Promise<IDBDatabase> | null = null;

// Lists already loaded this session. Reusing the same array identity lets the
// client's per-array hash cache skip re-hashing on every run.
const cachedLists = new Map<string, FlightEntry[]>();

function openDatabase(): Promise<IDBDatabase> {
  if (!databasePromise) {
    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);

      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch((error: unknown) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = run(transaction.objectStore(STORE_NAME));

    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function createFlightsKey(): string {
  return `flights-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getCachedFlights(key: string): FlightEntry[] | undefined {
  return cachedLists.get(key);
}

export async function saveFlights(key: string, flights: FlightEntry[]): Promise<void> {
  cachedLists.set(key, flights);

  try {
    await withStore('readwrite', (store) => store.put(flights, key));
  } catch (error) {
    cachedLists.delete(key);
    throw error;
  }
}

export async function loadFlights(key: string): Promise<FlightEntry[]> {
  const cached = cachedLists.get(key);
  if (cached) return cached;

  const value: unknown = await withStore('readonly', (store) => store.get(key));
  const flights = Array.isArray(value) ? (value as FlightEntry[]) : [];

  cachedLists.set(key, flights);
  return flights;
}

export async function deleteFlights(key: string): Promise<void> {
  cachedLists.delete(key);
  await withStore('readwrite', (store) => store.delete(key));
}
