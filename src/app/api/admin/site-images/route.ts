import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all site images
export async function GET() {
  try {
    const images = await prisma.siteImage.findMany({
      orderBy: { section: "asc" },
    });
    return NextResponse.json({ data: images });
  } catch (error) {
    console.error("[SITE_IMAGES_GET]", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת תמונות" },
      { status: 500 }
    );
  }
}

// POST/PUT - upsert a site image for a section
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { section, imagePath, alt } = body;

    if (!section || !imagePath) {
      return NextResponse.json(
        { error: "חסרים שדות חובה" },
        { status: 400 }
      );
    }

    const image = await prisma.siteImage.upsert({
      where: { section },
      create: { section, imagePath, alt: alt || "" },
      update: { imagePath, alt: alt || "" },
    });

    return NextResponse.json({ data: image });
  } catch (error) {
    console.error("[SITE_IMAGES_POST]", error);
    return NextResponse.json(
      { error: "שגיאה בשמירת תמונה" },
      { status: 500 }
    );
  }
}
