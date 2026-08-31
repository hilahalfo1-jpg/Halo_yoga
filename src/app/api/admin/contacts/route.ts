import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { contactKey } from "@/lib/phone";
import {
  adminContactSchema,
  adminContactLenientSchema,
  adminContactPatchSchema,
  adminContactLenientPatchSchema,
} from "@/lib/validations";

// NOTE: the Contact table is NEW — requires `prisma db push` at deploy.
// Until the table exists in the production DB, this route errors (500).

// Always compute live data — without this, Next statically snapshots this GET at build time
export const dynamic = "force-dynamic";

interface UnifiedContact {
  identifier: string;
  name: string;
  phone: string;
  email: string | null;
  sources: ("booking" | "attempt")[];
  bookingCount: number;
  attemptCount: number;
  lastInteraction: string;
  lastBookingStatus: string | null;
  lastBookingId: string | null;
  lastAttemptReason: string | null;
  notes: string[];
  // Overlay (Contact table) — null for purely derived entries
  contactId: string | null;
  contactNotes: string | null;
}

export async function GET() {
  try {
    const [bookings, attempts] = await Promise.all([
      prisma.booking.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          status: true,
          adminNotes: true,
          createdAt: true,
        },
      }),
      prisma.bookingAttempt.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          reason: true,
          createdAt: true,
        },
      }),
    ]);

    const contactsMap = new Map<string, UnifiedContact>();

    for (const b of bookings) {
      const key = contactKey(b.customerPhone, b.customerEmail);
      if (!key) continue;
      const existing = contactsMap.get(key);
      const interaction = b.createdAt.toISOString();
      if (existing) {
        existing.sources.push("booking");
        existing.bookingCount += 1;
        if (interaction > existing.lastInteraction) {
          existing.lastInteraction = interaction;
          existing.name = b.customerName;
          existing.email = existing.email || b.customerEmail;
          existing.lastBookingStatus = b.status;
          existing.lastBookingId = b.id;
        }
        if (b.adminNotes) existing.notes.push(b.adminNotes);
      } else {
        contactsMap.set(key, {
          identifier: key,
          name: b.customerName,
          phone: b.customerPhone,
          email: b.customerEmail,
          sources: ["booking"],
          bookingCount: 1,
          attemptCount: 0,
          lastInteraction: interaction,
          lastBookingStatus: b.status,
          lastBookingId: b.id,
          lastAttemptReason: null,
          notes: b.adminNotes ? [b.adminNotes] : [],
          contactId: null,
          contactNotes: null,
        });
      }
    }

    for (const a of attempts) {
      const key = contactKey(a.customerPhone, a.customerEmail);
      if (!key) continue;
      const existing = contactsMap.get(key);
      const interaction = a.createdAt.toISOString();
      if (existing) {
        existing.sources.push("attempt");
        existing.attemptCount += 1;
        if (interaction > existing.lastInteraction) {
          existing.lastInteraction = interaction;
          existing.email = existing.email || a.customerEmail;
          existing.lastAttemptReason = a.reason;
        } else if (!existing.lastAttemptReason) {
          existing.lastAttemptReason = a.reason;
        }
      } else {
        contactsMap.set(key, {
          identifier: key,
          name: a.customerName,
          phone: a.customerPhone,
          email: a.customerEmail,
          sources: ["attempt"],
          bookingCount: 0,
          attemptCount: 1,
          lastInteraction: interaction,
          lastBookingStatus: null,
          lastBookingId: null,
          lastAttemptReason: a.reason,
          notes: [],
          contactId: null,
          contactNotes: null,
        });
      }
    }

    // ── Overlay: Contact rows override / hide / extend the derived list ──
    const contactRows = await prisma.contact.findMany();
    const rowsByKey = new Map(contactRows.map((r) => [r.normalizedKey, r]));

    const merged: UnifiedContact[] = [];
    const resurfaceIds: string[] = [];
    for (const derived of Array.from(contactsMap.values())) {
      const row = rowsByKey.get(derived.identifier);
      if (!row) {
        merged.push(derived);
        continue;
      }
      if (row.isHidden) {
        if (derived.lastInteraction > row.updatedAt.toISOString()) {
          // Hidden contact interacted again — resurface (clear the flag below)
          resurfaceIds.push(row.id);
        } else {
          continue; // stays hidden
        }
      }
      merged.push({
        ...derived,
        name: row.name,
        phone: row.phone,
        email: row.email,
        contactId: row.id,
        contactNotes: row.notes,
      });
    }

    // Manual contacts with no derived history
    for (const row of contactRows) {
      if (!row.isManual || row.isHidden || contactsMap.has(row.normalizedKey)) continue;
      merged.push({
        identifier: row.normalizedKey,
        name: row.name,
        phone: row.phone,
        email: row.email,
        sources: [],
        bookingCount: 0,
        attemptCount: 0,
        lastInteraction: row.createdAt.toISOString(),
        lastBookingStatus: null,
        lastBookingId: null,
        lastAttemptReason: null,
        notes: [],
        contactId: row.id,
        contactNotes: row.notes,
      });
    }

    if (resurfaceIds.length > 0) {
      await prisma.contact.updateMany({
        where: { id: { in: resurfaceIds } },
        data: { isHidden: false },
      });
    }

    const contacts = merged.sort((a, b) =>
      b.lastInteraction.localeCompare(a.lastInteraction)
    );

    return NextResponse.json({ data: contacts });
  } catch (error) {
    console.error("[CONTACTS_GET]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// Does this key have derived history (booking / attempt)?
async function keyHasDerivedHistory(normalizedKey: string): Promise<boolean> {
  const [bookingIdentifiers, attemptIdentifiers] = await Promise.all([
    prisma.booking.findMany({ select: { customerPhone: true, customerEmail: true } }),
    prisma.bookingAttempt.findMany({ select: { customerPhone: true, customerEmail: true } }),
  ]);
  return [...bookingIdentifiers, ...attemptIdentifiers].some(
    (r) => contactKey(r.customerPhone, r.customerEmail) === normalizedKey
  );
}

// POST — create a Contact row (manual contact, or first edit/hide of a derived entry).
// isManual is decided server-side: true only when the key has no derived history.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Strict schema first. If only the phone fails it, retry leniently — a
    // derived card with a legacy/foreign phone or an email-only key must stay
    // hide/editable. The lenient result is honored ONLY when the key already
    // has derived booking/attempt history; brand-new manual contacts keep the
    // strict 05X phone validation.
    const strict = adminContactSchema.safeParse(body);
    let data: z.infer<typeof adminContactSchema>;
    let knownDerived = false;
    if (strict.success) {
      data = strict.data;
    } else {
      const lenient = adminContactLenientSchema.safeParse(body);
      const lenientKey = lenient.success
        ? contactKey(lenient.data.phone, lenient.data.email)
        : "";
      if (!lenient.success || !lenientKey || !(await keyHasDerivedHistory(lenientKey))) {
        return NextResponse.json(
          { error: "נתונים לא תקינים", details: strict.error.flatten() },
          { status: 400 }
        );
      }
      data = lenient.data;
      knownDerived = true;
    }

    const { name, phone, email, notes } = data;
    const normalizedKey = contactKey(phone, email);

    const existing = await prisma.contact.findUnique({ where: { normalizedKey } });
    if (existing) {
      if (existing.isHidden) {
        // Re-adding a hidden contact revives it instead of dead-ending on 409
        const contact = await prisma.contact.update({
          where: { id: existing.id },
          data: {
            isHidden: false,
            name,
            phone,
            email: email || null,
            notes: notes || null,
          },
        });
        return NextResponse.json({ data: contact });
      }
      return NextResponse.json(
        { error: "איש קשר עם המספר הזה כבר קיים ברשימה" },
        { status: 409 }
      );
    }

    const hasDerived = knownDerived || (await keyHasDerivedHistory(normalizedKey));

    const contact = await prisma.contact.create({
      data: {
        normalizedKey,
        name,
        phone,
        email: email || null,
        notes: notes || null,
        isManual: !hasDerived,
      },
    });

    return NextResponse.json({ data: contact }, { status: 201 });
  } catch (error) {
    // Non-atomic check-then-write race on normalizedKey
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "איש קשר עם המספר הזה כבר קיים ברשימה" },
        { status: 409 }
      );
    }
    console.error("[CONTACTS_POST]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// PATCH — edit a Contact row by id. Changing phone/email recomputes normalizedKey;
// collision with another Contact ROW → 409. Colliding with a derived-only key is
// accepted by design — the edited row then overlays that customer's history.
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    // Same leniency rule as POST: overlay rows for derived history may carry a
    // legacy/foreign or empty phone. Strict parse first; a lenient retry is
    // honored ONLY when the resulting key is non-empty AND either stays the
    // patched row's own key or has derived booking/attempt history.
    const strict = adminContactPatchSchema.safeParse(body);
    let parsed: z.infer<typeof adminContactPatchSchema>;
    if (strict.success) {
      parsed = strict.data;
    } else {
      const lenient = adminContactLenientPatchSchema.safeParse(body);
      if (!lenient.success) {
        return NextResponse.json(
          { error: "נתונים לא תקינים", details: strict.error.flatten() },
          { status: 400 }
        );
      }
      const row = await prisma.contact.findUnique({
        where: { id: lenient.data.id },
      });
      const key = row
        ? contactKey(
            lenient.data.phone ?? row.phone,
            lenient.data.email !== undefined
              ? lenient.data.email || null
              : row.email
          )
        : "";
      const honored =
        !!row &&
        !!key &&
        (key === row.normalizedKey || (await keyHasDerivedHistory(key)));
      if (!honored) {
        return NextResponse.json(
          { error: "נתונים לא תקינים", details: strict.error.flatten() },
          { status: 400 }
        );
      }
      parsed = lenient.data;
    }

    const { id, name, phone, email, notes } = parsed;
    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "איש הקשר לא נמצא" }, { status: 404 });
    }

    const data: {
      name?: string;
      phone?: string;
      email?: string | null;
      notes?: string | null;
      normalizedKey?: string;
    } = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email || null;
    if (notes !== undefined) data.notes = notes || null;

    const nextPhone = phone ?? existing.phone;
    const nextEmail = email !== undefined ? email || null : existing.email;
    const normalizedKey = contactKey(nextPhone, nextEmail);
    if (normalizedKey !== existing.normalizedKey) {
      const collision = await prisma.contact.findUnique({ where: { normalizedKey } });
      if (collision && collision.id !== id) {
        return NextResponse.json(
          { error: "המספר החדש כבר שייך לאיש קשר אחר ברשימה" },
          { status: 409 }
        );
      }
      data.normalizedKey = normalizedKey;
    }

    const contact = await prisma.contact.update({ where: { id }, data });
    return NextResponse.json({ data: contact });
  } catch (error) {
    // Non-atomic check-then-write race on normalizedKey
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "המספר החדש כבר שייך לאיש קשר אחר ברשימה" },
        { status: 409 }
      );
    }
    console.error("[CONTACTS_PATCH]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// DELETE ?id= — hide the contact (isHidden). Contacts with no derived history
// are actually deleted. Derived history is re-checked live (the stored isManual
// is frozen at creation — a manual contact who later booked must be hidden, not
// hard-deleted, or it would instantly resurface as derived without its notes).
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
    }

    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "איש הקשר לא נמצא" }, { status: 404 });
    }

    const hasDerived = await keyHasDerivedHistory(existing.normalizedKey);
    if (!hasDerived) {
      await prisma.contact.delete({ where: { id } });
    } else {
      await prisma.contact.update({ where: { id }, data: { isHidden: true } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CONTACTS_DELETE]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
