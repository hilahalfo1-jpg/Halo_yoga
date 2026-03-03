import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [todayBookings, weekBookings, newLeads, pendingReviews, todayBookingsList, recentLeads] =
      await Promise.all([
        prisma.booking.count({
          where: {
            startAt: { gte: todayStart, lt: todayEnd },
            status: { not: "CANCELLED" },
          },
        }),
        prisma.booking.count({
          where: {
            startAt: { gte: weekStart, lt: weekEnd },
            status: { not: "CANCELLED" },
          },
        }),
        prisma.lead.count({ where: { status: "NEW" } }),
        prisma.review.count({ where: { isApproved: false } }),
        prisma.booking.findMany({
          where: {
            startAt: { gte: todayStart, lt: todayEnd },
            status: { not: "CANCELLED" },
          },
          include: { service: true },
          orderBy: { startAt: "asc" },
        }),
        prisma.lead.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

    return NextResponse.json({
      data: {
        stats: { todayBookings, weekBookings, newLeads, pendingReviews },
        todayBookingsList,
        recentLeads,
      },
    });
  } catch (error) {
    console.error("[DASHBOARD]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
