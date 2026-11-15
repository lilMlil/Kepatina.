import { describe, expect, it } from "vitest";
import { dicts } from "@/lib/i18n";
import {
  chartValue,
  dueStatus,
  formatWeight,
  formatWeightDelta,
  isSuperseded,
  latestWeight,
  parseNumber,
  removeHealthFor,
  sortByDateAsc,
  sortByDateDesc,
} from "@/lib/health";

describe("health journal helpers", () => {
  it("parses decimals with a comma and rejects junk", () => {
    expect(parseNumber("12,5")).toBe(12.5);
    expect(parseNumber(" 3.2 ")).toBe(3.2);
    expect(parseNumber("")).toBeNaN();
    expect(parseNumber("-1")).toBeNaN();
    expect(parseNumber("abc")).toBeNaN();
  });
  it("shows birds in grams and other pets in kilograms", () => {
    expect(formatWeight(0.045, "Putns")).toBe("45 g");
    expect(formatWeight(4.2, "Kaķis")).toBe("4.2 kg");
    expect(chartValue(0.0452, "Putns")).toBe(45);
    expect(formatWeightDelta(0.4, "Suns")).toBe("+0.4 kg");
    expect(formatWeightDelta(-0.015, "Putns")).toBe("−15 g");
    expect(formatWeightDelta(0, "Suns")).toBe("0 kg");
  });
  it("shows reptiles and fish in grams and guinea pigs in kilograms", () => {
    expect(formatWeight(0.35, "Rāpuļi")).toBe("350 g");
    expect(formatWeight(0.012, "Zivtiņas")).toBe("12 g");
    expect(formatWeight(1.05, "Jūrascūciņa")).toBe("1.05 kg");
    expect(chartValue(0.35, "Rāpuļi")).toBe(350);
  });
  it("sorts by date and finds the latest weight", () => {
    const w = [
      { id: "1", petId: "a", date: "2026-03-01", kg: 5 },
      { id: "2", petId: "a", date: "2026-05-01", kg: 6 },
      { id: "3", petId: "b", date: "2026-09-01", kg: 1 },
    ];
    expect(sortByDateAsc(w).map((x) => x.id)).toEqual(["1", "2", "3"]);
    expect(sortByDateDesc(w).map((x) => x.id)).toEqual(["3", "2", "1"]);
    expect(latestWeight(w, "a")?.kg).toBe(6);
    expect(latestWeight(w, "zzz")).toBeUndefined();
  });
  it("does not flag a repeated vaccine's old due date as overdue", () => {
    const old = { id: "1", petId: "a", name: "Rabies", date: "2025-01-01", nextDue: "2026-01-01" };
    const again = {
      id: "2",
      petId: "a",
      name: "rabies ",
      date: "2026-01-02",
      nextDue: "2027-01-02",
    };
    const all = [old, again];
    expect(isSuperseded(old, all)).toBe(true);
    expect(dueStatus(old, all, "2026-06-01")).toBeNull();
    expect(dueStatus(again, all, "2026-06-01")).toBe("upcoming");
    expect(
      dueStatus(
        { ...again, nextDue: "2026-02-01" },
        [{ ...again, nextDue: "2026-02-01" }],
        "2026-06-01",
      ),
    ).toBe("overdue");
  });
  it("removes only the given pet's records", () => {
    const items = [{ petId: "a" }, { petId: "b" }, { petId: "a" }];
    expect(removeHealthFor(items, "a")).toEqual([{ petId: "b" }]);
  });
  it("has the health strings in every language", () => {
    for (const lang of ["lv", "en", "ru", "fr"] as const) {
      expect(dicts[lang].hTitle.length).toBeGreaterThan(0);
    }
  });
});
