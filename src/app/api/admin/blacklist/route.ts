import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Normalize identifier: lowercase, strip spaces/dashes */
function normalize(val: string): string {
  return val.toLowerCase().replace(/[\s\-()]/g, "");
}

// GET — list all blacklisted entries
export async function GET() {
  try {
    const items = await prisma.blacklist.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("[BLACKLIST_GET]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// POST — add to blacklist
export async function POST(req: Request) {
  try {
    const { identifier, reason } = await req.json();

    if (!identifier || typeof identifier !== "string" || identifier.trim().length < 3) {
      return NextResponse.json({ error: "יש להזין טלפון או אימייל תקין" }, { status: 400 });
    }

    const normalized = normalize(identifier.trim());
    const isEmail = normalized.includes("@");
    const type = isEmail ? "EMAIL" : "PHONE";

    // Check if already exists
    const existing = await prisma.blacklist.findUnique({
      where: { identifier: normalized },
    });
    if (existing) {
      return NextResponse.json({ error: "כבר קיים ברשימה" }, { status: 409 });
    }

    const item = await prisma.blacklist.create({
      data: {
        identifier: normalized,
        type,
        reason: reason || null,
      },
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    console.error("[BLACKLIST_POST]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// DELETE — remove from blacklist
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await prisma.blacklist.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[BLACKLIST_DELETE]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
