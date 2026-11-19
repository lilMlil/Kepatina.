import { describe, expect, it, vi } from "vitest";
import {
  createBackupArchive,
  persistBackupArchive,
  readBackupArchive,
  restoreBackupArchive,
} from "@/lib/backup-archive";
import type { BackupSettings } from "@/lib/backup-archive";
import { emptyState, type SavedState } from "@/lib/family-state";
import type { StoredFileWithData } from "@/lib/media";

const settings = { theme: "dark", lang: "en" } as const;
const state: SavedState = {
  ...emptyState,
  pets: [{ id: "pet-1", name: "Milo", species: "Suns", createdAt: "2026-01-01" }],
  owner: { name: "Ada", photo: null, phone: "123" },
  checks: { welcome: true },
};
const media: StoredFileWithData[] = [
  {
    id: "media-1",
    name: "photo.jpg",
    type: "image/jpeg",
    size: 4,
    blob: new Blob(["pet!"], { type: "image/jpeg" }),
  },
];

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe("personal backup archives", () => {
  it("round-trips saved state, settings, and IndexedDB media", async () => {
    const archive = await createBackupArchive(state, settings, media);
    const contents = await readBackupArchive(archive);

    expect(contents.state).toEqual(state);
    expect(contents.settings).toEqual(settings);
    expect(await readBlob(contents.files[0]!.blob)).toBe("pet!");
  });

  it("restores archive contents onto a new device", async () => {
    const archive = await createBackupArchive(state, settings, media);
    let restoredState: SavedState = emptyState;
    let restoredSettings: BackupSettings = { theme: "light", lang: "lv" };
    const indexedDbFiles: StoredFileWithData[] = [];

    await restoreBackupArchive(archive, {
      files: async (files) => {
        indexedDbFiles.push(...files);
      },
      state: (next) => {
        restoredState = next;
      },
      settings: (next) => {
        restoredSettings = next;
      },
    });

    expect(restoredState).toEqual(state);
    expect(restoredSettings).toEqual(settings);
    expect(indexedDbFiles).toHaveLength(1);
    expect(await readBlob(indexedDbFiles[0]!.blob)).toBe("pet!");
  });

  it("does not touch storage when asked to replace an archive with empty data", async () => {
    const storage = {
      list: vi.fn(),
      upload: vi.fn(),
      move: vi.fn(),
      remove: vi.fn(),
    };

    await expect(persistBackupArchive("user-1", emptyState, settings, [], storage)).rejects.toThrow(
      "Refusing to create an empty backup",
    );
    expect(storage.list).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
    expect(storage.move).not.toHaveBeenCalled();
  });

  it("stages a replacement and preserves the previous archive", async () => {
    const objects = new Map<string, Blob>([["user-1/backup.zip", new Blob(["old"])]]);
    const storage = {
      list: async () => ({
        data: [{ name: "backup.zip" }],
        error: null,
      }),
      upload: async (path: string, file: Blob) => {
        objects.set(path, file);
        return { error: null };
      },
      move: async (from: string, to: string) => {
        const file = objects.get(from);
        if (!file) return { error: new Error(`Missing source ${from}`) };
        objects.set(to, file);
        objects.delete(from);
        return { error: null };
      },
      remove: async (paths: string[]) => {
        paths.forEach((path) => objects.delete(path));
        return { error: null };
      },
    };

    await persistBackupArchive("user-1", state, settings, media, storage);

    expect(await readBlob(objects.get("user-1/backup.prev.zip")!)).toBe("old");
    const current = await readBackupArchive(objects.get("user-1/backup.zip")!);
    expect(current.state).toEqual(state);
    expect([...objects.keys()]).toEqual(["user-1/backup.prev.zip", "user-1/backup.zip"]);
  });
});
