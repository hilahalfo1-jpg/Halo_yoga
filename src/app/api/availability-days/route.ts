import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — return which days of week have active availability rules
// AND which specific dates are blocked (exceptions)
export async function GET() {
  try {
    const [rules, exceptions] = await Promise.all([
      prisma.availabilityRule.findMany({
        where: { isActive: true },
        select: { dayOfWeek: true },
      }),
      prisma.availabilityException.findMany({
        where: {
          type: "BLOCKED",
          date: { gte: new Date() }, // Only future blocked dates
        },
        select: { date: true, category: true },
      }),
    ]);

    const daySet = new Set(rules.map((r) => r.dayOfWeek));
    const activeDays = Array.from(daySet);

    // Return blocked dates as ISO date strings (YYYY-MM-DD)
    const blockedDates = exceptions.map((e) => {
      const d = new Date(e.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });
    // Deduplicate (a date blocked for ANY category blocks the whole day visually)
    const uniqueBlockedDates = Array.from(new Set(blockedDates));

    return NextResponse.json({
      data: activeDays,
      blockedDates: uniqueBlockedDates,
    });
  } catch (error) {
    console.error("[AVAILABILITY_DAYS_GET]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
