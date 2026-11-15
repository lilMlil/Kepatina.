import type { Species } from "./reminders";

/** One weight measurement. `kg` is always stored in kilograms (birds are shown/entered in grams). */
export interface WeightEntry {
  id: string;
  petId: string;
  date: string; // YYYY-MM-DD
  kg: number;
}

export interface VaccineEntry {
  id: string;
  petId: string;
  name: string;
  date: string; // YYYY-MM-DD, when it was given
  nextDue?: string | undefined; // YYYY-MM-DD
  note?: string | undefined;
}

export interface VisitEntry {
  id: string;
  petId: string;
  date: string; // YYYY-MM-DD
  reason: string;
  clinic?: string | undefined;
  notes?: string | undefined;
}

/** Common vaccine names offered as quick picks (international abbreviations, so they work in every language). */
export const VACCINE_SUGGESTIONS: Record<Species, string[]> = {
  Suns: ["DHPPi", "Rabies", "Leptospirosis"],
  Kaķis: ["FVRCP", "Rabies", "FeLV"],
  Trusis: ["Myxomatosis", "RHD (VHD)"],
  Putns: ["Polyomavirus", "PMV (Newcastle)"],
  Kāmis: [],
  Jūrascūciņa: [],
  Rāpuļi: [],
  Zivtiņas: [],
};

export const todayISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Newest first. Stable for equal dates (later-added entries first). */
export function sortByDateDesc<T extends { date: string }>(items: T[]): T[] {
  return items
    .map((x, i) => ({ x, i }))
    .sort((a, b) => b.x.date.localeCompare(a.x.date) || b.i - a.i)
    .map(({ x }) => x);
}

/** Oldest first, for charts. */
export function sortByDateAsc<T extends { date: string }>(items: T[]): T[] {
  return items
    .map((x, i) => ({ x, i }))
    .sort((a, b) => a.x.date.localeCompare(b.x.date) || a.i - b.i)
    .map(({ x }) => x);
}

/** Latest weight (by date) for a pet, or undefined. */
export function latestWeight(weights: WeightEntry[], petId: string): WeightEntry | undefined {
  return sortByDateDesc(weights.filter((w) => w.petId === petId))[0];
}

/** Parse "12,5" or "12.5" typed by a user; NaN when not a positive finite number. */
export function parseNumber(raw: string): number {
  const n = Number(raw.trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : NaN;
}

/** Small animals (birds, hamsters, reptiles, fish) are weighed in grams. Guinea pigs use kg. */
export const usesGrams = (species: Species) =>
  species === "Putns" || species === "Kāmis" || species === "Rāpuļi" || species === "Zivtiņas";

/** kg -> display string. Birds, hamsters, reptiles and fish are shown in grams, everything else in kg. */
export function formatWeight(kg: number, species: Species): string {
  if (usesGrams(species)) return `${Math.round(kg * 1000)} g`;
  return `${Number(kg.toFixed(2))} kg`;
}

/** Signed difference between two weights, formatted in the pet's unit ("+0.4 kg", "-15 g"). */
export function formatWeightDelta(deltaKg: number, species: Species): string {
  const sign = deltaKg > 0 ? "+" : deltaKg < 0 ? "−" : "";
  return `${sign}${formatWeight(Math.abs(deltaKg), species)}`;
}

/** Number shown on the chart axis/tooltip, in the pet's unit. */
export function chartValue(kg: number, species: Species): number {
  return usesGrams(species) ? Math.round(kg * 1000) : Number(kg.toFixed(2));
}

/** Format a YYYY-MM-DD date in the given locale without timezone shifts. */
export function formatDate(date: string, locale: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Is there a newer entry for the same vaccine (same pet, case-insensitive name)?
 * Used so an old "next due" date is not shown as overdue after the vaccine was repeated.
 */
export function isSuperseded(v: VaccineEntry, all: VaccineEntry[]): boolean {
  const key = v.name.trim().toLowerCase();
  return all.some(
    (o) =>
      o.id !== v.id &&
      o.petId === v.petId &&
      o.name.trim().toLowerCase() === key &&
      o.date > v.date,
  );
}

export type DueStatus = "overdue" | "upcoming" | null;

export function dueStatus(v: VaccineEntry, all: VaccineEntry[], today = todayISO()): DueStatus {
  if (!v.nextDue || isSuperseded(v, all)) return null;
  return v.nextDue < today ? "overdue" : "upcoming";
}

/** Drop every health record that belongs to a pet. */
export function removeHealthFor<T extends { petId: string }>(items: T[], petId: string): T[] {
  return items.filter((i) => i.petId !== petId);
}
