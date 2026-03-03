import { prisma } from "./prisma";
import { SLOT_BUFFER_MINUTES } from "./constants";
import type { TimeSlot } from "@/types";

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
 * Get available time slots for a given date and service.
 *
 * Algorithm:
 * 1. Get dayOfWeek for the date
 * 2. Check AvailabilityException for this date
 *    - BLOCKED → return []
 *    - OVERRIDE → use override hours
 * 3. If no exception → get AvailabilityRule for this dayOfWeek
 * 4. Generate consecutive slots with buffer
 * 5. Filter out existing bookings
 * 6. Filter out past slots (if today)
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
  const dayOfWeek = targetDate.getDay(); // 0=Sunday

  // 2. Check exceptions for this date (category-specific first, then global)
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const exceptions = await prisma.availabilityException.findMany({
    where: {
      date: {
        gte: targetDate,
        lt: nextDay,
      },
      OR: [
        { category: service.category },
        { category: null },
      ],
    },
  });

  // Prefer category-specific exception over global
  const exception =
    exceptions.find((e) => e.category === service.category) ||
    exceptions.find((e) => !e.category) ||
    null;

  let startTime: string;
  let endTime: string;

  if (exception) {
    if (exception.type === "BLOCKED") {
      return []; // Day is blocked
    }
    // OVERRIDE — use alternative hours
    if (!exception.startTime || !exception.endTime) return [];
    startTime = exception.startTime;
    endTime = exception.endTime;
  } else {
    // 3. Get availability rule for this day (category-specific first, then global)
    const rules = await prisma.availabilityRule.findMany({
      where: {
        dayOfWeek,
        isActive: true,
        OR: [
          { category: service.category },
          { category: null },
        ],
      },
    });

    // Prefer category-specific rule over global
    const rule =
      rules.find((r) => r.category === service.category) ||
      rules.find((r) => !r.category) ||
      null;

    if (!rule) return []; // No rule = day off

    startTime = rule.startTime;
    endTime = rule.endTime;
  }

  // 4. Generate consecutive slots
  const slots: TimeSlot[] = [];
  const slotDuration = service.duration;
  const buffer = SLOT_BUFFER_MINUTES;

  const windowStart = setTime(targetDate, startTime);
  const windowEnd = setTime(targetDate, endTime);

  let current = new Date(windowStart);

  while (true) {
    const slotEnd = new Date(current.getTime() + slotDuration * 60 * 1000);

    // Slot must fit within the working window
    if (slotEnd > windowEnd) break;

    slots.push({
      startTime: formatTimeStr(current),
      endTime: formatTimeStr(slotEnd),
      isAvailable: true,
    });

    // Next slot = current end + buffer
    current = new Date(slotEnd.getTime() + buffer * 60 * 1000);
  }

  // 5. Get existing bookings for this date (non-cancelled)
  const dayStart = setTime(targetDate, startTime);
  const dayEnd = setTime(targetDate, endTime);

  const bookings = await prisma.booking.findMany({
    where: {
      startAt: { gte: dayStart },
      endAt: { lte: dayEnd },
      status: { not: "CANCELLED" },
    },
    select: { startAt: true, endAt: true },
  });

  // 6. Filter out occupied slots
  const now = new Date();

  return slots.map((slot) => {
    const slotStart = setTime(targetDate, slot.startTime);
    const slotEnd = setTime(targetDate, slot.endTime);

    // Check if slot is in the past
    if (slotStart <= now) {
      return { ...slot, isAvailable: false };
    }

    // Check overlap with existing bookings
    const hasConflict = bookings.some((booking) => {
      return slotStart < booking.endAt && slotEnd > booking.startAt;
    });

    return { ...slot, isAvailable: !hasConflict };
  });
}

/**
 * Check if a specific slot is still available (for booking creation).
 * Used inside a transaction to prevent overbooking.
 */
export async function isSlotAvailable(
  startAt: Date,
  endAt: Date
): Promise<boolean> {
  const conflicting = await prisma.booking.findFirst({
    where: {
      status: { not: "CANCELLED" },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });

  return !conflicting;
}
