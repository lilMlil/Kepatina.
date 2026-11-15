export type Species =
  | "Suns"
  | "Kaķis"
  | "Trusis"
  | "Putns"
  | "Kāmis"
  | "Jūrascūciņa"
  | "Rāpuļi"
  | "Zivtiņas";

export interface Pet {
  id: string;
  name: string;
  species: Species;
  photo?: string | null;
  createdAt: string;
  breed?: string;
  birthDate?: string;
  weightKg?: string;
  chipNumber?: string;
  notes?: string;
  sex?: "m" | "f" | undefined;
  vetPhone?: string;
  vetName?: string;
  color?: string;
  /** true = sterilised / neutered, false = not, undefined = unknown */
  neutered?: boolean | undefined;
}

export interface Reminder {
  id: string;
  petId: string;
  title: string;
  category: string;
  dueAt: string;
  repeatDays: number | null;
  notifiedFor?: string | null;
}

/** Next due date strictly after `now` for a repeating reminder. */
export function nextDueDate(dueAt: string, repeatDays: number, now = Date.now()): Date {
  const d = new Date(dueAt);
  do {
    d.setDate(d.getDate() + repeatDays);
  } while (d.getTime() <= now);
  return d;
}

/** Remove a pet and every reminder that belongs to it. */
export function removePetFrom(pets: Pet[], reminders: Reminder[], petId: string) {
  return {
    pets: pets.filter((p) => p.id !== petId),
    reminders: reminders.filter((r) => r.petId !== petId),
  };
}

/** Reminders that are due and have not been notified yet for their current due date. */
export function dueForNotification(reminders: Reminder[], now = Date.now()) {
  return reminders.filter((r) => new Date(r.dueAt).getTime() <= now && r.notifiedFor !== r.dueAt);
}

/** Pet age from a YYYY-MM-DD birth date; null when missing, invalid or in the future. */
export function petAge(
  birthDate: string | undefined,
  now = new Date(),
): { years: number; months: number } | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime()) || b.getTime() > now.getTime()) return null;
  let total = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) total -= 1;
  total = Math.max(0, total);
  return { years: Math.floor(total / 12), months: total % 12 };
}
