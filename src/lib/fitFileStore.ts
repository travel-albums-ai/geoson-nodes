// IndexedDB storage for FIT files loaded into fit-input nodes. Like the other
// file stores, the node keeps only a key while the files live here, and the
// worker reads the same records. Kept in a separate database so the
// geojson file schema is not touched.

const DATABASE_NAME = 'geoson-fit-files';
const STORE_NAME = 'fitFiles';

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

export function createFitFilesKey(): string {
  return `fit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveFitFiles(key: string, files: File[]): Promise<void> {
  await withStore('readwrite', (store) => store.put(files, key));
}

export async function loadFitFiles(key: string): Promise<File[]> {
  const value: unknown = await withStore('readonly', (store) => store.get(key));
  return Array.isArray(value) ? value.filter((item): item is File => item instanceof File) : [];
}

export async function deleteFitFiles(key: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(key));
}
