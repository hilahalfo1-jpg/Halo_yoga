import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET — return which days of week have active availability rules
// AND which specific dates are blocked (exceptions)
export async function GET() {
  try {
    // Use Israel midnight for the "today" cutoff to avoid timezone mismatches
    const nowIsrael = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
    nowIsrael.setHours(0, 0, 0, 0);
    // Convert back to UTC for DB query — go back 1 day to be safe across timezones
    const safeToday = new Date(nowIsrael);
    safeToday.setDate(safeToday.getDate() - 1);

    const [rules, blockedExceptions, overrideExceptions] = await Promise.all([
      prisma.availabilityRule.findMany({
        where: { isActive: true },
        select: { dayOfWeek: true },
      }),
      prisma.availabilityException.findMany({
        where: {
          type: "BLOCKED",
          date: { gte: safeToday },
        },
        select: { date: true },
      }),
      prisma.availabilityException.findMany({
        where: {
          type: "OVERRIDE",
          date: { gte: safeToday },
        },
        select: { date: true },
      }),
    ]);

    const daySet = new Set(rules.map((r) => r.dayOfWeek));
    const activeDays = Array.from(daySet);

    // Format dates in Israel timezone to match client-side date keys
    const formatDate = (d: Date) => {
      return new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
    };

    const uniqueBlockedDates = Array.from(new Set(blockedExceptions.map((e) => formatDate(e.date))));
    // Dates with OVERRIDE exceptions — open even if the weekday is normally off
    const uniqueOpenedDates = Array.from(new Set(overrideExceptions.map((e) => formatDate(e.date))));

    return NextResponse.json({
      data: activeDays,
      blockedDates: uniqueBlockedDates,
      openedDates: uniqueOpenedDates,
    });
  } catch (error) {
    console.error("[AVAILABILITY_DAYS_GET]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
