export interface MedCourse {
  id: string;
  petId: string;
  name: string;
  dose: string;
  /** Daily times, "HH:MM" */
  times: string[];
  /** First day, "YYYY-MM-DD" */
  startDate: string;
  /** Course length in days */
  days: number;
  /** Doses marked done, key `${date}|${time}` */
  done: Record<string, boolean>;
}

export const doseKey = (date: string, time: string) => `${date}|${time}`;

export function localDate(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function addDays(date: string, n: number): string {
  const [y = 0, m = 1, d = 1] = date.split("-").map(Number);
  return localDate(new Date(y, m - 1, d + n));
}

export function courseEnd(c: MedCourse): string {
  return addDays(c.startDate, Math.max(1, c.days) - 1);
}

/** Day number (1-based) of `date` within the course, or null if outside it. */
export function courseDay(c: MedCourse, date: string): number | null {
  if (date < c.startDate || date > courseEnd(c)) return null;
  let n = 1;
  let cur = c.startDate;
  while (cur < date) {
    cur = addDays(cur, 1);
    n++;
  }
  return n;
}

export function normalizeTimes(times: string[]): string[] {
  return [...new Set(times.filter((t) => /^\d{2}:\d{2}$/.test(t)))].sort();
}

export function progress(c: MedCourse): { done: number; total: number } {
  const total = Math.max(1, c.days) * c.times.length;
  let done = 0;
  for (let i = 0; i < Math.max(1, c.days); i++) {
    const d = addDays(c.startDate, i);
    for (const t of c.times) if (c.done[doseKey(d, t)]) done++;
  }
  return { done, total };
}

export function isFinished(c: MedCourse, today = localDate()): boolean {
  return today > courseEnd(c);
}
