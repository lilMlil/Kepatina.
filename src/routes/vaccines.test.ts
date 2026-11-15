import { describe, expect, it } from "vitest";
import { vaccinationPlan } from "@/lib/vaccine-schedule";
import { SPECIES } from "@/lib/store";
import foodData1 from "@/data/food-safety.json";
import foodData2 from "@/data/food-safety-2.json";
import foodData3 from "@/data/food-safety-3.json";
import foodData4 from "@/data/food-safety-4.json";

const foodData = [...foodData1, ...foodData2, ...foodData3, ...foodData4];

describe("Vaccination schedule", () => {
  it("schedules a puppy's first DHPPi dose at 8 weeks", () => {
    const plan = vaccinationPlan("Suns", "2026-01-01", [], "2026-01-10");
    const first = plan.find((r) => r.itemId === "dhpp" && r.dose === 1);
    expect(first?.due).toBe("2026-02-26");
    expect(first?.status).toBe("upcoming");
  });
  it("marks a dose done when the journal has a matching vaccine", () => {
    const plan = vaccinationPlan(
      "Suns",
      "2026-01-01",
      [{ id: "1", petId: "p", name: "DHPPi", date: "2026-02-27" }],
      "2026-03-01",
    );
    expect(plan.find((r) => r.itemId === "dhpp" && r.dose === 1)?.status).toBe("done");
  });
  it("flags a missed dose as overdue", () => {
    const plan = vaccinationPlan("Kaķis", "2025-01-01", [], "2026-01-01");
    expect(plan.find((r) => r.itemId === "fvrcp" && r.dose === 1)?.status).toBe("overdue");
  });
  it("schedules the rabbit myxomatosis/RHD vaccine yearly after the 5-week dose", () => {
    const plan = vaccinationPlan(
      "Trusis",
      "2026-01-01",
      [{ id: "1", petId: "p", name: "Myxo-RHD", date: "2026-02-05" }],
      "2026-03-01",
    );
    expect(plan.find((r) => r.dose === 2)?.due).toBe("2027-02-05");
  });
  it("has no routine vaccines for hamsters", () => {
    expect(vaccinationPlan("Kāmis", "2026-01-01", [], "2026-03-01")).toEqual([]);
  });
  it("has no routine vaccines for guinea pigs, reptiles and fish", () => {
    for (const s of ["Jūrascūciņa", "Rāpuļi", "Zivtiņas"] as const)
      expect(vaccinationPlan(s, "2026-01-01", [], "2026-03-01")).toEqual([]);
  });
});

describe("Food safety data", () => {
  it("covers every selectable species", () => {
    for (const s of SPECIES)
      expect(
        (foodData as { animal: string }[]).filter((e) => e.animal === s).length,
      ).toBeGreaterThan(40);
  });
});
