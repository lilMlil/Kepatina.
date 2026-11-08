import { describe, expect, it } from "vitest";
import { dueForNotification, nextDueDate, petAge, removePetFrom } from "@/lib/reminders";

describe("pet & reminder rules", () => {
  it("deleting a pet removes it and its reminders", () => {
    const pets = [
      { id: "a", name: "Poga", species: "Suns" as const, createdAt: "" },
      { id: "b", name: "Mice", species: "Kaķis" as const, createdAt: "" },
    ];
    const rem = [
      { id: "r1", petId: "a", title: "x", category: "c", dueAt: "", repeatDays: null },
      { id: "r2", petId: "b", title: "y", category: "c", dueAt: "", repeatDays: null },
    ];
    const out = removePetFrom(pets, rem, "a");
    expect(out.pets.map((p) => p.id)).toEqual(["b"]);
    expect(out.reminders.map((r) => r.id)).toEqual(["r2"]);
  });
  it("repeating reminder moves to next future date", () => {
    const now = new Date("2026-10-31T10:00:00Z").getTime();
    expect(nextDueDate("2026-10-01T10:00:00Z", 30, now).toISOString()).toBe(
      "2026-11-30T10:00:00.000Z",
    );
  });
  it("due reminder notifies only once per due date", () => {
    const r = {
      id: "r",
      petId: "a",
      title: "t",
      category: "c",
      dueAt: "2026-01-01T00:00:00Z",
      repeatDays: null,
    };
    expect(dueForNotification([r]).length).toBe(1);
    expect(dueForNotification([{ ...r, notifiedFor: r.dueAt }]).length).toBe(0);
  });
  it("computes pet age in years and months", () => {
    const now = new Date("2026-11-01T12:00:00");
    expect(petAge("2024-08-15", now)).toEqual({ years: 2, months: 2 });
    expect(petAge("2026-10-20", now)).toEqual({ years: 0, months: 0 });
    expect(petAge("2027-01-01", now)).toBeNull();
    expect(petAge(undefined, now)).toBeNull();
  });
});
