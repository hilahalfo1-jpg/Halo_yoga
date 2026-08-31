import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hasBookingConflictOrBlocked,
  createBookingInTransaction,
  SlotTakenError,
} from "@/lib/slots";
import { israelWallToUtc } from "@/lib/time";
import { adminBookingSchema } from "@/lib/validations";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const serviceId = searchParams.get("serviceId");

    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") where.status = status;
    if (serviceId && serviceId !== "ALL") where.serviceId = serviceId;

    // NOTE: CSV export on the admin page covers the loaded 500 bookings.
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        service: { select: { name: true, duration: true, price: true } },
        medicalForm: { select: { id: true } },
      },
      orderBy: { startAt: "desc" },
      take: 500,
    });

    return NextResponse.json({ data: bookings });
  } catch (error) {
    console.error("[ADMIN_BOOKINGS_GET]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// POST — admin creates a booking on behalf of a customer (CONFIRMED, no emails, no blacklist)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = adminBookingSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { serviceId, date, startTime, customerName, customerPhone, customerEmail, notes } =
      validated.data;

    // Get service for duration
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { duration: true },
    });

    if (!service) {
      return NextResponse.json({ error: "שירות לא נמצא" }, { status: 404 });
    }

    // Build real UTC startAt/endAt from Israel wall clock
    const startDate = israelWallToUtc(date, startTime);
    const endDate = new Date(startDate.getTime() + service.duration * 60 * 1000);

    // Enforce slot availability (booking conflicts + BLOCKED dates + iCloud busy)
    const conflictReason = await hasBookingConflictOrBlocked(startDate, endDate, serviceId);
    if (conflictReason) {
      return NextResponse.json(
        {
          error:
            conflictReason === "external"
              ? "הזמן חופף לאירוע ביומן ה-iCloud של הילה"
              : "המשבצת שבחרת כבר לא פנויה, אנא בחרו זמן אחר",
        },
        { status: 409 }
      );
    }

    let booking;
    try {
      booking = await createBookingInTransaction(
        {
          serviceId,
          startAt: startDate,
          endAt: endDate,
          customerName,
          customerPhone,
          customerEmail: customerEmail || null,
          notes: notes || null,
          status: "CONFIRMED",
        },
        { startAt: startDate, endAt: endDate }
      );
    } catch (txError) {
      const isSlotTaken =
        txError instanceof SlotTakenError ||
        (txError &&
          typeof txError === "object" &&
          "code" in txError &&
          (txError as { code: string }).code === "P2034");
      if (isSlotTaken) {
        return NextResponse.json(
          { error: "המשבצת תפוסה, אנא בחרו זמן אחר" },
          { status: 409 }
        );
      }
      throw txError;
    }

    return NextResponse.json({ data: booking }, { status: 201 });
  } catch (error) {
    // Handle unique constraint violation (double booking on [startAt, endAt])
    // Dead once the unique index is dropped at deploy — kept for the rollout window.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "המשבצת תפוסה, אנא בחרו זמן אחר" },
        { status: 409 }
      );
    }

    console.error("[ADMIN_BOOKINGS_POST]", error);
    return NextResponse.json(
      { error: "שגיאת שרת, אנא נסו שוב מאוחר יותר" },
      { status: 500 }
    );
  }
}
