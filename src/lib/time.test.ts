import { describe, it, expect } from "vitest";
import {
  israelWallToUtc,
  utcToIsraelTimeStr,
  toIsraelDateKey,
  dateKeyDayOfWeek,
  addDaysToKey,
  localDateToKey,
} from "./time";

describe("israelWallToUtc", () => {
  it("converts winter wall clock (UTC+2)", () => {
    expect(israelWallToUtc("2026-01-15", "10:00").toISOString()).toBe(
      "2026-01-15T08:00:00.000Z"
    );
  });

  it("converts summer wall clock (UTC+3)", () => {
    expect(israelWallToUtc("2026-07-15", "10:00").toISOString()).toBe(
      "2026-07-15T07:00:00.000Z"
    );
  });
});

describe("round-trip israelWallToUtc → utcToIsraelTimeStr", () => {
  // Israel DST 2026: spring forward Fri 2026-03-27, fall back Sun 2026-10-25
  const dates = [
    "2026-01-15",
    "2026-07-15",
    // late-March DST transition week
    "2026-03-25",
    "2026-03-26",
    "2026-03-27",
    "2026-03-28",
    "2026-03-29",
    // late-October DST transition week
    "2026-10-23",
    "2026-10-24",
    "2026-10-25",
    "2026-10-26",
  ];
  const times = ["00:00", "23:45"];

  for (const dateKey of dates) {
    for (const time of times) {
      it(`round-trips ${dateKey} ${time}`, () => {
        expect(utcToIsraelTimeStr(israelWallToUtc(dateKey, time))).toBe(time);
      });
    }
  }
});

describe("toIsraelDateKey", () => {
  it("keeps the Israel date of a wall-clock midnight", () => {
    expect(toIsraelDateKey(israelWallToUtc("2026-03-10", "00:00"))).toBe(
      "2026-03-10"
    );
  });
});

describe("dateKeyDayOfWeek", () => {
  it("returns the day of week for a date key", () => {
    expect(dateKeyDayOfWeek("2026-01-15")).toBe(4); // Thursday
    expect(dateKeyDayOfWeek("2026-01-18")).toBe(0); // Sunday
  });
});

describe("addDaysToKey", () => {
  it("adds days across month boundaries", () => {
    expect(addDaysToKey("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("subtracts days across year boundaries", () => {
    expect(addDaysToKey("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("adds within a month", () => {
    expect(addDaysToKey("2026-06-10", 5)).toBe("2026-06-15");
  });
});

describe("localDateToKey", () => {
  it("formats local date parts zero-padded", () => {
    expect(localDateToKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(localDateToKey(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});
