import { describe, expect, it } from "vitest";
import { decodeTag, encodeTag } from "@/lib/lost-tag";
import {
  courseDay,
  doseKey,
  isFinished,
  nextDoses,
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

describe("medication doses on the home reminders", () => {
  const keys = (cs: MedCourse[], today: string, pet?: string) =>
    nextDoses(cs, today, pet).map((d) => `${d.name}|${d.key}`);

  it("shows the first dose that is not done yet, then moves on after it is ticked", () => {
    expect(keys([course], "2026-11-01")).toEqual([`A|${doseKey("2026-11-01", "08:00")}`]);
    const first = { ...course, done: { [doseKey("2026-11-01", "08:00")]: true } };
    expect(keys([first], "2026-11-01")).toEqual([`A|${doseKey("2026-11-01", "20:00")}`]);
  });
  it("keeps a missed dose visible until it is ticked", () => {
    expect(keys([course], "2026-11-02")).toEqual([`A|${doseKey("2026-11-01", "08:00")}`]);
  });
  it("hides finished courses and fully done courses", () => {
    expect(keys([course], "2026-11-04")).toEqual([]);
    const all: Record<string, boolean> = {};
    for (const d of ["2026-11-01", "2026-11-02", "2026-11-03"])
      for (const t of ["08:00", "20:00"]) all[doseKey(d, t)] = true;
    expect(keys([{ ...course, done: all }], "2026-11-02")).toEqual([]);
  });
  it("filters by pet and sorts by time, with a real local Date", () => {
    const other: MedCourse = { ...course, id: "d", petId: "q", name: "B", startDate: "2026-11-02" };
    expect(keys([course, other], "2026-11-01", "q")).toEqual([
      `B|${doseKey("2026-11-02", "08:00")}`,
    ]);
    expect(nextDoses([other, course], "2026-11-01").map((d) => d.name)).toEqual(["A", "B"]);
    const at = nextDoses([course], "2026-11-01")[0]!.at;
    expect([at.getHours(), at.getMinutes()]).toEqual([8, 0]);
  });
});
