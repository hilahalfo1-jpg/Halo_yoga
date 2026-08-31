import { describe, it, expect } from "vitest";
import { generateSlotsForWindow } from "./slots";

describe("generateSlotsForWindow", () => {
  it("generates slots with duration + buffer spacing", () => {
    const slots = generateSlotsForWindow("09:00", "13:00", 60, 15);
    expect(slots).toEqual([
      { startTime: "09:00", endTime: "10:00", isAvailable: true },
      { startTime: "10:15", endTime: "11:15", isAvailable: true },
      { startTime: "11:30", endTime: "12:30", isAvailable: true },
    ]);
  });

  it("excludes a slot that would end past the window end", () => {
    const slots = generateSlotsForWindow("09:00", "10:30", 60, 15);
    expect(slots).toEqual([
      { startTime: "09:00", endTime: "10:00", isAvailable: true },
    ]);
  });

  it("returns empty when the window is shorter than the duration", () => {
    expect(generateSlotsForWindow("09:00", "09:30", 60, 15)).toEqual([]);
  });
});
