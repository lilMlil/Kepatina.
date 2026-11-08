import { describe, it, expect } from "vitest";
import { parseExpenseAmount, expenseTotal, type Expense } from "@/lib/expenses";
import { seasonFor, tipsFor } from "@/lib/seasonal";
import { planNotifications, notificationId } from "@/lib/notify-plan";
import type { MedCourse } from "@/lib/meds";
describe("Expenses", () => {
  it("stores exact cents and accepts comma decimals", () => {
    expect(parseExpenseAmount("12,50")).toBe(1250);
    expect(parseExpenseAmount("0.01")).toBe(1);
    expect(parseExpenseAmount("0")).toBeNull();
    expect(parseExpenseAmount("1.234")).toBeNull();
  });
  it("adds without floating point errors", () => {
    expect(expenseTotal([{ amountCents: 10 }, { amountCents: 20 }] as Expense[])).toBe(30);
  });
});
describe("Seasonal care", () => {
  it("selects all northern seasons including December", () => {
    expect([0, 3, 6, 9, 11].map((m) => seasonFor(new Date(2026, m, 15)))).toEqual([0, 1, 2, 3, 0]);
  });
  it("does not show dog pavement advice for indoor pets", () => {
    expect(tipsFor(2, "Suns")).toHaveLength(2);
    expect(tipsFor(2, "Kāmis")).toHaveLength(1);
    expect(tipsFor(2, "Putns")).toHaveLength(1);
  });
});
describe("Local notification plan", () => {
  const med: MedCourse = {
    id: "m",
    petId: "p",
    name: "Medicine",
    dose: "1",
    times: ["08:00", "20:00"],
    startDate: "2026-11-02",
    days: 3,
    done: {},
  };
  const now = new Date(2026, 10, 2, 7, 0, 0);
  it("plans both daily doses for every course day, in time order", () => {
    const plan = planNotifications({ meds: [med] }, now);
    expect(plan.map((p) => p.key)).toEqual([
      "m:m:2026-11-02|08:00",
      "m:m:2026-11-02|20:00",
      "m:m:2026-11-03|08:00",
      "m:m:2026-11-03|20:00",
      "m:m:2026-11-04|08:00",
      "m:m:2026-11-04|20:00",
    ]);
  });
  it("skips done doses, past doses and finished courses", () => {
    const done = planNotifications({ meds: [{ ...med, done: { "2026-11-02|08:00": true } }] }, now);
    expect(done[0]?.key).toBe("m:m:2026-11-02|20:00");
    expect(planNotifications({ meds: [med] }, new Date(2026, 10, 6, 7, 0))).toEqual([]);
  });
  it("plans future reminders and repeats, never past ones", () => {
    const reminder = {
      id: "r",
      petId: "p",
      title: "Vet",
      category: "",
      dueAt: new Date(2026, 10, 3, 9, 0).toISOString(),
      repeatDays: 7,
    };
    const plan = planNotifications({ reminders: [reminder] }, now);
    expect(plan).toHaveLength(5);
    expect(plan[0]?.at.getTime()).toBe(new Date(2026, 10, 3, 9, 0).getTime());
    expect(planNotifications({ reminders: [reminder] }, new Date(2026, 10, 4))[0]?.at.getDate()).toBe(10);
  });
  it("never plans more than the iOS limit and gives stable ids", () => {
    const many = Array.from({ length: 100 }, (_, i) => ({
      id: `r${i}`,
      petId: "p",
      title: "x",
      category: "",
      dueAt: new Date(2026, 10, 3, 9, i % 60).toISOString(),
      repeatDays: null,
    }));
    expect(planNotifications({ reminders: many }, now)).toHaveLength(60);
    expect(notificationId("a")).toBe(notificationId("a"));
    expect(notificationId("a")).toBeGreaterThan(0);
  });
});
