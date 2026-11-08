import { describe, expect, it } from "vitest";
import { dicts } from "@/lib/i18n";

describe("Supported languages", () => {
  it("provides Latvian, English, Russian and French dictionaries", () => {
    expect(Object.keys(dicts).sort()).toEqual(["en", "fr", "lv", "ru"]);
  });
  it.each(["ru", "fr"] as const)("provides every existing interface entry in %s", (lang) => {
    expect(Object.keys(dicts[lang]).sort()).toEqual(Object.keys(dicts.lv).sort());
    expect(
      Object.values(dicts[lang]).every((value) =>
        (Array.isArray(value) ? value : [value]).every((entry) => entry.trim().length > 0),
      ),
    ).toBe(true);
  });
});
