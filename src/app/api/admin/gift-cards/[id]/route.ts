import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { giftCardPatchSchema } from "@/lib/validations";
import { sendWaFlow, splitName } from "@/lib/manychat";

// DELETE — delete a gift card; a linked still-PENDING booking is REJECTED
// so its slot frees up
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const card = await prisma.giftCard.findUnique({
      where: { id: params.id },
    });
    if (!card) {
      return NextResponse.json({ error: "גיפט קארד לא נמצא" }, { status: 404 });
    }

    if (card.bookingId) {
      await prisma.booking.updateMany({
        where: { id: card.bookingId, status: "PENDING" },
        data: { status: "REJECTED" },
      });
    }

    await prisma.giftCard.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[GIFT_CARD_DELETE]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// PATCH — mark as redeemed / approve a pending order (status → ACTIVE)
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validated = giftCardPatchSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    // waMark — stamp a manual WhatsApp send (admin button) and EARLY-RETURN
    // before any status logic. Idempotent overwrite.
    if (validated.data.waMark === "giftApproved") {
      const giftCard = await prisma.giftCard.update({
        where: { id: params.id },
        data: { waApprovedSentAt: new Date() },
      });
      return NextResponse.json({ data: giftCard });
    }

    if (validated.data.status === "ACTIVE") {
      // Approval — the 1-year expiry runs from approval/payment, not from the
      // order. Guarded on status PENDING so re-sending ACTIVE is a no-op and
      // can never silently extend an existing expiry.
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      const { count } = await prisma.giftCard.updateMany({
        where: { id: params.id, status: "PENDING" },
        data: { status: "ACTIVE", expiresAt },
      });

      // WhatsApp to the purchaser — only on a GENUINE approval (count === 1);
      // the PENDING guard IS the idempotency (a re-PATCH matches 0 rows).
      // Best-effort: failures logged, never fail the request.
      if (count === 1) {
        try {
          const waTask = async () => {
            const card = await prisma.giftCard.findUnique({
              where: { id: params.id },
            });
            if (!card?.purchaserPhone) {
              console.log(
                `[MANYCHAT] giftApproved skipped for ${params.id}: no purchaser phone`
              );
              return;
            }
            const { firstName, lastName } = splitName(card.purchaserName || "");
            const siteUrl =
              process.env.NEXTAUTH_URL || "https://haloyogamassage.com";
            const result = await sendWaFlow(
              "giftApproved",
              card.purchaserPhone,
              firstName,
              lastName,
              // Always set card_url — ManyChat custom fields persist per
              // subscriber, so omitting it would render a repeat purchaser's
              // STALE link (or an empty one on the first).
              { card_url: `${siteUrl}/gift-card/${card.code}` },
              card.purchaserEmail
            );
            if (result.sent) {
              await prisma.giftCard.update({
                where: { id: card.id },
                data: { waApprovedSentAt: new Date() },
              });
            }
          };
          // Bounded: never let a slow ManyChat chain hold the approval
          // response. On timeout this path writes no stamp, though a
          // late-completing send may still stamp afterwards (benign — the
          // stamp only follows a real send); the manual WhatsApp button
          // remains the fallback.
          let timer: ReturnType<typeof setTimeout> | undefined;
          const timedOut = await Promise.race([
            waTask().then(() => false),
            new Promise<boolean>((resolve) => {
              timer = setTimeout(() => resolve(true), 8000);
            }),
          ]);
          clearTimeout(timer);
          if (timedOut) console.log("[MANYCHAT] giftApproved timed out");
        } catch (waError) {
          console.error("[MANYCHAT] giftApproved failed:", waError);
        }
      }
    }

    if (validated.data.isRedeemed !== undefined) {
      const giftCard = await prisma.giftCard.update({
        where: { id: params.id },
        data: {
          isRedeemed: validated.data.isRedeemed,
          redeemedAt: validated.data.isRedeemed ? new Date() : null,
        },
      });
      return NextResponse.json({ data: giftCard });
    }

    const giftCard = await prisma.giftCard.findUnique({
      where: { id: params.id },
    });
    if (!giftCard) {
      return NextResponse.json({ error: "גיפט קארד לא נמצא" }, { status: 404 });
    }
    return NextResponse.json({ data: giftCard });
  } catch (error) {
    console.error("[GIFT_CARD_PATCH]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
