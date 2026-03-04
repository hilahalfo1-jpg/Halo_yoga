import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all site content
export async function GET() {
  try {
    const content = await prisma.siteContent.findMany({
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json({ data: content });
  } catch (error) {
    console.error("[SITE_CONTENT_GET]", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת תוכן" },
      { status: 500 }
    );
  }
}

// POST - create or update site content
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { section, key, value, sortOrder } = body;

    if (!section || !key) {
      return NextResponse.json(
        { error: "חסרים שדות חובה" },
        { status: 400 }
      );
    }

    const content = await prisma.siteContent.upsert({
      where: { section_key: { section, key } },
      update: { value: value ?? "", sortOrder: sortOrder ?? 0 },
      create: { section, key, value: value ?? "", sortOrder: sortOrder ?? 0 },
    });

    return NextResponse.json({ data: content });
  } catch (error) {
    console.error("[SITE_CONTENT_POST]", error);
    return NextResponse.json(
      { error: "שגיאה בשמירת תוכן" },
      { status: 500 }
    );
  }
}

// DELETE - remove site content by id
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
    }

    await prisma.siteContent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SITE_CONTENT_DELETE]", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת תוכן" },
      { status: 500 }
    );
  }
}
