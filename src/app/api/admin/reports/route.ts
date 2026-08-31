import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { israelWallToUtc, toIsraelDateKey, addDaysToKey } from "@/lib/time";
import { contactKey } from "@/lib/phone";

export const dynamic = "force-dynamic";

// UTC range covering an Israel-time calendar month
function israelMonthRange(y: number, m: number): { from: Date; to: Date } {
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    from: israelWallToUtc(`${y}-${pad(m)}-01`, "00:00"),
    to: israelWallToUtc(
      m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`,
      "00:00"
    ),
  };
}

// Booking revenue counts only when COMPLETED: service price + home-visit surcharge
function bookingRevenue(b: {
  status: string;
  homeVisitSurcharge: number | null;
  service: { price: number } | null;
}): number {
  if (b.status !== "COMPLETED") return 0;
  return (b.service?.price ?? 0) + (b.homeVisitSurcharge ?? 0);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // YYYY-MM
    const fromParam = searchParams.get("from"); // YYYY-MM-DD
    const toParam = searchParams.get("to"); // YYYY-MM-DD

    let from: Date;
    let to: Date;

    if (month) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        return NextResponse.json({ error: "חודש לא תקין" }, { status: 400 });
      }
      const [y, m] = month.split("-").map(Number);
      ({ from, to } = israelMonthRange(y, m)); // `to` = first day of next month (exclusive)
    } else if (fromParam && toParam) {
      from = israelWallToUtc(fromParam, "00:00");
      to = israelWallToUtc(addDaysToKey(toParam, 1), "00:00"); // make `to` inclusive of the whole day
    } else {
      // default: current month (Israel time)
      const [y, m] = toIsraelDateKey(new Date()).split("-").map(Number);
      ({ from, to } = israelMonthRange(y, m));
    }

    // Last 12 Israel months (ending with the current month), for the trend
    const [nowY, nowM] = toIsraelDateKey(new Date()).split("-").map(Number);
    const trendMonths: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const total = nowY * 12 + (nowM - 1) - i;
      const y = Math.floor(total / 12);
      const m = (total % 12) + 1;
      trendMonths.push(`${y}-${String(m).padStart(2, "0")}`);
    }
    const [tY, tM] = trendMonths[0].split("-").map(Number);
    const trendFrom = israelMonthRange(tY, tM).from;
    const trendTo = israelMonthRange(nowY, nowM).to;

    const [bookings, trendBookings, priorCustomers, attempts] =
      await Promise.all([
        prisma.booking.findMany({
          where: { startAt: { gte: from, lt: to } },
          include: { service: true },
          orderBy: { startAt: "asc" },
        }),
        prisma.booking.findMany({
          where: { startAt: { gte: trendFrom, lt: trendTo } },
          select: {
            startAt: true,
            status: true,
            homeVisitSurcharge: true,
            service: { select: { price: true } },
          },
        }),
        // customers with any booking before the period — for new/returning
        prisma.booking.findMany({
          where: { startAt: { lt: from } },
          select: { customerPhone: true, customerEmail: true },
        }),
        prisma.bookingAttempt.findMany({
          where: { createdAt: { gte: from, lt: to } },
          select: { reason: true },
        }),
      ]);

    const statusCounts: Record<string, number> = {
      PENDING: 0,
      CONFIRMED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      NO_SHOW: 0,
      REJECTED: 0,
    };

    const byServiceMap = new Map<string, { count: number; revenue: number }>();
    const byCategoryMap = new Map<string, { count: number; revenue: number }>();

    let totalRevenue = 0;
    let homeCount = 0;

    for (const b of bookings) {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;

      const revenue = bookingRevenue(b);
      totalRevenue += revenue;
      if (b.isHomeVisit) homeCount += 1;

      const serviceName = b.service?.name ?? "—";
      const svc = byServiceMap.get(serviceName) || { count: 0, revenue: 0 };
      svc.count += 1;
      svc.revenue += revenue;
      byServiceMap.set(serviceName, svc);

      const category = b.service?.category ?? "—";
      const cat = byCategoryMap.get(category) || { count: 0, revenue: 0 };
      cat.count += 1;
      cat.revenue += revenue;
      byCategoryMap.set(category, cat);
    }

    const byService = Array.from(byServiceMap.entries())
      .map(([name, v]) => ({ name, count: v.count, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue || b.count - a.count);

    const byCategory = Array.from(byCategoryMap.entries())
      .map(([category, v]) => ({ category, count: v.count, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue || b.count - a.count);

    // 12-month trend: bucket by Israel month of startAt
    const trendMap = new Map<string, { revenue: number; bookings: number }>(
      trendMonths.map((m) => [m, { revenue: 0, bookings: 0 }])
    );
    for (const b of trendBookings) {
      const key = toIsraelDateKey(b.startAt).slice(0, 7);
      const bucket = trendMap.get(key);
      if (!bucket) continue;
      bucket.bookings += 1;
      bucket.revenue += bookingRevenue(b);
    }
    const monthlyTrend = trendMonths.map((m) => ({
      month: m,
      revenue: trendMap.get(m)!.revenue,
      bookings: trendMap.get(m)!.bookings,
    }));

    // New vs returning customers in the period (dedupe by contactKey);
    // "new" = the customer's first-ever booking falls inside the period
    const priorKeys = new Set<string>();
    for (const c of priorCustomers) {
      const key = contactKey(c.customerPhone, c.customerEmail);
      if (key) priorKeys.add(key);
    }
    const periodKeys = new Set<string>();
    let newCustomers = 0;
    let returningCustomers = 0;
    for (const b of bookings) {
      const key = contactKey(b.customerPhone, b.customerEmail);
      if (!key || periodKeys.has(key)) continue;
      periodKeys.add(key);
      if (priorKeys.has(key)) returningCustomers += 1;
      else newCustomers += 1;
    }

    // Failed booking attempts grouped by reason (null/empty → "אחר")
    const reasonMap = new Map<string, number>();
    for (const a of attempts) {
      const reason = a.reason?.trim() || "אחר";
      reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
    }
    const attemptsByReason = Array.from(reasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      data: {
        range: { from: from.toISOString(), to: to.toISOString() },
        totalBookings: bookings.length,
        completedBookings: statusCounts.COMPLETED || 0,
        totalRevenue,
        statusCounts,
        byService,
        byCategory,
        monthlyTrend,
        newVsReturning: { new: newCustomers, returning: returningCustomers },
        homeVisitShare: { home: homeCount, studio: bookings.length - homeCount },
        attemptsByReason,
      },
    });
  } catch (error) {
    console.error("[ADMIN_REPORTS_GET]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
