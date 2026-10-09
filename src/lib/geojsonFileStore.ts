// IndexedDB storage for GeoJSON files loaded into geojson-input nodes.
// Records are keyed by a per-upload key kept on the node, so the pipeline
// store only persists the key while the file itself lives here. Usable from
// both the main thread and the pipeline worker.

const DATABASE_NAME = 'geoson-nodes';
const STORE_NAME = 'geojsonFiles';

let databasePromise: Promise<IDBDatabase> | null = null;

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

export function createGeoJsonFileKey(): string {
  return `geojson-file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveGeoJsonFile(key: string, file: File): Promise<void> {
  await withStore('readwrite', (store) => store.put(file, key));
}

export async function loadGeoJsonFile(key: string): Promise<File | null> {
  const value: unknown = await withStore('readonly', (store) => store.get(key));

  return value instanceof File ? value : null;
}

export async function deleteGeoJsonFile(key: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(key));
}
