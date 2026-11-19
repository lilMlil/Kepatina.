export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
}

interface StoredFileData extends StoredFile {
  blob: Blob;
}

export const MAX_LOCAL_FILE_BYTES = 50 * 1024 * 1024;

const DB_NAME = "kepatina-media";
const STORE_NAME = "files";
const DB_VERSION = 1;

let database: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined")
    return Promise.reject(new Error("Local file storage is unavailable."));
  if (database) return database;

  const opened = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME))
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open local file storage."));
    request.onblocked = () => reject(new Error("Local file storage is blocked by another tab."));
  }).catch((error: unknown) => {
    database = undefined;
    throw error;
  });
  database = opened;
  return opened;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function saveLocalFiles(files: File[]): Promise<StoredFile[]> {
  if (files.some((file) => !file.size || file.size > MAX_LOCAL_FILE_BYTES))
    throw new Error("A file is empty or exceeds the 50 MB limit.");
  if (files.length === 0) return [];

  const rows = files.map((file) => ({
    id: newId(),
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    blob: file,
  }));
  const db = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    for (const row of rows) transaction.objectStore(STORE_NAME).put(row);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Could not save local files."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Saving local files was canceled."));
  });

  return rows.map(({ blob: _blob, ...file }) => file);
}

export async function getLocalFile(id: string): Promise<Blob | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(id) as IDBRequest<
      StoredFileData | undefined
    >;
    request.onsuccess = () => resolve(request.result?.blob ?? null);
    request.onerror = () => reject(request.error ?? new Error("Could not read the local file."));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Could not read the local file."));
  });
}

export async function deleteLocalFiles(files: StoredFile[]): Promise<void> {
  if (files.length === 0) return;
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    for (const file of files) store.delete(file.id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Could not delete local files."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Deleting local files was canceled."));
  });
}
