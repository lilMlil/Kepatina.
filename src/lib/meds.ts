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

/** One upcoming (or overdue) dose, shaped like a reminder for the home screen. */
export interface CourseDose {
  courseId: string;
  petId: string;
  name: string;
  dose: string;
  /** Same key as `doseKey`, unique within the course */
  key: string;
  at: Date;
}

function doseDate(date: string, time: string): Date {
  const [y = 0, m = 1, d = 1] = date.split("-").map(Number);
  const [h = 0, min = 0] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}

/** Earliest dose of the course that is not marked done yet, or null when all are done. */
function firstUndoneDose(c: MedCourse): { date: string; time: string } | null {
  const days = Math.max(1, c.days);
  const times = [...c.times].sort();
  for (let i = 0; i < days; i++) {
    const date = addDays(c.startDate, i);
    for (const time of times) if (!c.done[doseKey(date, time)]) return { date, time };
  }
  return null;
}

/**
 * For every unfinished course: its earliest dose that is not done yet (overdue ones included),
 * sorted by time. Optionally only for one pet. Works like the reminders list: a done dose
 * moves the card on to the next one.
 */
export function nextDoses(
  courses: MedCourse[],
  today = localDate(),
  petId?: string | null,
): CourseDose[] {
  const out: CourseDose[] = [];
  for (const c of courses) {
    if (isFinished(c, today) || (petId && c.petId !== petId)) continue;
    const next = firstUndoneDose(c);
    if (!next) continue;
    out.push({
      courseId: c.id,
      petId: c.petId,
      name: c.name,
      dose: c.dose,
      key: doseKey(next.date, next.time),
      at: doseDate(next.date, next.time),
    });
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
