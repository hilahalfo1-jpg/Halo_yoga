import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE — delete a gift card
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.giftCard.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[GIFT_CARD_DELETE]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// PATCH — mark as redeemed
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.isRedeemed !== undefined) {
      data.isRedeemed = body.isRedeemed;
      data.redeemedAt = body.isRedeemed ? new Date() : null;
    }

    const giftCard = await prisma.giftCard.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ data: giftCard });
  } catch (error) {
    console.error("[GIFT_CARD_PATCH]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
