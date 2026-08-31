import { prisma } from "@/lib/prisma";

/**
 * Server-side fetch of the SiteContent map, grouped as { section: { key: value } }.
 * Use in Server Components to read editable text without a client hydration flash.
 * Falls back to an empty map on error so callers can rely on their own defaults.
 */
export async function getSiteContent(): Promise<
  Record<string, Record<string, string>>
> {
  try {
    const rows = await prisma.siteContent.findMany({
      // "settings" holds private admin config (e.g. the iCloud calendar URL) — never expose it to public pages
      where: { section: { not: "settings" } },
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    });

    const result: Record<string, Record<string, string>> = {};
    for (const row of rows) {
      if (!result[row.section]) result[row.section] = {};
      result[row.section][row.key] = row.value;
    }
    return result;
  } catch (error) {
    console.error("[GET_SITE_CONTENT]", error);
    return {};
  }
}
