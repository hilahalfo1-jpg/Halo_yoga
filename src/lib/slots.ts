import { prisma } from "./prisma";
import { SLOT_BUFFER_MINUTES } from "./constants";
import type { TimeSlot } from "@/types";

/**
 * Get current time in Israel timezone
 */
function nowInIsrael(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })
  );
}

/**
 * Format a Date to "YYYY-MM-DD" in Israel timezone
 */
function toIsraelDateKey(d: Date): string {
  return new Date(d).toLocaleDateString("en-CA", {
    timeZone: "Asia/Jerusalem",
  });
}

/**
 * Parse "HH:mm" string to { hours, minutes }
 */
function parseTime(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

/**
 * Create a Date object at a specific time on a given date
 */
function setTime(date: Date, timeStr: string): Date {
  const { hours, minutes } = parseTime(timeStr);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Format Date to "HH:mm"
 */
function formatTimeStr(date: Date): string {
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

/**
 * Generate slots for a single time window
 */
function generateSlotsForWindow(
  targetDate: Date,
  startTime: string,
  endTime: string,
  slotDuration: number,
  buffer: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const windowStart = setTime(targetDate, startTime);
  const windowEnd = setTime(targetDate, endTime);

  let current = new Date(windowStart);

  while (true) {
    const slotEnd = new Date(current.getTime() + slotDuration * 60 * 1000);
    if (slotEnd > windowEnd) break;

    slots.push({
      startTime: formatTimeStr(current),
      endTime: formatTimeStr(slotEnd),
      isAvailable: true,
    });

    current = new Date(slotEnd.getTime() + buffer * 60 * 1000);
  }

  return slots;
}

/**
 * Get available time slots for a given date and service.
 *
 * Supports multiple time windows per day (e.g., 8:00-16:00 and 19:00-21:00).
 */
export async function getAvailableSlots(
  date: Date,
  serviceId: string
): Promise<TimeSlot[]> {
  // 1. Get the service duration and category
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { duration: true, category: true },
  });

  if (!service) return [];

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const dayOfWeek = targetDate.getDay();

  // Target date key for comparison (e.g., "2026-03-10")
  const targetKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;

  // 2. Check exceptions for this date (category-specific first, then global)
  // Widen search window by ±1 day to handle timezone offsets (dates stored in IST midnight → UTC)
  const searchStart = new Date(targetDate);
  searchStart.setDate(searchStart.getDate() - 1);
  const searchEnd = new Date(targetDate);
  searchEnd.setDate(searchEnd.getDate() + 2);

  const allExceptions = await prisma.availabilityException.findMany({
    where: {
      date: {
        gte: searchStart,
        lt: searchEnd,
      },
      OR: [
        { category: service.category },
        { category: null },
      ],
    },
  });

  // Filter to only exceptions matching the target date in Israel timezone
  const exceptions = allExceptions.filter(
    (e) => toIsraelDateKey(e.date) === targetKey
  );

  // Separate category-specific and global exceptions
  const catExceptions = exceptions.filter((e) => e.category === service.category);
  const globalExceptions = exceptions.filter((e) => !e.category);
  // Use category-specific if any exist, otherwise fall back to global
  const relevantExceptions = catExceptions.length > 0 ? catExceptions : globalExceptions;

  // Build list of time windows
  type TimeWindow = { start: string; end: string };
  let windows: TimeWindow[] = [];

  if (relevantExceptions.length > 0) {
    // If ANY exception is BLOCKED, the day is closed
    if (relevantExceptions.some((e) => e.type === "BLOCKED")) {
      return [];
    }
    // Collect ALL OVERRIDE time ranges
    const overrideWindows = relevantExceptions
      .filter((e) => e.type === "OVERRIDE" && e.startTime && e.endTime)
      .map((e) => ({ start: e.startTime!, end: e.endTime! }))
      .sort((a, b) => a.start.localeCompare(b.start));
    if (overrideWindows.length === 0) return [];
    windows = overrideWindows;
  } else {
    // 3. Get ALL active rules for this day (category-specific first, then global)
    const catRules = await prisma.availabilityRule.findMany({
      where: {
        dayOfWeek,
        isActive: true,
        category: service.category,
      },
      orderBy: { startTime: "asc" },
    });

    const globalRules = await prisma.availabilityRule.findMany({
      where: {
        dayOfWeek,
        isActive: true,
        category: null,
      },
      orderBy: { startTime: "asc" },
    });

    // Use category-specific rules if any exist, otherwise fall back to global
    const activeRules = catRules.length > 0 ? catRules : globalRules;

    if (activeRules.length === 0) return [];

    windows = activeRules.map((r) => ({ start: r.startTime, end: r.endTime }));
  }

  // 4. Generate slots for all windows
  const slotDuration = service.duration;
  const buffer = SLOT_BUFFER_MINUTES;

  let allSlots: TimeSlot[] = [];
  for (const win of windows) {
    const windowSlots = generateSlotsForWindow(
      targetDate,
      win.start,
      win.end,
      slotDuration,
      buffer
    );
    allSlots = allSlots.concat(windowSlots);
  }

  if (allSlots.length === 0) return [];

  // 5. Get existing bookings for this date (non-cancelled)
  const earliestStart = windows.reduce(
    (min, w) => (w.start < min ? w.start : min),
    windows[0].start
  );
  const latestEnd = windows.reduce(
    (max, w) => (w.end > max ? w.end : max),
    windows[0].end
  );

  const dayStart = setTime(targetDate, earliestStart);
  const dayEnd = setTime(targetDate, latestEnd);

  const bookings = await prisma.booking.findMany({
    where: {
      startAt: { gte: dayStart },
      endAt: { lte: dayEnd },
      status: { not: "CANCELLED" },
    },
    select: { startAt: true, endAt: true },
  });

  // 6. Filter out occupied and past slots
  // Use Israel time for "now" since slot times represent Israel local times
  const now = nowInIsrael();

  return allSlots.map((slot) => {
    const slotStart = setTime(targetDate, slot.startTime);
    const slotEnd = setTime(targetDate, slot.endTime);

    if (slotStart <= now) {
      return { ...slot, isAvailable: false };
    }

    const hasConflict = bookings.some((booking) => {
      return slotStart < booking.endAt && slotEnd > booking.startAt;
    });

    return { ...slot, isAvailable: !hasConflict };
  });
}

/**
 * Check if a specific slot is still available (for booking creation).
 * Checks both booking conflicts AND availability exceptions (BLOCKED dates).
 */
export async function isSlotAvailable(
  startAt: Date,
  endAt: Date,
  serviceId?: string
): Promise<boolean> {
  // 1. Check for booking conflicts
  const conflicting = await prisma.booking.findFirst({
    where: {
      status: { not: "CANCELLED" },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });

  if (conflicting) return false;

  // 2. Check for BLOCKED exceptions on this date
  const targetDate = new Date(startAt);
  targetDate.setHours(0, 0, 0, 0);
  const targetKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;

  // Widen search window by ±1 day to handle timezone offsets
  const searchStart = new Date(targetDate);
  searchStart.setDate(searchStart.getDate() - 1);
  const searchEnd = new Date(targetDate);
  searchEnd.setDate(searchEnd.getDate() + 2);

  // Get service category if serviceId provided
  let serviceCategory: string | null = null;
  if (serviceId) {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { category: true },
    });
    serviceCategory = service?.category || null;
  }

  const allExceptions = await prisma.availabilityException.findMany({
    where: {
      date: { gte: searchStart, lt: searchEnd },
      type: "BLOCKED",
      OR: [
        { category: serviceCategory },
        { category: null },
      ],
    },
  });

  // Filter to only exceptions matching the target date in Israel timezone
  const blockedExceptions = allExceptions.filter(
    (e) => toIsraelDateKey(e.date) === targetKey
  );

  if (blockedExceptions.length > 0) return false;

  return true;
}
