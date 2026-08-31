import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — list all gift cards (+ linked booking snapshot for pending orders)
export async function GET() {
  try {
    const giftCards = await prisma.giftCard.findMany({
      orderBy: { createdAt: "desc" },
    });
    const bookingIds = giftCards
      .map((c) => c.bookingId)
      .filter((id): id is string => !!id);
    const bookings = bookingIds.length
      ? await prisma.booking.findMany({
          where: { id: { in: bookingIds } },
          select: { id: true, startAt: true, status: true },
        })
      : [];
    const bookingById = new Map(bookings.map((b) => [b.id, b]));
    const data = giftCards.map((c) => ({
      ...c,
      booking: c.bookingId ? bookingById.get(c.bookingId) ?? null : null,
    }));
    return NextResponse.json({ data });
  } catch (error) {
    console.error("[GIFT_CARDS_GET]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// POST — create a new gift card
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { recipientName, senderName, serviceName, message, template } = body;

    if (!recipientName || !serviceName || !message) {
      return NextResponse.json(
        { error: "יש למלא את כל השדות הנדרשים" },
        { status: 400 }
      );
    }

    const ALLOWED_TEMPLATES = ["botanical", "minimal", "festive", "gold", "romantic"];
    const safeTemplate = ALLOWED_TEMPLATES.includes(template) ? template : "botanical";

    // Admin-created cards are immediately ACTIVE — expiry runs from creation
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const giftCard = await prisma.giftCard.create({
      data: {
        recipientName,
        senderName: senderName || null,
        serviceName,
        message,
        template: safeTemplate,
        expiresAt,
      },
    });

    return NextResponse.json({ data: giftCard }, { status: 201 });
  } catch (error) {
    console.error("[GIFT_CARDS_POST]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
