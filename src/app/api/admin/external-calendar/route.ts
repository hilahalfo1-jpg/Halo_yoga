import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  fetchAndParseIcs,
  parseCalendarUrlList,
  type BusyInterval,
} from "@/lib/external-calendar";
import { toIsraelDateKey, utcToIsraelTimeStr } from "@/lib/time";

// Auth: covered by the middleware matcher ("/api/admin/:path*").
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const CHECK_WINDOW_DAYS = 60;

function formatIsraelDate(d: Date): string {
  const [y, m, day] = toIsraelDateKey(d).split("-");
  return `${day}.${m}.${y}`;
}

function formatInterval(interval: BusyInterval): {
  start: string;
  end: string;
  allDay: boolean;
} {
  if (interval.allDay) {
    // End is exclusive — show the last blocked day.
    const lastDay = new Date(interval.end.getTime() - 1);
    return {
      start: formatIsraelDate(interval.start),
      end: formatIsraelDate(lastDay),
      allDay: true,
    };
  }
  return {
    start: `${formatIsraelDate(interval.start)} ${utcToIsraelTimeStr(interval.start)}`,
    end: `${formatIsraelDate(interval.end)} ${utcToIsraelTimeStr(interval.end)}`,
    allDay: false,
  };
}

interface LinkCheckResult {
  url: string;
  ok: boolean;
  eventCount?: number;
  upcoming?: { start: string; end: string; allDay: boolean }[];
  error?: string;
}

// GET ?check=1 — verify the configured iCloud calendar links (fresh fetch, no
// cache). Each link is checked independently; ok=true only if ALL parsed.
export async function GET() {
  try {
    const row = await prisma.siteContent.findUnique({
      where: {
        section_key: { section: "settings", key: "icloud_calendar_url" },
      },
      select: { value: true },
    });

    const urls = parseCalendarUrlList(row?.value);
    if (urls.length === 0) {
      return NextResponse.json(
        { ok: false, error: "לא הוגדר קישור ליומן — הדביקו קישור ושמרו תחילה" },
        { status: 400 }
      );
    }

    const from = new Date();
    const to = new Date(from.getTime() + CHECK_WINDOW_DAYS * DAY_MS);

    const links = await Promise.all(
      urls.map(async (url): Promise<LinkCheckResult> => {
        try {
          const intervals = await fetchAndParseIcs(url, from, to, {
            fresh: true,
          });
          intervals.sort((a, b) => a.start.getTime() - b.start.getTime());
          return {
            url,
            ok: true,
            eventCount: intervals.length,
            upcoming: intervals.slice(0, 3).map(formatInterval),
          };
        } catch (fetchError) {
          console.error("[EXTERNAL_CALENDAR_CHECK]", url, fetchError);
          return {
            url,
            ok: false,
            error: "לא הצלחנו לקרוא את היומן — בדקו את הקישור",
          };
        }
      })
    );

    return NextResponse.json({
      ok: links.every((link) => link.ok),
      // Backward-compat total across all links that parsed
      eventCount: links.reduce((sum, link) => sum + (link.eventCount ?? 0), 0),
      links,
    });
  } catch (error) {
    console.error("[EXTERNAL_CALENDAR_CHECK]", error);
    return NextResponse.json({ ok: false, error: "שגיאת שרת" }, { status: 500 });
  }
}
