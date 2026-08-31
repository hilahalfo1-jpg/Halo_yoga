import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MULTI_IMAGE_SECTIONS } from "@/lib/constants";

// GET all site images
export async function GET() {
  try {
    const images = await prisma.siteImage.findMany({
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
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

// POST - add or update a site image
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, section, imagePath, alt, sortOrder } = body;

    if (!section || !imagePath) {
      return NextResponse.json(
        { error: "חסרים שדות חובה" },
        { status: 400 }
      );
    }

    let image;
    if (id) {
      // Update existing — preserve the current sortOrder when none is sent
      image = await prisma.siteImage.update({
        where: { id },
        data: {
          imagePath,
          alt: alt || "",
          ...(typeof sortOrder === "number" && { sortOrder }),
        },
      });
    } else {
      // For single-image sections, upsert (replace existing)
      if (!MULTI_IMAGE_SECTIONS.includes(section)) {
        const existing = await prisma.siteImage.findFirst({
          where: { section },
        });
        if (existing) {
          image = await prisma.siteImage.update({
            where: { id: existing.id },
            data: { imagePath, alt: alt || "" },
          });
        } else {
          image = await prisma.siteImage.create({
            data: { section, imagePath, alt: alt || "" },
          });
        }
      } else {
        // Gallery sections (hero, certifications): add new (multiple allowed)
        const maxSort = await prisma.siteImage.findFirst({
          where: { section },
          orderBy: { sortOrder: "desc" },
        });
        image = await prisma.siteImage.create({
          data: {
            section,
            imagePath,
            alt: alt || "",
            sortOrder: (maxSort?.sortOrder ?? -1) + 1,
          },
        });
      }
    }

    revalidatePath("/", "layout");
    return NextResponse.json({ data: image });
  } catch (error) {
    console.error("[SITE_IMAGES_POST]", error);
    return NextResponse.json(
      { error: "שגיאה בשמירת תמונה" },
      { status: 500 }
    );
  }
}

// DELETE - remove a site image by id
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
    }

    await prisma.siteImage.delete({ where: { id } });
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SITE_IMAGES_DELETE]", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת תמונה" },
      { status: 500 }
    );
  }
}
