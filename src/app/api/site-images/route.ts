import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET all site images (public)
export async function GET() {
  try {
    const images = await prisma.siteImage.findMany({
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    });

    // Hero is an array (carousel), others are single
    const heroImages = images
      .filter((img) => img.section === "hero" && img.imagePath)
      .map((img) => ({ imagePath: img.imagePath, alt: img.alt }));

    const result: Record<string, unknown> = {};
    for (const img of images) {
      if (img.section !== "hero" && img.imagePath) {
        result[img.section] = { imagePath: img.imagePath, alt: img.alt };
      }
    }
    if (heroImages.length > 0) {
      result.hero = heroImages;
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[SITE_IMAGES_PUBLIC_GET]", error);
    return NextResponse.json({ data: {} });
  }
}
