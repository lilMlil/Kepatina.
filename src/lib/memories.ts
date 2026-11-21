import type { StoredFile } from "./media";

/** A photo or video of a memory. Albums and favourites live on the file itself. */
export interface MemoryFile extends StoredFile {
  favorite?: boolean | undefined;
  /** Names of the albums this file belongs to (a file can be in several). */
  albums?: string[] | undefined;
}

export interface MemoryEntry {
  id: string;
  petId: string;
  date: string;
  /** May be empty: the gallery lets you add photos without naming the event. */
  title: string;
  note?: string | undefined;
  files: MemoryFile[];
}

export type DocumentCategory = "medical" | "vaccination" | "adoption" | "other";
export type MedicalRecordKind = "visit" | "vaccine";

export interface DocumentEntry {
  id: string;
  petId: string;
  date: string;
  title: string;
  category: DocumentCategory;
  file: StoredFile;
  recordKind?: MedicalRecordKind | undefined;
  recordId?: string | undefined;
}

export function sortMemories<T extends { date: string }>(entries: T[]): T[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.date.localeCompare(a.entry.date) || b.index - a.index)
    .map(({ entry }) => entry);
}

export function isMemoryFile(file: Pick<File, "type" | "size">): boolean {
  return (
    file.size > 0 &&
    file.size <= 50 * 1024 * 1024 &&
    (file.type.startsWith("image/") || file.type.startsWith("video/"))
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isVideoFile(file: Pick<StoredFile, "type">): boolean {
  return file.type.startsWith("video/");
}

/* ------------------------------------------------------------------ */
/* Gallery helpers: one flat list of every photo / video, albums, etc. */
/* ------------------------------------------------------------------ */

/** One photo or video together with the memory it belongs to. */
export interface MediaItem {
  file: MemoryFile;
  memoryId: string;
  title: string;
  note?: string | undefined;
  date: string;
}

/** Every photo and video of the given memories, newest memory first. */
export function flattenMedia(entries: MemoryEntry[]): MediaItem[] {
  return sortMemories(entries).flatMap((entry) =>
    entry.files.map((file) => ({
      file,
      memoryId: entry.id,
      title: entry.title,
      note: entry.note,
      date: entry.date,
    })),
  );
}

/** Groups already-sorted items by month ("2026-11"). */
export function groupByMonth(items: MediaItem[]): { key: string; items: MediaItem[] }[] {
  const groups = new Map<string, MediaItem[]>();
  for (const item of items) {
    const key = item.date.slice(0, 7);
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  return [...groups.entries()].map(([key, list]) => ({ key, items: list }));
}

export const MAX_ALBUM_NAME = 40;

export function cleanAlbumName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_ALBUM_NAME);
}

const sameName = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

export function fileInAlbum(file: Pick<MemoryFile, "albums">, album: string): boolean {
  return (file.albums ?? []).some((name) => sameName(name, album));
}

export interface AlbumInfo {
  name: string;
  items: MediaItem[];
}

/** Albums are the distinct album names used by the files (case-insensitive), sorted by name. */
export function listAlbums(items: MediaItem[]): AlbumInfo[] {
  const map = new Map<string, AlbumInfo>();
  for (const item of items) {
    for (const name of item.file.albums ?? []) {
      const key = name.toLocaleLowerCase();
      const existing = map.get(key);
      if (existing) existing.items.push(item);
      else map.set(key, { name, items: [item] });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function findAlbum(albums: AlbumInfo[], name: string): AlbumInfo | undefined {
  return albums.find((album) => sameName(album.name, name));
}

/** Applies `change` to the files of one pet's memories; returning null removes the file. */
function mapFiles(
  entries: MemoryEntry[],
  petId: string,
  change: (file: MemoryFile) => MemoryFile | null,
): MemoryEntry[] {
  return entries.map((entry) => {
    if (entry.petId !== petId) return entry;
    let changed = false;
    const files: MemoryFile[] = [];
    for (const file of entry.files) {
      const next = change(file);
      if (next !== file) changed = true;
      if (next) files.push(next);
    }
    return changed ? { ...entry, files } : entry;
  });
}

export function setAlbumMembership(
  entries: MemoryEntry[],
  petId: string,
  ids: ReadonlySet<string>,
  album: string,
  on: boolean,
): MemoryEntry[] {
  return mapFiles(entries, petId, (file) => {
    if (!ids.has(file.id)) return file;
    const current = file.albums ?? [];
    if (on === current.some((name) => sameName(name, album))) return file;
    const albums = on ? [...current, album] : current.filter((name) => !sameName(name, album));
    return { ...file, albums: albums.length > 0 ? albums : undefined };
  });
}

export function renameAlbum(
  entries: MemoryEntry[],
  petId: string,
  from: string,
  to: string,
): MemoryEntry[] {
  return mapFiles(entries, petId, (file) => {
    if (!fileInAlbum(file, from)) return file;
    const rest = (file.albums ?? []).filter((name) => !sameName(name, from));
    const albums = rest.some((name) => sameName(name, to)) ? rest : [...rest, to];
    return { ...file, albums };
  });
}

/** Deletes the album only; its photos stay in the memory album. */
export function deleteAlbum(entries: MemoryEntry[], petId: string, album: string): MemoryEntry[] {
  return mapFiles(entries, petId, (file) => {
    if (!fileInAlbum(file, album)) return file;
    const albums = (file.albums ?? []).filter((name) => !sameName(name, album));
    return { ...file, albums: albums.length > 0 ? albums : undefined };
  });
}

export function setFavorite(
  entries: MemoryEntry[],
  petId: string,
  ids: ReadonlySet<string>,
  on: boolean,
): MemoryEntry[] {
  return mapFiles(entries, petId, (file) => {
    if (!ids.has(file.id) || !!file.favorite === on) return file;
    return { ...file, favorite: on ? true : undefined };
  });
}

/** Removes files from their memories (the memory itself stays). */
export function removeFiles(
  entries: MemoryEntry[],
  petId: string,
  ids: ReadonlySet<string>,
): MemoryEntry[] {
  return mapFiles(entries, petId, (file) => (ids.has(file.id) ? null : file));
}
