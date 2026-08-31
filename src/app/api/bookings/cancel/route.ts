import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CANCELLATION_CUTOFF_HOURS } from "@/lib/constants";
import { sendBookingCancelledAdminEmail } from "@/lib/email";

// POST cancel booking by token
export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { error: "חסר טוקן ביטול" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { cancelToken: token },
      include: { service: true },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "הזמנה לא נמצאה" },
        { status: 404 }
      );
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json(
        { error: "ההזמנה כבר בוטלה" },
        { status: 400 }
      );
    }

    // Only PENDING/CONFIRMED bookings can be cancelled
    if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
      return NextResponse.json(
        { error: "לא ניתן לבטל הזמנה זו" },
        { status: 400 }
      );
    }

    // Check if booking is in the past
    if (new Date(booking.startAt) < new Date()) {
      return NextResponse.json(
        { error: "לא ניתן לבטל תור שכבר עבר" },
        { status: 400 }
      );
    }

    // Check cancellation window
    const hoursUntil =
      (new Date(booking.startAt).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < CANCELLATION_CUTOFF_HOURS) {
      return NextResponse.json(
        { error: `ניתן לבטל עד ${CANCELLATION_CUTOFF_HOURS} שעות לפני התור. לביטול צרו קשר טלפוני` },
        { status: 400 }
      );
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
      include: { service: true },
    });

    // Notify Hila (awaited — failures logged, never fail the response)
    const emailResults = await Promise.allSettled([
      sendBookingCancelledAdminEmail({
        customerName: booking.customerName,
        customerEmail: booking.customerEmail || "",
        customerPhone: booking.customerPhone,
        serviceName: booking.service.name,
        startAt: booking.startAt,
      }),
    ]);
    emailResults.forEach((r) => {
      if (r.status === "rejected") console.error("[EMAIL_CANCEL_ADMIN]", r.reason);
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[CANCEL_BOOKING]", error);
    return NextResponse.json(
      { error: "שגיאת שרת, אנא נסו שוב מאוחר יותר" },
      { status: 500 }
    );
  }
}
