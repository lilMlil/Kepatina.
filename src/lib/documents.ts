import type { StoredFile } from "./media";
import type { DocumentCategory, DocumentEntry } from "./memories";

export const DOCUMENT_CATEGORIES = ["medical", "vaccination", "adoption", "other"] as const;

export type DocKind =
  | "pdf"
  | "image"
  | "video"
  | "audio"
  | "text"
  | "word"
  | "sheet"
  | "slides"
  | "archive"
  | "other";

/** Lower-case extension without the dot ("" when the name has none). */
export function fileExtension(name: string): string {
  const match = /\.([A-Za-z0-9]{1,8})$/.exec(name.trim());
  return match?.[1]?.toLowerCase() ?? "";
}

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  xml: "application/xml",
  rtf: "application/rtf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  odt: "application/vnd.oasis.opendocument.text",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odp: "application/vnd.oasis.opendocument.presentation",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
};

/** The file's MIME type; phones often report an empty or generic type, so fall back to the extension. */
export function guessMime(file: Pick<StoredFile, "name" | "type">): string {
  const type = file.type.trim().toLowerCase();
  if (type && type !== "application/octet-stream") return type;
  return MIME_BY_EXTENSION[fileExtension(file.name)] ?? "application/octet-stream";
}

export function docKind(file: Pick<StoredFile, "name" | "type">): DocKind {
  const mime = guessMime(file);
  const ext = fileExtension(file.name);
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (ext === "csv" || mime.includes("spreadsheet") || mime === "application/vnd.ms-excel")
    return "sheet";
  if (mime.startsWith("text/") || mime === "application/json" || mime === "application/xml")
    return "text";
  if (
    mime.includes("wordprocessingml") ||
    mime === "application/msword" ||
    mime === "application/rtf" ||
    mime === "application/vnd.oasis.opendocument.text"
  )
    return "word";
  if (mime.includes("presentation") || mime === "application/vnd.ms-powerpoint") return "slides";
  if (/zip|rar|7z|compressed/.test(mime)) return "archive";
  return "other";
}

/** Kinds the app can show itself, without another app. */
export type PreviewKind = "image" | "video" | "audio" | "text";

export const MAX_TEXT_PREVIEW_BYTES = 512 * 1024;

export function previewKind(file: Pick<StoredFile, "name" | "type" | "size">): PreviewKind | null {
  const kind = docKind(file);
  if (kind === "image" || kind === "video" || kind === "audio") return kind;
  if (kind === "text" || fileExtension(file.name) === "csv")
    return file.size <= MAX_TEXT_PREVIEW_BYTES ? "text" : null;
  return null;
}

export interface DocumentFilter {
  category: DocumentCategory | "all";
  query: string;
}

export function filterDocuments(entries: DocumentEntry[], filter: DocumentFilter): DocumentEntry[] {
  const query = filter.query.trim().toLocaleLowerCase();
  return entries.filter((entry) => {
    if (filter.category !== "all" && entry.category !== filter.category) return false;
    if (!query) return true;
    return (
      entry.title.toLocaleLowerCase().includes(query) ||
      entry.file.name.toLocaleLowerCase().includes(query)
    );
  });
}

export function countByCategory(entries: DocumentEntry[]): Record<DocumentCategory, number> {
  const counts: Record<DocumentCategory, number> = {
    medical: 0,
    vaccination: 0,
    adoption: 0,
    other: 0,
  };
  for (const entry of entries) counts[entry.category] += 1;
  return counts;
}
