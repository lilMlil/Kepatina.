import { describe, expect, it } from "vitest";
import { dicts } from "@/lib/i18n";
import {
  deleteAlbum,
  findAlbum,
  flattenMedia,
  formatFileSize,
  groupByMonth,
  isMemoryFile,
  listAlbums,
  removeFiles,
  renameAlbum,
  setAlbumMembership,
  setFavorite,
  sortMemories,
  type MemoryEntry,
  type MemoryFile,
} from "@/lib/memories";

const file = (id: string, extra: Partial<MemoryFile> = {}): MemoryFile => ({
  id,
  name: `${id}.jpg`,
  type: "image/jpeg",
  size: 1,
  ...extra,
});

const sample = (): MemoryEntry[] => [
  { id: "a", petId: "p1", date: "2026-05-01", title: "", files: [file("1"), file("2")] },
  { id: "b", petId: "p1", date: "2026-11-02", title: "Walk", files: [file("3")] },
  { id: "c", petId: "p2", date: "2026-11-02", title: "Other pet", files: [file("4")] },
];

describe("memory and document helpers", () => {
  it("sorts entries newest first while keeping equal-date entries stable", () => {
    const entries = [
      { id: "first", date: "2026-03-01" },
      { id: "second", date: "2026-05-01" },
      { id: "third", date: "2026-05-01" },
    ];
    expect(sortMemories(entries).map(({ id }) => id)).toEqual(["third", "second", "first"]);
  });

  it("accepts only non-empty images and videos up to 50 MB for memories", () => {
    expect(isMemoryFile({ type: "image/jpeg", size: 100 })).toBe(true);
    expect(isMemoryFile({ type: "video/mp4", size: 50 * 1024 * 1024 })).toBe(true);
    expect(isMemoryFile({ type: "application/pdf", size: 100 })).toBe(false);
    expect(isMemoryFile({ type: "image/png", size: 0 })).toBe(false);
    expect(isMemoryFile({ type: "video/mp4", size: 50 * 1024 * 1024 + 1 })).toBe(false);
  });

  it("formats attachment sizes for the file list", () => {
    expect(formatFileSize(800)).toBe("1 KB");
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
  });

  it("provides complete feature labels in each supported language", () => {
    for (const lang of ["lv", "en", "ru", "fr"] as const) {
      expect(dicts[lang].memoryTitle).toBeTruthy();
      expect(dicts[lang].documentsTitle).toBeTruthy();
      expect(dicts[lang].documentsCategories).toHaveLength(4);
      expect(dicts[lang].memoryTabAlbums).toBeTruthy();
      expect(dicts[lang].memorySelectedCount).toContain("{n}");
      expect(dicts[lang].memoryItemCount).toContain("{n}");
    }
  });
});

describe("memory gallery helpers", () => {
  it("lists every photo of a pet newest memory first and groups them by month", () => {
    const items = flattenMedia(sample().filter((entry) => entry.petId === "p1"));
    expect(items.map((item) => item.file.id)).toEqual(["3", "1", "2"]);
    expect(groupByMonth(items).map((group) => group.key)).toEqual(["2026-11", "2026-05"]);
  });

  it("adds files to an album, ignoring the album name case and other pets", () => {
    let entries = setAlbumMembership(sample(), "p1", new Set(["1", "3", "4"]), "Summer", true);
    entries = setAlbumMembership(entries, "p1", new Set(["2"]), "summer", true);
    const albums = listAlbums(flattenMedia(entries.filter((entry) => entry.petId === "p1")));
    expect(albums).toHaveLength(1);
    expect(albums[0]?.items.map((item) => item.file.id).sort()).toEqual(["1", "2", "3"]);
    expect(entries[2]?.files[0]?.albums).toBeUndefined();
  });

  it("renames and deletes an album without deleting its photos", () => {
    let entries = setAlbumMembership(sample(), "p1", new Set(["1", "2"]), "Summer", true);
    entries = renameAlbum(entries, "p1", "Summer", "Autumn");
    const items = flattenMedia(entries);
    expect(findAlbum(listAlbums(items), "autumn")?.items).toHaveLength(2);
    expect(findAlbum(listAlbums(items), "Summer")).toBeUndefined();

    entries = deleteAlbum(entries, "p1", "Autumn");
    expect(listAlbums(flattenMedia(entries))).toHaveLength(0);
    expect(flattenMedia(entries)).toHaveLength(4);
  });

  it("toggles favourites and removes files", () => {
    let entries = setFavorite(sample(), "p1", new Set(["1"]), true);
    expect(entries[0]?.files[0]?.favorite).toBe(true);
    entries = setFavorite(entries, "p1", new Set(["1"]), false);
    expect(entries[0]?.files[0]?.favorite).toBeUndefined();

    entries = removeFiles(entries, "p1", new Set(["2", "3"]));
    expect(entries.map((entry) => entry.files.length)).toEqual([1, 0, 1]);
  });
});
