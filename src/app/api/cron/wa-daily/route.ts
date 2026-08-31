import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendWaFlow,
  maybeSendReviewRequest,
  splitName,
  formatWaDateTime,
} from "@/lib/manychat";
import { israelWallToUtc, toIsraelDateKey, addDaysToKey } from "@/lib/time";

export const dynamic = "force-dynamic";
// Each send is several ManyChat round-trips (5s timeout each) — allow the
// full minute so a busy day never truncates mid-run.
export const maxDuration = 60;

// Daily WhatsApp cron (see vercel.json, `0 16 * * *` — Hobby fires within the
// hour, ~18:00-20:00 Israel across DST). Two idempotent jobs:
//   1. Reminders — CONFIRMED bookings starting tomorrow (Israel calendar day).
//   2. Review requests — COMPLETED bookings that ended in [now-7d, now-2h]
//      (covers the dashboard auto-COMPLETED sweep within a day).
// Vercel sends `Authorization: Bearer ${CRON_SECRET}`.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[CRON_WA_DAILY] CRON_SECRET env is not set");
    return NextResponse.json({ error: "שגיאת תצורה" }, { status: 500 });
  }

  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  try {
    const now = new Date();
    const skipped: string[] = [];
    let reminders = 0;
    let reviews = 0;
    const siteUrl = process.env.NEXTAUTH_URL || "https://haloyogamassage.com";

    // ── Reminders: startAt in [tomorrow 00:00, day-after 00:00) Israel time
    const todayKey = toIsraelDateKey(now);
    const windowStart = israelWallToUtc(addDaysToKey(todayKey, 1), "00:00");
    const windowEnd = israelWallToUtc(addDaysToKey(todayKey, 2), "00:00");

    // Pre-config guard: with ManyChat unconfigured, report WITHOUT consuming
    // stamps — a claim followed by a "not_configured" skip would permanently
    // burn tomorrow-bookings' reminder stamps on day-one runs.
    if (!process.env.MANYCHAT_API_TOKEN || !process.env.MANYCHAT_FLOW_REMINDER) {
      skipped.push("reminders: not_configured");
    } else {
      const tomorrowBookings = await prisma.booking.findMany({
        where: {
          status: "CONFIRMED",
          startAt: { gte: windowStart, lt: windowEnd },
          waReminderSentAt: null,
        },
        include: { service: true },
      });

      for (const b of tomorrowBookings) {
        // Atomic claim BEFORE sending — a concurrent run matches 0 rows;
        // lost-on-transient-failure beats a double reminder.
        const { count } = await prisma.booking.updateMany({
          where: { id: b.id, waReminderSentAt: null },
          data: { waReminderSentAt: new Date() },
        });
        if (count !== 1) {
          skipped.push(`reminder ${b.id}: already_claimed`);
          continue;
        }
        const { firstName, lastName } = splitName(b.customerName);
        const result = await sendWaFlow(
          "reminder",
          b.customerPhone,
          firstName,
          lastName,
          {
            booking_service: b.service.name,
            booking_datetime: formatWaDateTime(b.startAt),
            cancel_link: `${siteUrl}/cancel/${b.cancelToken}`,
          },
          b.customerEmail
        );
        if (result.sent) reminders++;
        else skipped.push(`reminder ${b.id}: ${result.reason ?? "unknown"}`);
      }
    }

    // ── Review requests: endAt in [now-7d, now-2h]
    // Same pre-config guard: maybeSendReviewRequest claims the stamp before
    // sending, so an unset flow env would burn review stamps (the review-link
    // gate covers the common unconfigured case — this adds the env case).
    if (!process.env.MANYCHAT_API_TOKEN || !process.env.MANYCHAT_FLOW_REVIEW) {
      skipped.push("reviews: not_configured");
    } else {
      const completed = await prisma.booking.findMany({
        where: {
          status: "COMPLETED",
          endAt: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            lte: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          },
          waReviewSentAt: null,
        },
      });

      for (const b of completed) {
        // maybeSendReviewRequest does its own eligibility checks + atomic claim
        const result = await maybeSendReviewRequest(b);
        if (result.sent) reviews++;
        else skipped.push(`review ${b.id}: ${result.reason ?? "unknown"}`);
      }
    }

    return NextResponse.json({ reminders, reviews, skipped });
  } catch (error) {
    console.error("[CRON_WA_DAILY]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
