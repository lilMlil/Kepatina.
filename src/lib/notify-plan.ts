import type { Pet, Reminder } from "./reminders";
import { courseDay, doseKey, localDate, type MedCourse } from "./meds";

export interface PlanState {
  pets?: Pet[];
  reminders?: Reminder[];
  meds?: MedCourse[];
}

export interface PlannedNotification {
  /** Stable key, e.g. `r:<id>:<iso>` or `m:<id>:<date>|<time>` */
  key: string;
  at: Date;
  body: string;
}

/** iOS keeps at most 64 pending local notifications, so we always plan only the nearest ones. */
export const MAX_PLANNED = 60;
const HORIZON_DAYS = 30;

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Upcoming notifications for reminders (and their repeats) and medication doses.
 * Runs entirely on the device — no server is involved.
 */
export function planNotifications(
  state: PlanState,
  now = new Date(),
  limit = MAX_PLANNED,
): PlannedNotification[] {
  const out: PlannedNotification[] = [];
  const horizon = addDays(now, HORIZON_DAYS).getTime();
  const petName = (id: string) => state.pets?.find((p) => p.id === id)?.name ?? "";

  for (const r of state.reminders ?? []) {
    let at = new Date(r.dueAt);
    if (Number.isNaN(at.getTime())) continue;
    let guard = 0;
    while (guard++ < 60) {
      if (at.getTime() > now.getTime() && at.getTime() <= horizon)
        out.push({
          key: `r:${r.id}:${at.toISOString()}`,
          at: new Date(at),
          body: `${petName(r.petId)}: ${r.title}`.replace(/^: /, ""),
        });
      if (!r.repeatDays || r.repeatDays < 1) break;
      at = addDays(at, r.repeatDays);
      if (at.getTime() > horizon) break;
    }
  }

  for (const m of state.meds ?? []) {
    for (let i = 0; i <= HORIZON_DAYS; i++) {
      const day = addDays(now, i);
      const date = localDate(day);
      if (!courseDay(m, date)) continue;
      for (const time of m.times) {
        const [h = 0, min = 0] = time.split(":").map(Number);
        const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, min, 0, 0);
        if (at.getTime() <= now.getTime() || m.done[doseKey(date, time)]) continue;
        out.push({
          key: `m:${m.id}:${doseKey(date, time)}`,
          at,
          body: `${petName(m.petId)}: ${m.name} ${m.dose} · ${time}`.replace(/^: /, ""),
        });
      }
    }
  }

  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, limit);
}

/** Small stable positive integer id for a notification key (required by the native API). */
export function notificationId(key: string): number {
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  return (Math.abs(h) % 2_000_000_000) + 1;
}
