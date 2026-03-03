import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all site images (public, cached)
export async function GET() {
  try {
    const images = await prisma.siteImage.findMany();
    // Transform into a section -> { imagePath, alt } map for easy consumption
    const imageMap: Record<string, { imagePath: string; alt: string }> = {};
    for (const img of images) {
      imageMap[img.section] = { imagePath: img.imagePath, alt: img.alt };
    }
    return NextResponse.json({ data: imageMap });
  } catch (error) {
    console.error("[SITE_IMAGES_PUBLIC_GET]", error);
    return NextResponse.json({ data: {} });
  }
}
