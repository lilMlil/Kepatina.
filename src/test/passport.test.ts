import { describe, expect, it } from "vitest";
import { dicts } from "@/lib/i18n";
import { passportMissing, passportText, telHref } from "@/lib/passport";
import type { Pet } from "@/lib/reminders";

const pet: Pet = { id: "1", name: "Rekss", species: "Suns", createdAt: "2026-01-01T00:00:00Z" };

describe("pet passport helpers", () => {
  it("lists every key field as missing for a bare profile", () => {
    expect(passportMissing(pet, { name: "" })).toEqual([
      "breed",
      "birthDate",
      "sex",
      "chipNumber",
      "ownerName",
      "ownerPhone",
      "vetPhone",
    ]);
  });
  it("stops listing fields once they are filled in", () => {
    const full: Pet = {
      ...pet,
      breed: "Labrador",
      birthDate: "2020-05-01",
      sex: "m",
      chipNumber: "9400001",
      vetPhone: "+371 20000000",
    };
    expect(passportMissing(full, { name: "Anna", phone: "+371 29999999" })).toEqual([]);
    expect(passportMissing({ ...full, breed: "  " }, { name: "Anna", phone: "1" })).toEqual([
      "breed",
    ]);
  });
  it("builds a call link with digits and plus only", () => {
    expect(telHref("+371 2000-0000")).toBe("tel:+37120000000");
  });
  it("builds a share text without empty rows or empty sections", () => {
    const text = passportText(
      "Pase",
      [
        ["Vārds", "Rekss"],
        ["Šķirne", " "],
      ],
      [
        { title: "Potes", lines: ["2026-01-01 — DHPPi"] },
        { title: "Vizītes", lines: [] },
      ],
      "Piezīme",
    );
    expect(text).toBe("Pase\n\nVārds: Rekss\n\nPotes\n• 2026-01-01 — DHPPi\n\nPiezīme");
  });
  it("has passport strings in every language", () => {
    for (const lang of ["lv", "en", "ru", "fr"] as const) {
      expect(dicts[lang].ppTitle.trim().length).toBeGreaterThan(0);
      expect(dicts[lang].ppDisclaimer.trim().length).toBeGreaterThan(0);
    }
  });
});
