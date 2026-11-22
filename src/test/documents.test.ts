import { describe, expect, it } from "vitest";
import { dicts } from "@/lib/i18n";
import {
  countByCategory,
  docKind,
  fileExtension,
  filterDocuments,
  guessMime,
  previewKind,
} from "@/lib/documents";
import type { DocumentEntry } from "@/lib/memories";

const doc = (id: string, title: string, name: string, category: DocumentEntry["category"]) =>
  ({
    id,
    petId: "p",
    date: "2026-01-01",
    title,
    category,
    file: { id: `f${id}`, name, type: "", size: 100 },
  }) satisfies DocumentEntry;

describe("document helpers", () => {
  it("reads the extension and guesses the MIME type when the phone gives none", () => {
    expect(fileExtension("Analīzes.PDF")).toBe("pdf");
    expect(fileExtension("README")).toBe("");
    expect(guessMime({ name: "a.docx", type: "" })).toContain("wordprocessingml");
    expect(guessMime({ name: "a.pdf", type: "application/octet-stream" })).toBe(
      "application/pdf",
    );
    expect(guessMime({ name: "a.jpg", type: "image/png" })).toBe("image/png");
  });

  it("recognises the common document formats", () => {
    expect(docKind({ name: "a.pdf", type: "" })).toBe("pdf");
    expect(docKind({ name: "a.docx", type: "" })).toBe("word");
    expect(docKind({ name: "a.xlsx", type: "" })).toBe("sheet");
    expect(docKind({ name: "a.csv", type: "text/csv" })).toBe("sheet");
    expect(docKind({ name: "a.pptx", type: "" })).toBe("slides");
    expect(docKind({ name: "a.heic", type: "" })).toBe("image");
    expect(docKind({ name: "a.zip", type: "application/zip" })).toBe("archive");
    expect(docKind({ name: "a.xyz", type: "" })).toBe("other");
  });

  it("previews only what the app can show itself", () => {
    expect(previewKind({ name: "a.jpg", type: "image/jpeg", size: 1 })).toBe("image");
    expect(previewKind({ name: "a.mp4", type: "video/mp4", size: 1 })).toBe("video");
    expect(previewKind({ name: "a.txt", type: "text/plain", size: 10 })).toBe("text");
    expect(previewKind({ name: "a.txt", type: "text/plain", size: 10 * 1024 * 1024 })).toBeNull();
    expect(previewKind({ name: "a.pdf", type: "application/pdf", size: 1 })).toBeNull();
    expect(previewKind({ name: "a.docx", type: "", size: 1 })).toBeNull();
  });

  it("filters by category and by title or file name", () => {
    const entries = [
      doc("1", "Asins analīzes", "scan1.pdf", "medical"),
      doc("2", "Pase", "passport.jpg", "adoption"),
      doc("3", "Līgums", "ADOPTION-contract.pdf", "adoption"),
    ];
    expect(filterDocuments(entries, { category: "all", query: "" })).toHaveLength(3);
    expect(filterDocuments(entries, { category: "adoption", query: "" })).toHaveLength(2);
    expect(filterDocuments(entries, { category: "all", query: " analīzes " })).toHaveLength(1);
    expect(filterDocuments(entries, { category: "all", query: "adoption-contract" })).toHaveLength(
      1,
    );
    expect(countByCategory(entries)).toEqual({
      medical: 1,
      vaccination: 0,
      adoption: 2,
      other: 0,
    });
  });

  it("has the new document labels in every language", () => {
    for (const lang of ["lv", "en", "ru", "fr"] as const) {
      expect(dicts[lang].documentsSearch).toBeTruthy();
      expect(dicts[lang].documentsEdit).toBeTruthy();
      expect(dicts[lang].documentsNoApp).toBeTruthy();
    }
  });
});
