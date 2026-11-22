/**
 * PDF reports + browser printing.
 *
 * - `printReport` opens the browser print dialog (used by the passport and the tag pages).
 *   It does not exist inside the native app WebView.
 * - `createReportPdf` + `deliverPdf` build a real PDF file on the device (no libraries, no network)
 *   and hand it to the system share sheet (app) or download it (browser). This is what the health
 *   journal export uses, so it works in the Android / iOS app as well.
 *
 * The pages are drawn on a canvas (so every language, including Latvian and Cyrillic letters, renders
 * with the phone's own fonts) and embedded as JPEG images into a minimal hand-written PDF container.
 */
import { isNative } from "./native/platform";

/* ------------------------------------------------------------------ */
/* Browser print dialog                                                */
/* ------------------------------------------------------------------ */

/** Open the browser print dialog with a helpful default file name ("Save as PDF"). */
export function printReport(fileTitle: string, onFail: () => void) {
  // The system print dialog is not available inside the native app WebView.
  if (isNative()) return onFail();
  const prev = document.title;
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    document.title = prev;
    window.removeEventListener("afterprint", restore);
  };
  document.title = fileTitle;
  window.addEventListener("afterprint", restore);
  window.setTimeout(restore, 60000);
  try {
    window.print();
  } catch {
    restore();
    onFail();
  }
}

/* ------------------------------------------------------------------ */
/* Report model                                                        */
/* ------------------------------------------------------------------ */

export type ReportBlock =
  | { type: "title"; text: string; meta?: string }
  | { type: "kv"; rows: [string, string][] }
  | { type: "heading"; text: string }
  | { type: "text"; text: string; muted?: boolean }
  | {
      type: "table";
      head: string[];
      rows: string[][];
      /** Column widths as fractions of the page width (should add up to about 1). */
      widths: number[];
    }
  | { type: "chart"; points: { date: string; v: number }[]; unit: string }
  | { type: "note"; text: string };

export interface ReportOptions {
  /** Stored in the PDF properties. */
  title: string;
  /** Printed in the page footer, left. */
  appName: string;
  /** Printed in the page footer, right ("1 / 3"). */
  pageLabel?: (page: number, total: number) => string;
}

/* ------------------------------------------------------------------ */
/* Page drawing                                                        */
/* ------------------------------------------------------------------ */

const PAGE_W = 595; // A4 in PDF points
const PAGE_H = 842;
const MARGIN = 40;
const FOOTER_SPACE = 34;
const SCALE = 2; // canvas pixels per point (about 144 dpi)
const CONTENT_W = PAGE_W - MARGIN * 2;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const GREEN = "#2f6b4f";
const INK = "#111111";
const GRAY = "#555555";

const font = (size: number, bold = false) => `${bold ? "700 " : "400 "}${size}px ${FONT}`;

/** Splits text into lines that fit `maxWidth` (breaks very long words by character). */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r/g, "").split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      if (ctx.measureText(word).width <= maxWidth) {
        line = word;
        continue;
      }
      // One word wider than the line (chip numbers, long URLs): break it by character.
      let chunk = "";
      for (const char of word) {
        if (chunk && ctx.measureText(chunk + char).width > maxWidth) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      line = chunk;
    }
    lines.push(line);
  }
  return lines;
}

class PageSet {
  readonly canvases: HTMLCanvasElement[] = [];
  readonly contexts: CanvasRenderingContext2D[] = [];
  y = MARGIN;

  constructor() {
    this.newPage();
  }

  get ctx(): CanvasRenderingContext2D {
    const ctx = this.contexts[this.contexts.length - 1];
    if (!ctx) throw new Error("no page");
    return ctx;
  }

  newPage() {
    const canvas = document.createElement("canvas");
    canvas.width = PAGE_W * SCALE;
    canvas.height = PAGE_H * SCALE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available.");
    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    ctx.textBaseline = "alphabetic";
    this.canvases.push(canvas);
    this.contexts.push(ctx);
    this.y = MARGIN;
  }

  /** Starts a new page when `height` does not fit below the current position. */
  ensure(height: number) {
    if (this.y + height > PAGE_H - FOOTER_SPACE - MARGIN / 2 && this.y > MARGIN) this.newPage();
  }
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
) {
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
}

function drawTitle(pages: PageSet, block: Extract<ReportBlock, { type: "title" }>) {
  const ctx = pages.ctx;
  ctx.font = font(22, true);
  ctx.fillStyle = INK;
  const lines = wrapText(ctx, block.text, CONTENT_W);
  drawLines(ctx, lines, MARGIN, pages.y + 22, 26);
  pages.y += lines.length * 26 + 2;
  if (block.meta) {
    ctx.font = font(11);
    ctx.fillStyle = GRAY;
    ctx.fillText(block.meta, MARGIN, pages.y + 11);
    pages.y += 22;
  }
}

function drawHeading(pages: PageSet, text: string) {
  pages.ensure(70); // keep a heading together with the first lines under it
  const ctx = pages.ctx;
  pages.y += 14;
  ctx.font = font(14, true);
  ctx.fillStyle = GREEN;
  ctx.fillText(text, MARGIN, pages.y + 12);
  pages.y += 18;
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(MARGIN, pages.y);
  ctx.lineTo(PAGE_W - MARGIN, pages.y);
  ctx.stroke();
  pages.y += 8;
}

function drawText(pages: PageSet, block: Extract<ReportBlock, { type: "text" | "note" }>) {
  const ctx = pages.ctx;
  const small = block.type === "note";
  const size = small ? 9.5 : 11.5;
  const lineHeight = small ? 12.5 : 15;
  ctx.font = font(size);
  const lines = wrapText(ctx, block.text, CONTENT_W);
  const height = lines.length * lineHeight + (small ? 14 : 4);
  pages.ensure(height);
  const c = pages.ctx;
  c.font = font(size);
  c.fillStyle = block.type === "note" || block.muted ? GRAY : INK;
  if (small) {
    pages.y += 14;
    c.strokeStyle = "#cccccc";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(MARGIN, pages.y - 6);
    c.lineTo(PAGE_W - MARGIN, pages.y - 6);
    c.stroke();
  }
  drawLines(c, lines, MARGIN, pages.y + size, lineHeight);
  pages.y += lines.length * lineHeight + 4;
}

function drawKeyValues(pages: PageSet, rows: [string, string][]) {
  const labelW = 150;
  const gap = 12;
  const valueW = CONTENT_W - labelW - gap;
  const lineHeight = 15;
  for (const [key, value] of rows) {
    if (!value.trim()) continue;
    const ctx = pages.ctx;
    ctx.font = font(11.5, true);
    const keyLines = wrapText(ctx, key, labelW);
    ctx.font = font(11.5);
    const valueLines = wrapText(ctx, value, valueW);
    const height = Math.max(keyLines.length, valueLines.length) * lineHeight + 3;
    pages.ensure(height);
    const c = pages.ctx;
    c.fillStyle = INK;
    c.font = font(11.5, true);
    drawLines(c, keyLines, MARGIN, pages.y + 11.5, lineHeight);
    c.font = font(11.5);
    drawLines(c, valueLines, MARGIN + labelW + gap, pages.y + 11.5, lineHeight);
    pages.y += height;
  }
}

function drawTable(pages: PageSet, block: Extract<ReportBlock, { type: "table" }>) {
  const size = 10.5;
  const lineHeight = 13.5;
  const pad = 5;
  const total = block.widths.reduce((sum, w) => sum + w, 0) || 1;
  const colW = block.widths.map((w) => (w / total) * CONTENT_W);
  const xs: number[] = [];
  let acc = MARGIN;
  for (const w of colW) {
    xs.push(acc);
    acc += w;
  }

  const layout = (cells: string[], bold: boolean) => {
    pages.ctx.font = font(size, bold);
    const wrapped = colW.map((w, i) => wrapText(pages.ctx, cells[i] ?? "", w - pad * 2));
    const lines = Math.max(1, ...wrapped.map((l) => l.length));
    return { wrapped, height: lines * lineHeight + pad * 2 - 2 };
  };

  const drawRow = (cells: string[], header: boolean) => {
    let { wrapped, height } = layout(cells, header);
    // A single row taller than a page cannot be kept whole: cut it.
    const maxHeight = PAGE_H - MARGIN * 2 - FOOTER_SPACE;
    if (height > maxHeight) {
      const keep = Math.floor((maxHeight - pad * 2) / lineHeight);
      wrapped = wrapped.map((l) => l.slice(0, keep));
      height = maxHeight;
    }
    return { wrapped, height };
  };

  const paintRow = (wrapped: string[][], height: number, header: boolean) => {
    const c = pages.ctx;
    if (header) {
      c.fillStyle = "#eef3ef";
      c.fillRect(MARGIN, pages.y, CONTENT_W, height);
    }
    c.strokeStyle = "#bbbbbb";
    c.lineWidth = 0.75;
    c.fillStyle = INK;
    c.font = font(size, header);
    wrapped.forEach((lines, i) => {
      const x = xs[i] ?? MARGIN;
      c.strokeRect(x, pages.y, colW[i] ?? 0, height);
      drawLines(c, lines, x + pad, pages.y + pad + size - 1, lineHeight);
    });
    pages.y += height;
  };

  const header = drawRow(block.head, true);
  pages.ensure(header.height + 40);
  paintRow(header.wrapped, header.height, true);

  for (const cells of block.rows) {
    const row = drawRow(cells, false);
    if (pages.y + row.height > PAGE_H - FOOTER_SPACE - MARGIN / 2) {
      pages.newPage();
      paintRow(header.wrapped, header.height, true); // repeat the header on the next page
    }
    paintRow(row.wrapped, row.height, false);
  }
  pages.y += 4;
}

function drawChart(pages: PageSet, block: Extract<ReportBlock, { type: "chart" }>) {
  const { points, unit } = block;
  if (points.length < 2) return;
  const H = 170;
  pages.ensure(H + 8);
  const ctx = pages.ctx;
  const left = MARGIN + 46;
  const right = PAGE_W - MARGIN - 10;
  const top = pages.y + 10;
  const bottom = pages.y + H - 24;
  const times = points.map((p) => new Date(`${p.date}T00:00:00`).getTime());
  const t0 = times[0] ?? 0;
  const t1 = times[times.length - 1] ?? t0;
  let lo = Math.min(...points.map((p) => p.v));
  let hi = Math.max(...points.map((p) => p.v));
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const x = (i: number) =>
    t1 === t0 ? (left + right) / 2 : left + (((times[i] ?? t0) - t0) / (t1 - t0)) * (right - left);
  const y = (v: number) => top + ((hi - v) / (hi - lo)) * (bottom - top);
  const fmt = (v: number) => String(Number(v.toFixed(2)));

  ctx.strokeStyle = "#999999";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();

  ctx.font = font(9.5);
  ctx.fillStyle = "#444444";
  ctx.textAlign = "right";
  ctx.fillText(fmt(hi), left - 6, top + 4);
  ctx.fillText(fmt(lo), left - 6, bottom);
  ctx.fillText(unit, left - 6, (top + bottom) / 2 + 4);
  ctx.textAlign = "left";
  ctx.fillText(points[0]?.date ?? "", left, bottom + 14);
  ctx.textAlign = "right";
  ctx.fillText(points[points.length - 1]?.date ?? "", right, bottom + 14);
  ctx.textAlign = "left";

  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(x(i), y(p.v)) : ctx.lineTo(x(i), y(p.v))));
  ctx.stroke();
  ctx.fillStyle = GREEN;
  points.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(x(i), y(p.v), 3, 0, Math.PI * 2);
    ctx.fill();
  });
  pages.y += H + 6;
}

function drawFooters(pages: PageSet, options: ReportOptions) {
  const total = pages.contexts.length;
  pages.contexts.forEach((ctx, index) => {
    ctx.font = font(9);
    ctx.fillStyle = "#777777";
    ctx.textAlign = "left";
    ctx.fillText(options.appName, MARGIN, PAGE_H - 24);
    ctx.textAlign = "right";
    ctx.fillText(
      options.pageLabel ? options.pageLabel(index + 1, total) : `${index + 1} / ${total}`,
      PAGE_W - MARGIN,
      PAGE_H - 24,
    );
    ctx.textAlign = "left";
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Could not render the page."));
        blob
          .arrayBuffer()
          .then((buffer) => resolve(new Uint8Array(buffer)))
          .catch(reject);
      },
      "image/jpeg",
      0.92,
    );
  });
}

/* ------------------------------------------------------------------ */
/* PDF container                                                       */
/* ------------------------------------------------------------------ */

export interface PdfPageImage {
  jpeg: Uint8Array;
  /** Pixel size of the JPEG. */
  width: number;
  height: number;
}

/** PDF text string for the document title: UTF-16BE in hex, so any language works. */
function pdfTextString(text: string): string {
  let hex = "FEFF";
  for (let i = 0; i < text.length; i++) hex += text.charCodeAt(i).toString(16).padStart(4, "0");
  return `<${hex}>`;
}

function pdfDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `D:${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}Z`;
}

/** Wraps full-page JPEG images into an A4 PDF file (one image per page). */
export function assemblePdf(images: PdfPageImage[], title: string, now = new Date()): Blob {
  const encoder = new TextEncoder();
  const chunks: BlobPart[] = [];
  const offsets: number[] = [];
  let position = 0;

  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    chunks.push(bytes as BlobPart);
    position += bytes.byteLength;
  };
  const object = (id: number, body: string | (() => void)) => {
    offsets[id] = position;
    push(`${id} 0 obj\n`);
    if (typeof body === "string") push(body);
    else body();
    push("\nendobj\n");
  };

  const count = images.length;
  const pageId = (i: number) => 4 + i * 3;
  const contentId = (i: number) => 5 + i * 3;
  const imageId = (i: number) => 6 + i * 3;
  const lastId = 3 + count * 3;

  push("%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(
    2,
    `<< /Type /Pages /Kids [${images.map((_, i) => `${pageId(i)} 0 R`).join(" ")}] /Count ${count} >>`,
  );
  object(
    3,
    `<< /Title ${pdfTextString(title)} /Producer (Kepatina) /Creator (Kepatina) /CreationDate (${pdfDate(now)}) >>`,
  );

  images.forEach((image, i) => {
    object(
      pageId(i),
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /XObject << /Im0 ${imageId(i)} 0 R >> >> /Contents ${contentId(i)} 0 R >>`,
    );
    const content = `q\n${PAGE_W} 0 0 ${PAGE_H} 0 0 cm\n/Im0 Do\nQ`;
    object(
      contentId(i),
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    );
    object(imageId(i), () => {
      push(
        `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} ` +
          `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.jpeg.byteLength} >>\nstream\n`,
      );
      push(image.jpeg);
      push("\nendstream");
    });
  });

  const xrefAt = position;
  let xref = `xref\n0 ${lastId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= lastId; id++) {
    xref += `${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(`trailer\n<< /Size ${lastId + 1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);

  return new Blob(chunks, { type: "application/pdf" });
}

/** Draws the report onto A4 pages and returns it as a PDF file. */
export async function createReportPdf(
  blocks: ReportBlock[],
  options: ReportOptions,
): Promise<Blob> {
  const pages = new PageSet();
  try {
    for (const block of blocks) {
      switch (block.type) {
        case "title":
          drawTitle(pages, block);
          break;
        case "heading":
          drawHeading(pages, block.text);
          break;
        case "kv":
          drawKeyValues(pages, block.rows);
          break;
        case "text":
        case "note":
          drawText(pages, block);
          break;
        case "table":
          drawTable(pages, block);
          break;
        case "chart":
          drawChart(pages, block);
          break;
      }
    }
    drawFooters(pages, options);

    const images: PdfPageImage[] = [];
    for (const canvas of pages.canvases) {
      images.push({
        jpeg: await canvasToJpeg(canvas),
        width: canvas.width,
        height: canvas.height,
      });
    }
    return assemblePdf(images, options.title);
  } finally {
    // Free the (large) canvas memory right away; matters on phones.
    for (const canvas of pages.canvases) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Saving / sharing the finished file                                  */
/* ------------------------------------------------------------------ */

export type PdfDelivery = "shared" | "downloaded" | "cancelled";

/** A file name that is safe on every system but keeps letters of any alphabet. */
export function safeFileName(name: string, extension: string): string {
  const base = name
    .replace(/[^\p{L}\p{N}._-]+/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^[_.-]+|[_.-]+$/g, "")
    .slice(0, 80);
  return `${base || "kepatina"}.${extension}`;
}

const isCancel = (error: unknown) =>
  (error as Error | undefined)?.name === "AbortError" ||
  /cancel/i.test(String((error as Error | undefined)?.message ?? ""));

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}

function browserDownload(blob: Blob, fileName: string) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

/**
 * App: writes the PDF to the cache folder and opens the system share sheet (save to Files / Drive,
 * send by e-mail or messenger). Phone browser: Web Share. Computer: normal download.
 */
export async function deliverPdf(
  pdf: Blob,
  fileName: string,
  title: string,
): Promise<PdfDelivery> {
  if (isNative()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    try {
      await Filesystem.rmdir({ path: "kepatina-pdf", directory: Directory.Cache, recursive: true });
    } catch {
      /* nothing to clean */
    }
    const path = `kepatina-pdf/${fileName}`;
    await Filesystem.writeFile({
      path,
      data: await blobToBase64(pdf),
      directory: Directory.Cache,
      recursive: true,
    });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
    try {
      await Share.share({ title, files: [uri], dialogTitle: title });
    } catch (error) {
      if (isCancel(error)) return "cancelled";
      throw error;
    }
    return "shared";
  }

  const touch =
    typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;
  const file = new File([pdf], fileName, { type: "application/pdf" });
  if (touch && typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (error) {
      if (isCancel(error)) return "cancelled";
      /* fall through to a normal download */
    }
  }
  browserDownload(pdf, fileName);
  return "downloaded";
}
