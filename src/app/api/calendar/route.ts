import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { buildIcsEvent } from "@/lib/ics";

// Always serve a fresh feed (no static caching).
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("token");
    const expected = process.env.CALENDAR_FEED_TOKEN;

    const tokenBuf = Buffer.from(token ?? "", "utf8");
    const expectedBuf = Buffer.from(expected ?? "", "utf8");
    if (
      !expected ||
      !token ||
      tokenBuf.length !== expectedBuf.length ||
      !timingSafeEqual(tokenBuf, expectedBuf)
    ) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Keep the feed small: only bookings from the last 90 days onward.
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const bookings = await prisma.booking.findMany({
      where: {
        status: { notIn: ["CANCELLED", "REJECTED"] },
        startAt: { gte: ninetyDaysAgo },
      },
      include: { service: true },
      orderBy: { startAt: "asc" },
    });

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Halo Yoga//Bookings//HE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:הזמנות HALO",
      "X-WR-TIMEZONE:Asia/Jerusalem",
    ];

    for (const b of bookings) {
      const serviceName = b.service?.name ?? "שירות";
      const summary = `${serviceName} — ${b.customerName}`;

      const descParts: string[] = [
        `טלפון: ${b.customerPhone}`,
        `סטטוס: ${b.status}`,
      ];
      if (b.notes) descParts.push(`הערות: ${b.notes}`);
      if (b.isHomeVisit) descParts.push("ביקור בית");
      const description = descParts.join("\n");

      lines.push(
        ...buildIcsEvent({
          uid: `${b.id}@haloyogamassage.com`,
          start: b.startAt,
          end: b.endAt,
          summary,
          description,
          dtstamp: b.updatedAt ?? b.createdAt,
          status: b.status === "PENDING" ? "TENTATIVE" : "CONFIRMED",
        })
      );
    }

    lines.push("END:VCALENDAR");

    // iCal requires CRLF between content lines.
    const ics = lines.join("\r\n") + "\r\n";

    return new Response(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": "inline; filename=halo-bookings.ics",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[calendar feed] failed to build ICS:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
