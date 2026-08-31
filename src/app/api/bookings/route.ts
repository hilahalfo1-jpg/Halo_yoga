import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAvailableSlots,
  validateSlotForBooking,
  createBookingInTransaction,
  SlotTakenError,
} from "@/lib/slots";
import { israelWallToUtc } from "@/lib/time";
import { bookingSchema } from "@/lib/validations";
import { normalizeIdentifier } from "@/lib/phone";
import { sendNewBookingAdminEmail, sendBookingReceivedEmail } from "@/lib/email";
import { sendWaFlow, splitName, formatWaDateTime, boundWaSend } from "@/lib/manychat";

// GET available slots for a date + service
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const serviceId = searchParams.get("serviceId");

    if (!dateStr || !serviceId) {
      return NextResponse.json(
        { error: "חסרים פרמטרים: date, serviceId" },
        { status: 400 }
      );
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ||
      isNaN(new Date(dateStr + "T00:00:00Z").getTime())
    ) {
      return NextResponse.json(
        { error: "תאריך לא תקין" },
        { status: 400 }
      );
    }

    const slots = await getAvailableSlots(dateStr, serviceId);
    return NextResponse.json({ data: slots });
  } catch (error) {
    console.error("[BOOKINGS_GET]", error);
    return NextResponse.json(
      { error: "שגיאת שרת" },
      { status: 500 }
    );
  }
}

// POST create booking
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = bookingSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { serviceId, date, startTime, customerName, customerPhone, customerEmail, notes, isHomeVisit: homeVisitFlag, customerPhotoUrl } =
      validated.data;

    const isHomeVisit = homeVisitFlag === true;

    // Shadow ban check — silently reject blocked users with fake success
    const normalizedPhone = normalizeIdentifier(customerPhone);
    const normalizedEmail = customerEmail ? normalizeIdentifier(customerEmail) : null;

    const blockedEntry = await prisma.blacklist.findFirst({
      where: {
        OR: [
          { identifier: normalizedPhone },
          ...(normalizedEmail ? [{ identifier: normalizedEmail }] : []),
        ],
      },
    });

    if (blockedEntry) {
      // Simulate realistic processing delay so blocked user can't detect the block
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));
      console.log("[SHADOW_BAN] Blocked booking attempt from:", blockedEntry.identifier);
      return NextResponse.json({
        data: {
          id: `shadow_${Date.now()}`,
          serviceId,
          startAt: israelWallToUtc(date, startTime),
          customerName,
          status: "PENDING",
        },
      }, { status: 201 });
    }

    // Get service for name + surcharge
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { duration: true, name: true, homeVisitSurcharge: true },
    });

    if (!service) {
      return NextResponse.json(
        { error: "שירות לא נמצא" },
        { status: 404 }
      );
    }

    const logBookingAttempt = () =>
      prisma.bookingAttempt
        .create({
          data: {
            customerName,
            customerPhone,
            customerEmail: customerEmail || null,
            serviceId,
            serviceName: service.name,
            requestedAt: israelWallToUtc(date, startTime),
            reason: "מועד לא זמין",
          },
        })
        .catch((e) => console.error("[BOOKING_ATTEMPT_SAVE]", e));

    // Validate the requested slot against the live slot grid
    const slot = await validateSlotForBooking(date, startTime, serviceId);
    if (!slot) {
      await logBookingAttempt();
      return NextResponse.json(
        { error: "הזמן שבחרת כבר לא פנוי, אנא בחרו זמן אחר" },
        { status: 409 }
      );
    }

    let booking;
    try {
      booking = await createBookingInTransaction(
        {
          serviceId,
          startAt: slot.startAt,
          endAt: slot.endAt,
          customerName,
          customerPhone,
          customerEmail: customerEmail || null,
          notes: notes || null,
          status: "PENDING",
          isHomeVisit,
          homeVisitSurcharge: isHomeVisit ? (service.homeVisitSurcharge || 0) : null,
          customerPhotoUrl: customerPhotoUrl || null,
        },
        { startAt: slot.startAt, endAt: slot.endAt }
      );
    } catch (txError) {
      const isSlotTaken =
        txError instanceof SlotTakenError ||
        (txError &&
          typeof txError === "object" &&
          "code" in txError &&
          (txError as { code: string }).code === "P2034");
      if (isSlotTaken) {
        await logBookingAttempt();
        return NextResponse.json(
          { error: "הזמן שבחרת כבר לא פנוי, אנא בחרו זמן אחר" },
          { status: 409 }
        );
      }
      throw txError;
    }

    // Send email notifications (awaited — failures logged, never fail the response)
    const emailData = {
      customerName,
      customerEmail: customerEmail || "",
      customerPhone,
      serviceName: service.name,
      startAt: slot.startAt,
      notes: notes || null,
      isHomeVisit,
    };

    // WhatsApp "request received" (best-effort — sendWaFlow never throws).
    // Gift-linked bookings are structurally excluded: they are created in
    // /api/gift-cards, a different route — no exclusion code is needed here.
    const createdBooking = booking;
    const waReceivedTask = async () => {
      if (createdBooking.waReceivedSentAt) return; // once-only per stamp
      const { firstName, lastName } = splitName(customerName);
      const result = await sendWaFlow(
        "received",
        customerPhone,
        firstName,
        lastName,
        {
          booking_service: service.name,
          booking_datetime: formatWaDateTime(slot.startAt),
        },
        customerEmail || null
      );
      if (result.sent) {
        await prisma.booking.update({
          where: { id: createdBooking.id },
          data: { waReceivedSentAt: new Date() },
        });
      }
    };

    const emailResults = await Promise.allSettled([
      sendNewBookingAdminEmail(emailData),
      ...(customerEmail ? [sendBookingReceivedEmail(emailData)] : []),
      // 8s-bounded: a degraded ManyChat must never hold the booking submit
      boundWaSend(waReceivedTask(), `received ${booking.id}`),
    ]);
    emailResults.forEach((r) => {
      if (r.status === "rejected") console.error("[EMAIL_BOOKING]", r.reason);
    });

    return NextResponse.json({ data: booking }, { status: 201 });
  } catch (error) {
    // Handle unique constraint violation (double booking)
    // Dead once the [startAt, endAt] unique index is dropped at deploy —
    // kept to protect the rollout window.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "הזמן שבחרת כבר לא פנוי, אנא בחרו זמן אחר" },
        { status: 409 }
      );
    }

    console.error("[BOOKINGS_POST]", error);
    return NextResponse.json(
      { error: "שגיאת שרת, אנא נסו שוב מאוחר יותר" },
      { status: 500 }
    );
  }
}
