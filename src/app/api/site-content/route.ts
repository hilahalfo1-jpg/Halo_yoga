import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.siteContent.findMany({
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    });

    // Group by section, then by key
    const result: Record<string, Record<string, string>> = {};

    for (const row of rows) {
      if (!result[row.section]) {
        result[row.section] = {};
      }
      result[row.section][row.key] = row.value;
    }

    return NextResponse.json(
      { data: result },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error) {
    console.error("[SITE_CONTENT_PUBLIC_GET]", error);
    return NextResponse.json(
      { data: {} },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}
