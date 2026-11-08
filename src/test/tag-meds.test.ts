import { describe, expect, it } from "vitest";
import { decodeTag, encodeTag } from "@/lib/lost-tag";
import {
  courseDay,
  doseKey,
  isFinished,
  normalizeTimes,
  progress,
  type MedCourse,
} from "@/lib/meds";

describe("lost-pet QR tag", () => {
  it("round-trips owner contacts, including non-Latin text", () => {
    const d = { n: "Рекс", o: "Anna Bērziņa", p: "+371 29999999", m: "Аллергия" };
    expect(decodeTag(encodeTag(d))).toEqual(d);
  });
  it("drops empty fields and rejects garbage", () => {
    expect(decodeTag(encodeTag({ n: "Rekss", p: " ", v: "" }))).toEqual({ n: "Rekss" });
    expect(decodeTag("not-valid")).toBeNull();
  });
});

const course: MedCourse = {
  id: "c",
  petId: "p",
  name: "A",
  dose: "",
  times: ["08:00", "20:00"],
  startDate: "2026-11-01",
  days: 3,
  done: {},
};

describe("medication courses", () => {
  it("counts every daily dose across the course", () => {
    expect(progress(course)).toEqual({ done: 0, total: 6 });
    expect(progress({ ...course, done: { [doseKey("2026-11-02", "20:00")]: true } })).toEqual({
      done: 1,
      total: 6,
    });
  });
  it("knows which day of the course it is and when it ends", () => {
    expect(courseDay(course, "2026-11-01")).toBe(1);
    expect(courseDay(course, "2026-11-03")).toBe(3);
    expect(courseDay(course, "2026-11-04")).toBeNull();
    expect(isFinished(course, "2026-11-03")).toBe(false);
    expect(isFinished(course, "2026-11-04")).toBe(true);
  });
  it("sorts and de-duplicates dose times", () => {
    expect(normalizeTimes(["20:00", "08:00", "08:00", ""])).toEqual(["08:00", "20:00"]);
  });
});
