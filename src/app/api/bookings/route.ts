import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots, isSlotAvailable } from "@/lib/slots";
import { bookingSchema } from "@/lib/validations";

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

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "תאריך לא תקין" },
        { status: 400 }
      );
    }

    const slots = await getAvailableSlots(date, serviceId);
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

    const { serviceId, startAt, customerName, customerPhone, customerEmail, notes, isHomeVisit: homeVisitFlag } =
      validated.data;

    const isHomeVisit = homeVisitFlag === true;

    // Get service for duration
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

    const startDate = new Date(startAt);
    const endDate = new Date(startDate.getTime() + service.duration * 60 * 1000);

    // Re-check availability inside transaction
    const available = await isSlotAvailable(startDate, endDate);
    if (!available) {
      return NextResponse.json(
        { error: "הזמן שבחרת כבר לא פנוי, אנא בחרו זמן אחר" },
        { status: 409 }
      );
    }

    const booking = await prisma.booking.create({
      data: {
        serviceId,
        startAt: startDate,
        endAt: endDate,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        notes: notes || null,
        status: "PENDING",
        isHomeVisit,
        homeVisitSurcharge: isHomeVisit ? (service.homeVisitSurcharge || 0) : null,
      },
      include: { service: true },
    });

    return NextResponse.json({ data: booking }, { status: 201 });
  } catch (error) {
    // Handle unique constraint violation (double booking)
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
