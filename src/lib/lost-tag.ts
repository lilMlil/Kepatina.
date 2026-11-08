import type { Lang } from "./i18n";

/** Everything a finder sees. Stored inside the QR link itself — no server needed. */
export interface TagData {
  n: string; // pet name
  s?: string | undefined; // species label
  c?: string | undefined; // colour / markings
  o?: string | undefined; // owner name
  p?: string | undefined; // owner phone
  v?: string | undefined; // vet phone
  m?: string | undefined; // note (allergies, reward…)
  l?: Lang | undefined;
}

function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b + "=".repeat((4 - (b.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
}

export function encodeTag(d: TagData): string {
  const clean = Object.fromEntries(
    Object.entries(d)
      .filter(([, v]) => typeof v === "string" && v.trim())
      .map(([k, v]) => [k, (v as string).trim()]),
  );
  return b64urlEncode(JSON.stringify(clean));
}

export function decodeTag(s: string | undefined | null): TagData | null {
  if (!s) return null;
  try {
    const d = JSON.parse(b64urlDecode(s)) as TagData;
    return d && typeof d.n === "string" && d.n ? d : null;
  } catch {
    return null;
  }
}
