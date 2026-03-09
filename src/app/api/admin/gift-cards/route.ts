import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — list all gift cards
export async function GET() {
  try {
    const giftCards = await prisma.giftCard.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: giftCards });
  } catch (error) {
    console.error("[GIFT_CARDS_GET]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// POST — create a new gift card
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { recipientName, senderName, serviceName, message } = body;

    if (!recipientName || !serviceName || !message) {
      return NextResponse.json(
        { error: "יש למלא את כל השדות הנדרשים" },
        { status: 400 }
      );
    }

    const giftCard = await prisma.giftCard.create({
      data: {
        recipientName,
        senderName: senderName || null,
        serviceName,
        message,
      },
    });

    return NextResponse.json({ data: giftCard }, { status: 201 });
  } catch (error) {
    console.error("[GIFT_CARDS_POST]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
