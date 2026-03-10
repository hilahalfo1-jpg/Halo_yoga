import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — return which days of week have active availability rules
// AND which specific dates are blocked (exceptions)
export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [rules, blockedExceptions, overrideExceptions] = await Promise.all([
      prisma.availabilityRule.findMany({
        where: { isActive: true },
        select: { dayOfWeek: true },
      }),
      prisma.availabilityException.findMany({
        where: {
          type: "BLOCKED",
          date: { gte: today },
        },
        select: { date: true },
      }),
      prisma.availabilityException.findMany({
        where: {
          type: "OVERRIDE",
          date: { gte: today },
        },
        select: { date: true },
      }),
    ]);

    const daySet = new Set(rules.map((r) => r.dayOfWeek));
    const activeDays = Array.from(daySet);

    const formatDate = (d: Date) => {
      const dt = new Date(d);
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
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
