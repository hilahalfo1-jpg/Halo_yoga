import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SLOT_BUFFER_MINUTES } from "@/lib/constants";
import {
  sendBookingApprovedEmail,
  sendBookingRejectedEmail,
} from "@/lib/email";
import {
  sendWaFlow,
  maybeSendReviewRequest,
  shouldSuppressRejectedWa,
  splitName,
  formatWaDateTime,
  boundWaSend,
} from "@/lib/manychat";

const patchBookingSchema = z.object({
  status: z
    .enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW", "REJECTED"])
    .optional(),
  adminNotes: z.string().max(2000).optional(),
  // Manual-send stamp (admin WhatsApp buttons) — handled BEFORE the status path
  waMark: z
    .enum(["received", "approved", "rejected", "review", "reminder"])
    .optional(),
});

// PATCH — update booking status or admin notes
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validated = patchBookingSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
    }

    const { status, adminNotes, waMark } = validated.data;

    // waMark — stamp a manual WhatsApp send and EARLY-RETURN before any status
    // logic, so { status, waMark } together can NEVER trigger emails/cascade.
    // Idempotent overwrite: re-marking just refreshes the timestamp.
    if (waMark) {
      const now = new Date();
      const stampData = {
        received: { waReceivedSentAt: now },
        approved: { waApprovedSentAt: now },
        rejected: { waRejectedSentAt: now },
        review: { waReviewSentAt: now },
        reminder: { waReminderSentAt: now },
      } as const;
      const booking = await prisma.booking.update({
        where: { id: params.id },
        data: stampData[waMark],
        include: { service: true },
      });
      return NextResponse.json({ data: booking });
    }

    const data: Record<string, unknown> = {};
    if (status) {
      data.status = status;
      if (status === "CANCELLED") data.cancelledAt = new Date();
    }
    if (adminNotes !== undefined) data.adminNotes = adminNotes;

    const booking = await prisma.booking.update({
      where: { id: params.id },
      data,
      include: { service: true },
    });

    let rejectedIds: string[] = [];
    const emailPromises: Promise<unknown>[] = [];
    const waPromises: Promise<unknown>[] = [];
    const siteUrl = process.env.NEXTAUTH_URL || "https://haloyogamassage.com";

    // WhatsApp lifecycle send: check stamp → send → on sent, stamp timestamp.
    // Best-effort (sendWaFlow never throws); awaited via Promise.allSettled below.
    const waBookingSend = (
      target: {
        id: string;
        customerName: string;
        customerPhone: string;
        customerEmail: string | null;
        startAt: Date;
        cancelToken: string;
        service: { name: string };
      },
      kind: "approved" | "rejected"
    ) =>
      (async () => {
        // Repeat-rejection suppression — covers BOTH "rejected" call sites
        // (direct REJECTED/CANCELLED PATCH and the auto-reject cascade,
        // evaluated per overlapping booking's customer). Deliberately does
        // NOT stamp waRejectedSentAt, so the manual button shows unsent.
        if (kind === "rejected" && (await shouldSuppressRejectedWa(target))) {
          console.log(
            `[MANYCHAT] rejected suppressed for ${target.id}: repeat_rejections`
          );
          return;
        }
        const { firstName, lastName } = splitName(target.customerName);
        const result = await sendWaFlow(
          kind,
          target.customerPhone,
          firstName,
          lastName,
          {
            booking_service: target.service.name,
            booking_datetime: formatWaDateTime(target.startAt),
            ...(kind === "approved"
              ? { cancel_link: `${siteUrl}/cancel/${target.cancelToken}` }
              : {}),
          },
          target.customerEmail
        );
        if (result.sent) {
          await prisma.booking.update({
            where: { id: target.id },
            data:
              kind === "approved"
                ? { waApprovedSentAt: new Date() }
                : { waRejectedSentAt: new Date() },
          });
        }
      })();

    // Auto-reject overlapping PENDING bookings when confirming
    if (status === "CONFIRMED") {
      const bufferMs = SLOT_BUFFER_MINUTES * 60 * 1000;
      const confirmedStart = new Date(booking.startAt.getTime() - bufferMs);
      const confirmedEnd = new Date(booking.endAt.getTime() + bufferMs);

      // Find all overlapping PENDING bookings
      const overlapping = await prisma.booking.findMany({
        where: {
          id: { not: booking.id },
          status: "PENDING",
          startAt: { lt: confirmedEnd },
          endAt: { gt: confirmedStart },
        },
        include: { service: true },
      });

      if (overlapping.length > 0) {
        // Reject all overlapping in a single transaction
        await prisma.booking.updateMany({
          where: { id: { in: overlapping.map((b) => b.id) } },
          data: { status: "REJECTED" },
        });

        rejectedIds = overlapping.map((b) => b.id);

        // Send rejection emails (awaited below via Promise.allSettled)
        for (const ob of overlapping) {
          if (ob.customerEmail) {
            emailPromises.push(
              sendBookingRejectedEmail({
                customerName: ob.customerName,
                customerEmail: ob.customerEmail,
                customerPhone: ob.customerPhone,
                serviceName: ob.service.name,
                startAt: ob.startAt,
              })
            );
          }
          // WhatsApp "rejected" per cascade-rejected booking, stamped each
          if (!ob.waRejectedSentAt) {
            waPromises.push(boundWaSend(waBookingSend(ob, "rejected"), `rejected ${ob.id}`));
          }
        }

        console.log(
          `[AUTO_REJECT] Confirmed ${booking.id} → rejected ${rejectedIds.length} overlapping bookings:`,
          rejectedIds
        );
      }
    }

    // Send email notification on status change
    if (status && booking.customerEmail) {
      const emailData = {
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        serviceName: booking.service.name,
        startAt: booking.startAt,
        cancelToken: booking.cancelToken,
      };

      if (status === "CONFIRMED") {
        emailPromises.push(sendBookingApprovedEmail(emailData));
      } else if (status === "REJECTED" || status === "CANCELLED") {
        emailPromises.push(sendBookingRejectedEmail(emailData));
      }
    }

    // WhatsApp lifecycle sends — stamp-gated (once-only per kind regardless
    // of repeated PATCHes), best-effort, never fail the request; each is
    // 8s-bounded so a degraded ManyChat can never hold the admin response
    if (status === "CONFIRMED" && !booking.waApprovedSentAt) {
      waPromises.push(
        boundWaSend(waBookingSend(booking, "approved"), `approved ${booking.id}`)
      );
    } else if (
      (status === "REJECTED" || status === "CANCELLED") &&
      !booking.waRejectedSentAt
    ) {
      waPromises.push(
        boundWaSend(waBookingSend(booking, "rejected"), `rejected ${booking.id}`)
      );
    } else if (status === "COMPLETED") {
      // maybeSendReviewRequest does its own eligibility checks + atomic claim
      waPromises.push(
        boundWaSend(maybeSendReviewRequest(booking), `review ${booking.id}`)
      );
    }

    if (emailPromises.length > 0 || waPromises.length > 0) {
      const settled = await Promise.allSettled([...emailPromises, ...waPromises]);
      settled.forEach((r) => {
        if (r.status === "rejected") console.error("[EMAIL_STATUS_CHANGE]", r.reason);
      });
    }

    return NextResponse.json({ data: booking, rejectedIds });
  } catch (error) {
    console.error("[ADMIN_BOOKING_PATCH]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// DELETE
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.booking.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_BOOKING_DELETE]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
