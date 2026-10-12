import { describe, expect, it } from "vitest";
import { planDay } from "./availability";
import {
  addDays,
  isValidDateString,
  minutesToTime,
  timeToMinutes,
  toWall,
  wallToUtc,
} from "./time";

const OPEN = 11 * 60; // 11:00
const CLOSE = 21 * 60; // 21:00
const LUNCH = [{ startMin: 15 * 60, endMin: 16 * 60 }];

describe("planDay", () => {
  it("builds a 15-minute grid for a 45-minute service", () => {
    const slots = planDay({
      openMin: OPEN,
      closeMin: CLOSE,
      breaks: [],
      busy: [],
      totalDurationMin: 45,
      stepMin: 15,
      earliestStartMin: null,
    });
    expect(slots[0]).toBe("11:00");
    expect(slots[slots.length - 1]).toBe("20:15");
    expect(slots).toHaveLength(38);
  });

  it("excludes starts that overlap lunch", () => {
    const slots = planDay({
      openMin: OPEN,
      closeMin: CLOSE,
      breaks: LUNCH,
      busy: [],
      totalDurationMin: 45,
      stepMin: 15,
      earliestStartMin: null,
    });
    expect(slots).not.toContain("14:30"); // ends 15:15
    expect(slots).not.toContain("15:00");
    expect(slots).not.toContain("15:45"); // ends 16:30
    expect(slots).toContain("14:15"); // ends exactly 15:00
    expect(slots).toContain("16:00");
  });

  it("fits long services before closing time", () => {
    const slots = planDay({
      openMin: OPEN,
      closeMin: CLOSE,
      breaks: LUNCH,
      busy: [],
      totalDurationMin: 90,
      stepMin: 15,
      earliestStartMin: null,
    });
    expect(slots[slots.length - 1]).toBe("19:30");
    expect(slots).toContain("16:00");
    expect(slots).not.toContain("14:00"); // ends 15:30, hits lunch
  });

  it("respects the earliest start bound (today + min_notice)", () => {
    const slots = planDay({
      openMin: OPEN,
      closeMin: CLOSE,
      breaks: [],
      busy: [],
      totalDurationMin: 45,
      stepMin: 15,
      earliestStartMin: 800, // 13:20
    });
    expect(slots[0]).toBe("13:30");
  });

  it("excludes starts overlapping an existing booking", () => {
    const slots = planDay({
      openMin: OPEN,
      closeMin: CLOSE,
      breaks: [],
      busy: [{ startMin: OPEN, endMin: OPEN + 45 }],
      totalDurationMin: 45,
      stepMin: 15,
      earliestStartMin: null,
    });
    expect(slots).not.toContain("11:00");
    expect(slots).not.toContain("11:15");
    expect(slots).not.toContain("11:30");
    expect(slots[0]).toBe("11:45");
  });

  it("returns no slots when the service does not fit the day", () => {
    expect(
      planDay({
        openMin: OPEN,
        closeMin: CLOSE,
        breaks: [],
        busy: [],
        totalDurationMin: 700,
        stepMin: 15,
        earliestStartMin: null,
      }),
    ).toEqual([]);
  });

  it("rejects degenerate input", () => {
    const base = {
      openMin: OPEN,
      closeMin: CLOSE,
      breaks: [],
      busy: [],
      totalDurationMin: 45,
      stepMin: 15,
      earliestStartMin: null,
    };
    expect(planDay({ ...base, stepMin: 0 })).toEqual([]);
    expect(planDay({ ...base, totalDurationMin: 0 })).toEqual([]);
    expect(planDay({ ...base, openMin: CLOSE, closeMin: OPEN })).toEqual([]);
  });
});

describe("tashkent wall clock", () => {
  it("converts a Monday morning instant to wall time", () => {
    // 2026-10-05 is a Monday.
    const wall = toWall(new Date("2026-10-05T06:00:00.000Z"));
    expect(wall).toEqual({ date: "2026-10-05", minutes: 660, weekdayIso: 1 });
  });

  it("round-trips wall time through UTC", () => {
    expect(wallToUtc("2026-10-05", 660).toISOString()).toBe("2026-10-05T06:00:00.000Z");
  });

  it("validates calendar dates", () => {
    expect(isValidDateString("2026-10-05")).toBe(true);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("05.10.2026")).toBe(false);
    expect(isValidDateString("bad")).toBe(false);
  });

  it("adds days across month boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });

  it("round-trips HH:MM helpers", () => {
    expect(minutesToTime(660)).toBe("11:00");
    expect(timeToMinutes("11:00")).toBe(660);
  });
});
