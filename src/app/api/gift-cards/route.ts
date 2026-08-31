import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  validateSlotForBooking,
  createBookingInTransaction,
  SlotTakenError,
} from "@/lib/slots";
import { giftCardOrderSchema } from "@/lib/validations";
import { normalizeIdentifier } from "@/lib/phone";
import { sendNewGiftOrderAdminEmail } from "@/lib/email";

const DEFAULT_GIFT_MESSAGE = "מגיע לך רגע של פינוק ורוגע. מתנה באהבה 🤍";

const SLOT_TAKEN_MESSAGE = "הזמן שבחרת כבר לא פנוי, אנא בחרו זמן אחר";

// POST — public gift-card order (PENDING until Hila approves + collects payment)
export async function POST(req: Request) {
  // Card created by this request but not yet committed — deleted on failure
  let createdCardId: string | null = null;
  try {
    const body = await req.json();
    const validated = giftCardOrderSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const {
      serviceId,
      purchaserName,
      purchaserPhone,
      purchaserEmail,
      recipientName,
      message,
      template,
      date,
      startTime,
    } = validated.data;

    // Shadow ban check — silently reject blocked users with fake success
    const normalizedPhone = normalizeIdentifier(purchaserPhone);
    const normalizedEmail = purchaserEmail
      ? normalizeIdentifier(purchaserEmail)
      : null;

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
      console.log("[SHADOW_BAN] Blocked gift order attempt from:", blockedEntry.identifier);
      return NextResponse.json({ data: { ok: true } }, { status: 201 });
    }

    // Throttle: max 3 orders per purchaser phone per hour, max 30 globally per
    // hour. Compared on the NORMALIZED phone so hyphen variants share a bucket.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCards = await prisma.giftCard.findMany({
      where: { createdAt: { gte: oneHourAgo } },
      select: { purchaserPhone: true },
    });
    const globalCount = recentCards.length;
    const phoneCount = recentCards.filter(
      (c) =>
        c.purchaserPhone &&
        normalizeIdentifier(c.purchaserPhone) === normalizedPhone
    ).length;
    if (phoneCount >= 3 || globalCount >= 30) {
      console.warn(
        `[THROTTLE] gift-cards POST blocked (phoneCount=${phoneCount}, globalCount=${globalCount})`
      );
      return NextResponse.json(
        { error: "יותר מדי פניות, אנא נסו שוב מאוחר יותר" },
        { status: 429 }
      );
    }

    // Resolve the service → serviceName snapshot
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { name: true, isActive: true },
    });
    if (!service || !service.isActive) {
      return NextResponse.json({ error: "שירות לא נמצא" }, { status: 404 });
    }

    // (a) If a slot was requested, validate it FIRST — nothing is created on failure
    const hasSlotRequest = date !== undefined && startTime !== undefined;
    let slot: { startAt: Date; endAt: Date } | null = null;
    if (hasSlotRequest) {
      slot = await validateSlotForBooking(date, startTime, serviceId);
      if (!slot) {
        return NextResponse.json({ error: SLOT_TAKEN_MESSAGE }, { status: 409 });
      }
    }

    // (b) Create the PENDING gift card (expiresAt stays null — set at approval)
    const giftCard = await prisma.giftCard.create({
      data: {
        recipientName,
        senderName: purchaserName,
        serviceName: service.name,
        message: message?.trim() || DEFAULT_GIFT_MESSAGE,
        template,
        status: "PENDING",
        expiresAt: null,
        purchaserName,
        purchaserPhone,
        purchaserEmail: purchaserEmail || null,
      },
    });
    createdCardId = giftCard.id;

    // (c) Create the linked PENDING booking when a slot was validated.
    // customerName is the PURCHASER — Hila calls them to collect payment, and
    // the derived contacts list names cards from the latest booking.
    let bookingStartAt: Date | null = null;
    if (slot) {
      try {
        const booking = await createBookingInTransaction(
          {
            serviceId,
            startAt: slot.startAt,
            endAt: slot.endAt,
            customerName: purchaserName,
            customerPhone: purchaserPhone,
            customerEmail: purchaserEmail || null,
            notes: `🎁 מתנה עבור ${recipientName} — ממתין לאישור גיפט קארד`,
            status: "PENDING",
          },
          { startAt: slot.startAt, endAt: slot.endAt }
        );
        bookingStartAt = slot.startAt;
        // (d) Link the booking onto the card
        await prisma.giftCard.update({
          where: { id: giftCard.id },
          data: { bookingId: booking.id },
        });
      } catch (txError) {
        const isSlotTaken =
          txError instanceof SlotTakenError ||
          (txError &&
            typeof txError === "object" &&
            "code" in txError &&
            (txError as { code: string }).code === "P2034");
        if (isSlotTaken) {
          // Don't leave an orphan card that Hila would approve without a slot
          try {
            await prisma.giftCard.delete({ where: { id: giftCard.id } });
            createdCardId = null;
          } catch (cleanupError) {
            console.error(
              "[GIFT_CARDS_CLEANUP] failed to delete orphan PENDING card",
              giftCard.id,
              cleanupError
            );
          }
          return NextResponse.json({ error: SLOT_TAKEN_MESSAGE }, { status: 409 });
        }
        throw txError;
      }
    }

    // Flow committed — the card (and its linked booking) are legitimate now
    createdCardId = null;

    // Notify Hila (awaited — failures logged, never fail the response)
    const emailResults = await Promise.allSettled([
      sendNewGiftOrderAdminEmail({
        purchaserName,
        purchaserPhone,
        purchaserEmail: purchaserEmail || null,
        recipientName,
        serviceName: service.name,
        startAt: bookingStartAt,
      }),
    ]);
    emailResults.forEach((r) => {
      if (r.status === "rejected") console.error("[EMAIL_GIFT_ORDER]", r.reason);
    });

    // Never return the card code/URL — the link is shared only after approval
    return NextResponse.json({ data: { ok: true } }, { status: 201 });
  } catch (error) {
    // No orphan PENDING card survives a 500
    if (createdCardId) {
      try {
        await prisma.giftCard.delete({ where: { id: createdCardId } });
      } catch (cleanupError) {
        console.error(
          "[GIFT_CARDS_CLEANUP] failed to delete orphan PENDING card",
          createdCardId,
          cleanupError
        );
      }
    }
    console.error("[GIFT_CARDS_PUBLIC_POST]", error);
    return NextResponse.json(
      { error: "שגיאת שרת, אנא נסו שוב מאוחר יותר" },
      { status: 500 }
    );
  }
}
