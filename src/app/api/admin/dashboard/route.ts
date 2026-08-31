import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  israelWallToUtc,
  toIsraelDateKey,
  dateKeyDayOfWeek,
  addDaysToKey,
} from "@/lib/time";

// Always compute live data — without this, Next statically snapshots this GET at build time
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    const todayKey = toIsraelDateKey(now);
    const todayStart = israelWallToUtc(todayKey, "00:00");
    const todayEnd = israelWallToUtc(addDaysToKey(todayKey, 1), "00:00");
    // Start of week (Sunday) in Israel time
    const weekStartKey = addDaysToKey(todayKey, -dateKeyDayOfWeek(todayKey));
    const weekStart = israelWallToUtc(weekStartKey, "00:00");
    const weekEnd = israelWallToUtc(addDaysToKey(weekStartKey, 7), "00:00");

    const [todayBookings, weekBookings, newLeads, pendingReviews, pendingBookings, todayBookingsList, recentLeads] =
      await Promise.all([
        prisma.booking.count({
          where: {
            startAt: { gte: todayStart, lt: todayEnd },
            status: { notIn: ["CANCELLED", "REJECTED"] },
          },
        }),
        prisma.booking.count({
          where: {
            startAt: { gte: weekStart, lt: weekEnd },
            status: { notIn: ["CANCELLED", "REJECTED"] },
          },
        }),
        prisma.lead.count({ where: { status: "NEW" } }),
        prisma.review.count({ where: { isApproved: false } }),
        prisma.booking.count({ where: { status: "PENDING" } }),
        prisma.booking.findMany({
          where: {
            startAt: { gte: todayStart, lt: todayEnd },
            status: { notIn: ["CANCELLED", "REJECTED"] },
          },
          include: { service: true },
          orderBy: { startAt: "asc" },
        }),
        prisma.lead.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

    // Auto-mark past CONFIRMED bookings as COMPLETED
    await prisma.booking.updateMany({
      where: {
        status: "CONFIRMED",
        endAt: { lt: now },
      },
      data: { status: "COMPLETED" },
    });

    return NextResponse.json({
      data: {
        stats: { todayBookings, weekBookings, newLeads, pendingReviews, pendingBookings },
        todayBookingsList,
        recentLeads,
      },
    });
  } catch (error) {
    console.error("[DASHBOARD]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
