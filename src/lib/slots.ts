import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { SLOT_BUFFER_MINUTES } from "./constants";
import {
  israelWallToUtc,
  toIsraelDateKey,
  dateKeyDayOfWeek,
  addDaysToKey,
} from "./time";
import type { TimeSlot } from "@/types";
import { getExternalBusyIntervals } from "./external-calendar";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Generate slots for a single time window — pure "HH:mm" minute arithmetic.
 */
export function generateSlotsForWindow(
  startTime: string,
  endTime: string,
  slotDuration: number,
  buffer: number
): TimeSlot[] {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const toTimeStr = (mins: number) =>
    `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

  const windowEnd = toMinutes(endTime);
  const slots: TimeSlot[] = [];

  let current = toMinutes(startTime);
  while (current + slotDuration <= windowEnd) {
    slots.push({
      startTime: toTimeStr(current),
      endTime: toTimeStr(current + slotDuration),
      isAvailable: true,
    });
    current += slotDuration + buffer;
  }

  return slots;
}

/**
 * Get available time slots for a given Israel date key ("YYYY-MM-DD") and service.
 *
 * Supports multiple time windows per day (e.g., 8:00-16:00 and 19:00-21:00).
 */
export async function getAvailableSlots(
  dateKey: string,
  serviceId: string
): Promise<TimeSlot[]> {
  const targetKey = dateKey;
  const dayOfWeek = dateKeyDayOfWeek(dateKey);

  // Widen exception search window by ±1 day to handle timezone offsets
  // (dates stored in IST midnight → UTC)
  const targetDate = new Date(dateKey + "T00:00:00Z");
  const searchStart = new Date(targetDate.getTime() - DAY_MS);
  const searchEnd = new Date(targetDate.getTime() + 2 * DAY_MS);

  // 1. Get the service duration and category + exceptions for this date
  const [service, allExceptions] = await Promise.all([
    prisma.service.findUnique({
      where: { id: serviceId },
      select: { duration: true, category: true },
    }),
    prisma.availabilityException.findMany({
      where: {
        date: {
          gte: searchStart,
          lt: searchEnd,
        },
      },
    }),
  ]);

  if (!service) return [];

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
    // 2. Get ALL active rules for this day (category-specific first, then global)
    const allRules = await prisma.availabilityRule.findMany({
      where: {
        dayOfWeek,
        isActive: true,
        OR: [{ category: service.category }, { category: null }],
      },
      orderBy: { startTime: "asc" },
    });

    const catRules = allRules.filter((r) => r.category === service.category);
    const globalRules = allRules.filter((r) => !r.category);

    // Use category-specific rules if any exist, otherwise fall back to global
    const activeRules = catRules.length > 0 ? catRules : globalRules;

    if (activeRules.length === 0) return [];

    windows = activeRules.map((r) => ({ start: r.startTime, end: r.endTime }));
  }

  // 3. Generate slots for all windows
  const slotDuration = service.duration;
  const buffer = SLOT_BUFFER_MINUTES;

  let allSlots: TimeSlot[] = [];
  for (const win of windows) {
    allSlots = allSlots.concat(
      generateSlotsForWindow(win.start, win.end, slotDuration, buffer)
    );
  }

  if (allSlots.length === 0) return [];

  // 4. Get existing bookings overlapping the whole Israel day (non-cancelled)
  const dayStartUtc = israelWallToUtc(dateKey, "00:00");
  const dayEndUtc = israelWallToUtc(addDaysToKey(dateKey, 1), "00:00");

  // External (iCloud) busy intervals fetched in parallel — fail-open [] on error
  const [bookings, externalBusy] = await Promise.all([
    prisma.booking.findMany({
      where: {
        startAt: { lt: dayEndUtc },
        endAt: { gt: dayStartUtc },
        status: { notIn: ["CANCELLED", "REJECTED"] },
      },
      select: { startAt: true, endAt: true },
    }),
    getExternalBusyIntervals(dayStartUtc, dayEndUtc),
  ]);

  // 5. Filter out occupied and past slots
  const now = new Date();

  return allSlots.map((slot) => {
    const slotStartUtc = israelWallToUtc(dateKey, slot.startTime);
    const slotEndUtc = israelWallToUtc(dateKey, slot.endTime);

    if (slotStartUtc <= now) {
      return { ...slot, isAvailable: false };
    }

    const hasConflict = bookings.some((booking) => {
      return slotStartUtc < booking.endAt && slotEndUtc > booking.startAt;
    });

    const hasExternalConflict = externalBusy.some((busy) => {
      return slotStartUtc < busy.end && slotEndUtc > busy.start;
    });

    return { ...slot, isAvailable: !hasConflict && !hasExternalConflict };
  });
}

/** Thrown by createBookingInTransaction when the slot was taken concurrently */
export class SlotTakenError extends Error {}

function isP2034(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code: string }).code === "P2034"
  );
}

/**
 * Create a booking inside a Serializable transaction, re-checking overlap
 * against non-cancelled bookings. Throws SlotTakenError on a real conflict.
 * Retries ONCE on Prisma P2034 (serialization conflict) — two concurrent
 * different-slot bookings can spuriously conflict under SSI.
 */
export async function createBookingInTransaction(
  data: Prisma.BookingUncheckedCreateInput,
  { startAt, endAt }: { startAt: Date; endAt: Date }
) {
  const runOnce = () =>
    prisma.$transaction(async (tx) => {
      const conflict = await tx.booking.findFirst({
        where: {
          status: { notIn: ["CANCELLED", "REJECTED"] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
        select: { id: true },
      });
      if (conflict) throw new SlotTakenError();

      return tx.booking.create({
        data,
        include: { service: true },
      });
    }, { isolationLevel: "Serializable" });

  try {
    return await runOnce();
  } catch (error) {
    if (isP2034(error)) {
      return await runOnce();
    }
    throw error;
  }
}

/**
 * Validate a requested public-booking slot against the live slot grid.
 * Returns the real UTC start/end instants when the slot exists and is
 * available, otherwise null. This is THE public-booking gate.
 */
export async function validateSlotForBooking(
  dateKey: string,
  startTime: string,
  serviceId: string
): Promise<{ startAt: Date; endAt: Date } | null> {
  const slots = await getAvailableSlots(dateKey, serviceId);
  const slot = slots.find((s) => s.startTime === startTime && s.isAvailable);
  if (!slot) return null;

  return {
    startAt: israelWallToUtc(dateKey, slot.startTime),
    endAt: israelWallToUtc(dateKey, slot.endTime),
  };
}

/** Why an admin-created booking is rejected — lets the route pick a distinct message. */
export type ConflictReason = "booking" | "blocked" | "external";

/**
 * Check whether a UTC time range conflicts with an existing booking, falls
 * on a BLOCKED date, or overlaps an external (iCloud) calendar event.
 * Returns the reason, or null when the range is free.
 * Used by the admin create route (admin books off-grid).
 */
export async function hasBookingConflictOrBlocked(
  startAt: Date,
  endAt: Date,
  serviceId?: string
): Promise<ConflictReason | null> {
  // 1. Check for booking conflicts
  const conflicting = await prisma.booking.findFirst({
    where: {
      status: { notIn: ["CANCELLED", "REJECTED"] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true },
  });

  if (conflicting) return "booking";

  // 2. Check for BLOCKED exceptions on this date.
  // Fetch ALL exception types (BLOCKED and OVERRIDE) so the category-set
  // selection matches getAvailableSlots — fetching only BLOCKED would make a
  // category set look empty on a "cat OVERRIDE + global BLOCKED" day and
  // wrongly block it.
  const targetKey = toIsraelDateKey(startAt);
  const targetDate = new Date(targetKey + "T00:00:00Z");
  const searchStart = new Date(targetDate.getTime() - DAY_MS);
  const searchEnd = new Date(targetDate.getTime() + 2 * DAY_MS);

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
      OR: [{ category: serviceCategory }, { category: null }],
    },
  });

  // Filter to only exceptions matching the target date in Israel timezone
  const exceptions = allExceptions.filter(
    (e) => toIsraelDateKey(e.date) === targetKey
  );

  const catExceptions = serviceCategory
    ? exceptions.filter((e) => e.category === serviceCategory)
    : [];
  const globalExceptions = exceptions.filter((e) => !e.category);
  const relevantExceptions =
    catExceptions.length > 0 ? catExceptions : globalExceptions;

  if (relevantExceptions.some((e) => e.type === "BLOCKED")) return "blocked";

  // 3. Check external (iCloud) calendar busy intervals — fail-open [] on error
  const externalBusy = await getExternalBusyIntervals(startAt, endAt);
  if (externalBusy.some((busy) => startAt < busy.end && endAt > busy.start)) {
    return "external";
  }

  return null;
}
