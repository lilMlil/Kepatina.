import JSZip from "jszip";
import { emptyState, type SavedState } from "./family-state";
import type { Lang } from "./i18n";
import type { StoredFileWithData } from "./media";

export interface BackupSettings {
  theme: "light" | "dark";
  lang: Lang;
}

export interface BackupContents {
  state: SavedState;
  settings: BackupSettings;
  files: StoredFileWithData[];
}

export interface BackupArchiveStorage {
  list(
    path: string,
    options: { limit: number; search: string },
  ): Promise<{ data: { name: string }[] | null; error: Error | null }>;
  upload(
    path: string,
    file: Blob,
    options: { contentType: string; upsert: boolean },
  ): Promise<{ error: Error | null }>;
  move(from: string, to: string): Promise<{ error: Error | null }>;
  remove(paths: string[]): Promise<{ error: Error | null }>;
}

interface ArchiveFile extends Omit<StoredFileWithData, "blob"> {
  path: string;
}

interface ArchiveManifest {
  app: "kepatina";
  version: 1;
  exportedAt: string;
  data: SavedState;
  settings: BackupSettings;
  files: ArchiveFile[];
}

export function hasBackupContent(state: SavedState): boolean {
  return !!(
    state.pets.length ||
    state.reminders.length ||
    state.weights.length ||
    state.vaccines.length ||
    state.visits.length ||
    state.meds.length ||
    state.expenses.length ||
    state.memories.length ||
    state.documents.length ||
    Object.keys(state.checks).length ||
    state.owner.name ||
    state.owner.photo ||
    state.owner.phone
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateState(value: unknown): SavedState {
  if (!isRecord(value)) throw new Error("Backup data is not an object.");
  const listKeys = [
    "pets",
    "reminders",
    "weights",
    "vaccines",
    "visits",
    "memories",
    "documents",
    "meds",
    "expenses",
  ] as const;
  for (const key of listKeys) {
    if (!Array.isArray(value[key])) throw new Error(`Backup field "${key}" is invalid.`);
    if (
      (value[key] as unknown[]).some((entry) => !isRecord(entry) || typeof entry["id"] !== "string")
    ) {
      throw new Error(`Backup entries in "${key}" are invalid.`);
    }
  }
  const owner = value["owner"];
  const checks = value["checks"];
  const selectedPetId = value["selectedPetId"];
  if (
    !isRecord(owner) ||
    typeof owner["name"] !== "string" ||
    !(owner["photo"] === null || typeof owner["photo"] === "string") ||
    !isRecord(checks) ||
    Object.values(checks).some((checked) => typeof checked !== "boolean") ||
    (owner["phone"] !== undefined && typeof owner["phone"] !== "string") ||
    !(selectedPetId === null || typeof selectedPetId === "string")
  ) {
    throw new Error("Backup profile or settings data is invalid.");
  }
  return { ...emptyState, ...value, owner: { ...emptyState.owner, ...owner } } as SavedState;
}

function validateSettings(value: unknown): BackupSettings {
  if (
    !isRecord(value) ||
    (value["theme"] !== "light" && value["theme"] !== "dark") ||
    !["lv", "en", "ru", "fr"].includes(String(value["lang"]))
  ) {
    throw new Error("Backup app settings are invalid.");
  }
  return { theme: value["theme"], lang: value["lang"] as Lang };
}

export async function createBackupArchive(
  state: SavedState,
  settings: BackupSettings,
  files: StoredFileWithData[],
): Promise<Blob> {
  const validatedState = validateState(state);
  if (!hasBackupContent(validatedState)) throw new Error("Refusing to create an empty backup.");
  const validatedSettings = validateSettings(settings);
  const zip = new JSZip();
  const entries: ArchiveFile[] = [];
  for (const file of files) {
    if (
      typeof file.id !== "string" ||
      typeof file.name !== "string" ||
      typeof file.type !== "string" ||
      !Number.isSafeInteger(file.size) ||
      file.size <= 0 ||
      file.blob.size !== file.size
    ) {
      throw new Error("Local media file metadata is invalid.");
    }
    const path = `media/${encodeURIComponent(file.id)}`;
    zip.file(path, file.blob);
    const { blob: _blob, ...metadata } = file;
    entries.push({ ...metadata, path });
  }
  const manifest: ArchiveManifest = {
    app: "kepatina",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: validatedState,
    settings: validatedSettings,
    files: entries,
  };
  zip.file("data.json", JSON.stringify(manifest));
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

export async function persistBackupArchive(
  userId: string,
  state: SavedState,
  settings: BackupSettings,
  files: StoredFileWithData[],
  storage: BackupArchiveStorage,
  preservePrevious = false,
): Promise<void> {
  const archive = await createBackupArchive(state, settings, files);
  const basePath = `${userId}/`;
  const { data: objects, error: listError } = await storage.list(userId, {
    limit: 100,
    search: "backup",
  });
  if (listError) throw listError;
  const currentExists = (objects ?? []).some((object) => object.name === "backup.zip");
  const previousExists = (objects ?? []).some((object) => object.name === "backup.prev.zip");
  const token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const stagingPath = `${basePath}backup-${token}.tmp.zip`;
  const { error: uploadError } = await storage.upload(stagingPath, archive, {
    contentType: "application/zip",
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const cleanupStaging = async () => {
    const { error } = await storage.remove([stagingPath]);
    if (error) console.error("[backup] could not remove staging archive", error);
  };
  if (currentExists && preservePrevious) {
    const { error: removeCurrentError } = await storage.remove([`${basePath}backup.zip`]);
    if (removeCurrentError) {
      await cleanupStaging();
      throw removeCurrentError;
    }
    const { error: replaceError } = await storage.move(stagingPath, `${basePath}backup.zip`);
    if (replaceError) {
      await cleanupStaging();
      throw replaceError;
    }
    return;
  }
  if (currentExists) {
    if (previousExists) {
      const { error: removePreviousError } = await storage.remove([`${basePath}backup.prev.zip`]);
      if (removePreviousError) {
        await cleanupStaging();
        throw removePreviousError;
      }
    }
    const { error: archivePreviousError } = await storage.move(
      `${basePath}backup.zip`,
      `${basePath}backup.prev.zip`,
    );
    if (archivePreviousError) {
      await cleanupStaging();
      throw archivePreviousError;
    }
  }
  const { error: replaceError } = await storage.move(stagingPath, `${basePath}backup.zip`);
  if (replaceError) {
    if (currentExists) {
      const { error: restoreError } = await storage.move(
        `${basePath}backup.prev.zip`,
        `${basePath}backup.zip`,
      );
      if (restoreError) console.error("[backup] could not restore previous archive", restoreError);
    }
    await cleanupStaging();
    throw replaceError;
  }
}

export async function readBackupArchive(blob: Blob): Promise<BackupContents> {
  const zip = await JSZip.loadAsync(blob, { checkCRC32: true });
  const manifestFile = zip.file("data.json");
  if (!manifestFile) throw new Error("Backup archive is missing data.json.");
  const raw: unknown = JSON.parse(await manifestFile.async("string"));
  if (
    !isRecord(raw) ||
    raw["app"] !== "kepatina" ||
    raw["version"] !== 1 ||
    !Array.isArray(raw["files"])
  ) {
    throw new Error("Backup archive format is unsupported.");
  }
  const state = validateState(raw["data"]);
  if (!hasBackupContent(state)) throw new Error("Backup archive contains no user data.");
  const settings = validateSettings(raw["settings"]);
  const files: StoredFileWithData[] = [];
  for (const entry of raw["files"]) {
    if (
      !isRecord(entry) ||
      typeof entry["id"] !== "string" ||
      typeof entry["name"] !== "string" ||
      typeof entry["type"] !== "string" ||
      typeof entry["size"] !== "number" ||
      !Number.isSafeInteger(entry["size"]) ||
      entry["size"] < 0 ||
      typeof entry["path"] !== "string" ||
      entry["path"] !== `media/${encodeURIComponent(entry["id"])}`
    ) {
      throw new Error("Backup media entry is invalid.");
    }
    const file = zip.file(entry["path"]);
    if (!file) throw new Error(`Backup media file "${entry["name"]}" is missing.`);
    const bytes = await file.async("arraybuffer");
    if (bytes.byteLength !== entry["size"])
      throw new Error(`Backup media file "${entry["name"]}" is corrupt.`);
    files.push({
      id: entry["id"],
      name: entry["name"],
      type: entry["type"],
      size: entry["size"],
      blob: new Blob([bytes], { type: entry["type"] }),
    });
  }
  return { state, settings, files };
}

export async function restoreBackupArchive(
  blob: Blob,
  restore: {
    files: (files: StoredFileWithData[]) => Promise<void>;
    state: (state: SavedState) => void;
    settings: (settings: BackupSettings) => void;
  },
): Promise<BackupContents> {
  const contents = await readBackupArchive(blob);
  await restore.files(contents.files);
  restore.state(contents.state);
  restore.settings(contents.settings);
  return contents;
}

export function validateLegacyState(value: unknown): SavedState | null {
  if (!isRecord(value)) return null;
  const normalized = {
    ...emptyState,
    ...value,
    owner: {
      ...emptyState.owner,
      ...(isRecord(value["owner"]) ? value["owner"] : {}),
    },
  };
  try {
    return validateState(normalized);
  } catch {
    return null;
  }
}
