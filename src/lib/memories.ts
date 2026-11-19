import type { StoredFile } from "./media";

export interface MemoryEntry {
  id: string;
  petId: string;
  date: string;
  title: string;
  note?: string | undefined;
  files: StoredFile[];
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
