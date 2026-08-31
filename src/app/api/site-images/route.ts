import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MULTI_IMAGE_SECTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

// GET all site images (public)
export async function GET() {
  try {
    const images = await prisma.siteImage.findMany({
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    });

    // Gallery sections (hero, certifications) are arrays, others are single
    const result: Record<string, unknown> = {};
    for (const img of images) {
      if (!MULTI_IMAGE_SECTIONS.includes(img.section) && img.imagePath) {
        result[img.section] = { imagePath: img.imagePath, alt: img.alt };
      }
    }
    for (const section of MULTI_IMAGE_SECTIONS) {
      const galleryImages = images
        .filter((img) => img.section === section && img.imagePath)
        .map((img) => ({ imagePath: img.imagePath, alt: img.alt }));
      if (galleryImages.length > 0) {
        result[section] = galleryImages;
      }
    }

    return NextResponse.json({ data: result }, {
      // revalidatePath doesn't purge route-handler CDN cache; staleness bound: s-maxage=60
      // + SWR up to ~6min, and the client module cache holds until page reload.
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("[SITE_IMAGES_PUBLIC_GET]", error);
    return NextResponse.json({ data: {} }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }
}
