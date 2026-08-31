import { prisma } from "@/lib/prisma";
import { DAYS_OF_WEEK_HE, WORKING_HOURS } from "@/lib/constants";

export interface WorkingHoursItem {
  day: string;
  hours: string;
}

/**
 * Derive the displayed weekly working hours from the active AvailabilityRules
 * (union of all active rules per day — global + category, overlaps merged).
 * A day with no active rule renders as "סגור".
 * Falls back to the WORKING_HOURS constants on DB error.
 */
export async function getWorkingHours(): Promise<WorkingHoursItem[]> {
  try {
    const rules = await prisma.availabilityRule.findMany({
      where: { isActive: true },
      select: { dayOfWeek: true, startTime: true, endTime: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return DAYS_OF_WEEK_HE.map((day, dayOfWeek) => {
      const windows = rules
        .filter((r) => r.dayOfWeek === dayOfWeek)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      // Merge overlapping/touching windows ("HH:MM" strings compare lexically)
      const merged: { start: string; end: string }[] = [];
      for (const w of windows) {
        const last = merged[merged.length - 1];
        if (last && w.startTime <= last.end) {
          if (w.endTime > last.end) last.end = w.endTime;
        } else {
          merged.push({ start: w.startTime, end: w.endTime });
        }
      }

      const hours =
        merged.length === 0
          ? "סגור"
          : merged.length === 1
            ? `${merged[0].start} - ${merged[0].end}`
            : merged.map((w) => `${w.start}-${w.end}`).join(", ");

      return { day, hours };
    });
  } catch (error) {
    console.error("[GET_WORKING_HOURS]", error);
    return WORKING_HOURS;
  }
}
