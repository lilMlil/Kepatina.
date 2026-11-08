import type { Dict } from "./i18n";
import { petAge, type Pet } from "./reminders";

export type PassportMissing =
  "breed" | "birthDate" | "sex" | "chipNumber" | "ownerName" | "ownerPhone" | "vetPhone";

interface OwnerLike {
  name: string;
  phone?: string | undefined;
}

const blank = (v: string | undefined | null) => !v || !v.trim();

/** Which key passport fields are still empty (what a vet usually asks for first). */
export function passportMissing(pet: Pet, owner: OwnerLike): PassportMissing[] {
  const out: PassportMissing[] = [];
  if (blank(pet.breed)) out.push("breed");
  if (blank(pet.birthDate)) out.push("birthDate");
  if (!pet.sex) out.push("sex");
  if (blank(pet.chipNumber)) out.push("chipNumber");
  if (blank(owner.name)) out.push("ownerName");
  if (blank(owner.phone)) out.push("ownerPhone");
  if (blank(pet.vetPhone)) out.push("vetPhone");
  return out;
}

/** `tel:` link that keeps only digits and a leading plus. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** "3 y 2 mo" style age text, empty when the birth date is missing. */
export function ageText(t: Dict, birthDate?: string): string {
  const a = petAge(birthDate);
  if (!a) return "";
  const parts = [
    a.years ? `${a.years} ${t.ageY}` : "",
    a.months ? `${a.months} ${t.ageM}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : t.ageLess;
}

export interface PassportSection {
  title: string;
  lines: string[];
}

/** Plain-text passport for sharing by message or e-mail. Empty values are skipped. */
export function passportText(
  title: string,
  rows: [string, string][],
  sections: PassportSection[],
  footer?: string,
): string {
  const out: string[] = [title, ""];
  for (const [k, v] of rows) if (v.trim()) out.push(`${k}: ${v.trim()}`);
  for (const s of sections) {
    if (!s.lines.length) continue;
    out.push("", s.title, ...s.lines.map((l) => `• ${l}`));
  }
  if (footer) out.push("", footer);
  return out.join("\n");
}
