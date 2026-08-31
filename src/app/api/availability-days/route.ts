import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { israelWallToUtc, toIsraelDateKey, addDaysToKey } from "@/lib/time";

export const dynamic = "force-dynamic";

// GET — return which days of week have active availability rules
// AND which specific dates are blocked / specially opened (exceptions).
// Accepts ?serviceId= to resolve category-specific rules and exceptions.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get("serviceId");

    let category: string | null = null;
    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        select: { category: true },
      });
      category = service?.category ?? null;
    }

    // "Today" cutoff in Israel time — go back 1 day to be safe across timezones
    const safeToday = israelWallToUtc(
      addDaysToKey(toIsraelDateKey(new Date()), -1),
      "00:00"
    );

    const [rules, exceptions] = await Promise.all([
      prisma.availabilityRule.findMany({
        where: { isActive: true },
        select: { dayOfWeek: true, category: true },
      }),
      prisma.availabilityException.findMany({
        where: { date: { gte: safeToday } },
        select: { date: true, type: true, category: true },
      }),
    ]);

    // availableWeekdays: per dayOfWeek — cat rules if any, else global rules.
    // Without a category (no serviceId), keep the legacy behavior: any rule counts.
    const daySet = new Set<number>();
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      const dayRules = rules.filter((r) => r.dayOfWeek === dayOfWeek);
      if (dayRules.length === 0) continue;
      if (category) {
        const catRules = dayRules.filter((r) => r.category === category);
        if (catRules.length > 0 || dayRules.some((r) => !r.category)) {
          daySet.add(dayOfWeek);
        }
      } else {
        daySet.add(dayOfWeek);
      }
    }
    const activeDays = Array.from(daySet);

    // Group exceptions by Israel date key, then per group pick the
    // category-specific set if non-empty, else the global set.
    const byDateKey = new Map<string, { type: string; category: string | null }[]>();
    for (const e of exceptions) {
      const key = toIsraelDateKey(e.date);
      const group = byDateKey.get(key) || [];
      group.push({ type: e.type, category: e.category });
      byDateKey.set(key, group);
    }

    const blockedDates: string[] = [];
    const openedDates: string[] = [];

    byDateKey.forEach((group, key) => {
      const catSet = category ? group.filter((e) => e.category === category) : [];
      const relevantSet = catSet.length > 0 ? catSet : category ? group.filter((e) => !e.category) : group;
      const blocked = relevantSet.some((e) => e.type === "BLOCKED");
      if (blocked) {
        blockedDates.push(key);
      } else if (relevantSet.some((e) => e.type === "OVERRIDE")) {
        // Mutually exclusive with blockedDates — the client checks openedDates first
        openedDates.push(key);
      }
    });

    return NextResponse.json({
      data: activeDays,
      blockedDates,
      openedDates,
    });
  } catch (error) {
    console.error("[AVAILABILITY_DAYS_GET]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
