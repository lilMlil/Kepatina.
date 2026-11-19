import { describe, expect, it } from "vitest";
import { dicts } from "@/lib/i18n";
import { formatFileSize, isMemoryFile, sortMemories } from "@/lib/memories";

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
    }
  });
});
