import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.siteContent.findMany({
      // "settings" holds private admin config (e.g. the iCloud calendar URL) — never expose it on this public, CDN-cached endpoint
      where: { section: { not: "settings" } },
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
      // revalidatePath doesn't purge route-handler CDN cache; staleness bound: s-maxage=60
      // + SWR up to ~6min, and the client module cache holds until page reload.
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (error) {
    console.error("[SITE_CONTENT_PUBLIC_GET]", error);
    return NextResponse.json(
      { data: {} },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}
