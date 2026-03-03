import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Check if booking is in the past
    if (new Date(booking.startAt) < new Date()) {
      return NextResponse.json(
        { error: "לא ניתן לבטל תור שכבר עבר" },
        { status: 400 }
      );
    }

    // Check 24h cancellation window
    const hoursUntil =
      (new Date(booking.startAt).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 24) {
      return NextResponse.json(
        { error: "ניתן לבטל עד 24 שעות לפני התור. לביטול צרו קשר טלפוני" },
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

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[CANCEL_BOOKING]", error);
    return NextResponse.json(
      { error: "שגיאת שרת, אנא נסו שוב מאוחר יותר" },
      { status: 500 }
    );
  }
}
