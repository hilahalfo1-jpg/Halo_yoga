import { describe, it, expect, vi } from "vitest";
import {
  parseIcsBusyIntervals,
  normalizeCalendarUrl,
  parseCalendarUrlList,
  getExternalBusyIntervals,
} from "./external-calendar";

// Only the negative-cache test reaches prisma (via lazy dynamic import).
vi.mock("./prisma", () => ({
  prisma: {
    siteContent: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ value: "https://example.com/busy.ics" }),
    },
  },
}));

// September 2026: Israel is on DST (UTC+3). 2026-09-07 is a Monday.
const FROM = new Date("2026-09-01T00:00:00Z");
const TO = new Date("2026-09-30T00:00:00Z");

function wrap(events: string): string {
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Apple//iCloud//EN\r\n${events}END:VCALENDAR\r\n`;
}

describe("normalizeCalendarUrl", () => {
  it("converts webcal:// to https:// and rejects empty/invalid", () => {
    expect(normalizeCalendarUrl("webcal://p33-caldav.icloud.com/pub/x")).toBe(
      "https://p33-caldav.icloud.com/pub/x"
    );
    expect(normalizeCalendarUrl("  ")).toBeNull();
    expect(normalizeCalendarUrl(null)).toBeNull();
    expect(normalizeCalendarUrl("ftp://example.com/cal.ics")).toBeNull();
    expect(normalizeCalendarUrl("not a url")).toBeNull();
  });

  it("rejects plain http (https only)", () => {
    expect(normalizeCalendarUrl("http://example.com/cal.ics")).toBeNull();
    expect(normalizeCalendarUrl("https://example.com/cal.ics")).toBe(
      "https://example.com/cal.ics"
    );
  });
});

describe("parseCalendarUrlList", () => {
  it("returns [] for empty/null/whitespace input", () => {
    expect(parseCalendarUrlList(null)).toEqual([]);
    expect(parseCalendarUrlList(undefined)).toEqual([]);
    expect(parseCalendarUrlList("")).toEqual([]);
    expect(parseCalendarUrlList("  \n , \t ")).toEqual([]);
  });

  it("splits on newlines, commas, and whitespace", () => {
    expect(
      parseCalendarUrlList(
        "https://a.example/1.ics\nhttps://a.example/2.ics,https://a.example/3.ics https://a.example/4.ics"
      )
    ).toEqual([
      "https://a.example/1.ics",
      "https://a.example/2.ics",
      "https://a.example/3.ics",
      "https://a.example/4.ics",
    ]);
    // CRLF newlines and blank lines
    expect(
      parseCalendarUrlList("https://a.example/1.ics\r\n\r\nhttps://a.example/2.ics\r\n")
    ).toEqual(["https://a.example/1.ics", "https://a.example/2.ics"]);
  });

  it("upgrades webcal:// to https:// per entry", () => {
    expect(
      parseCalendarUrlList(
        "webcal://p12-caldav.icloud.com/published/a\nhttps://a.example/b.ics"
      )
    ).toEqual([
      "https://p12-caldav.icloud.com/published/a",
      "https://a.example/b.ics",
    ]);
  });

  it("drops http/invalid entries without disturbing valid ones", () => {
    expect(
      parseCalendarUrlList(
        "http://insecure.example/cal.ics\nnot-a-url\nhttps://a.example/ok.ics"
      )
    ).toEqual(["https://a.example/ok.ics"]);
  });

  it("dedupes after normalization (webcal vs https of the same feed)", () => {
    expect(
      parseCalendarUrlList(
        "webcal://a.example/cal.ics\nhttps://a.example/cal.ics\nhttps://a.example/cal.ics"
      )
    ).toEqual(["https://a.example/cal.ics"]);
  });

  it("caps at 10 URLs", () => {
    const raw = Array.from(
      { length: 12 },
      (_, i) => `https://a.example/${i}.ics`
    ).join("\n");
    expect(parseCalendarUrlList(raw)).toEqual([
      "https://a.example/0.ics",
      "https://a.example/1.ics",
      "https://a.example/2.ics",
      "https://a.example/3.ics",
      "https://a.example/4.ics",
      "https://a.example/5.ics",
      "https://a.example/6.ics",
      "https://a.example/7.ics",
      "https://a.example/8.ics",
      "https://a.example/9.ics",
    ]);
  });
});

describe("parseIcsBusyIntervals", () => {
  it("parses a simple UTC event", () => {
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:1\r\nDTSTART:20260910T110000Z\r\nDTEND:20260910T123000Z\r\nSUMMARY:פגישה\r\nEND:VEVENT\r\n"
    );
    const result = parseIcsBusyIntervals(ics, FROM, TO);
    expect(result).toHaveLength(1);
    expect(result[0].start.toISOString()).toBe("2026-09-10T11:00:00.000Z");
    expect(result[0].end.toISOString()).toBe("2026-09-10T12:30:00.000Z");
    expect(result[0].allDay).toBe(false);
  });

  it("blocks full Israel days for VALUE=DATE all-day events (DTEND exclusive)", () => {
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:2\r\nDTSTART;VALUE=DATE:20260910\r\nDTEND;VALUE=DATE:20260912\r\nEND:VEVENT\r\n"
    );
    const result = parseIcsBusyIntervals(ics, FROM, TO);
    expect(result).toHaveLength(1);
    // Israel midnight (UTC+3 in September) → 21:00Z the previous day.
    expect(result[0].start.toISOString()).toBe("2026-09-09T21:00:00.000Z");
    expect(result[0].end.toISOString()).toBe("2026-09-11T21:00:00.000Z");
    expect(result[0].allDay).toBe(true);
  });

  it("converts TZID=Asia/Jerusalem wall time to UTC", () => {
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:3\r\nDTSTART;TZID=Asia/Jerusalem:20260910T140000\r\nDTEND;TZID=Asia/Jerusalem:20260910T150000\r\nEND:VEVENT\r\n"
    );
    const result = parseIcsBusyIntervals(ics, FROM, TO);
    expect(result).toHaveLength(1);
    expect(result[0].start.toISOString()).toBe("2026-09-10T11:00:00.000Z");
    expect(result[0].end.toISOString()).toBe("2026-09-10T12:00:00.000Z");
  });

  it("treats an unknown TZID as Israel time", () => {
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:3b\r\nDTSTART;TZID=Nowhere/Invalid:20260910T140000\r\nDTEND;TZID=Nowhere/Invalid:20260910T150000\r\nEND:VEVENT\r\n"
    );
    const result = parseIcsBusyIntervals(ics, FROM, TO);
    expect(result).toHaveLength(1);
    expect(result[0].start.toISOString()).toBe("2026-09-10T11:00:00.000Z");
  });

  it("uses DURATION when DTEND is absent", () => {
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:4\r\nDTSTART:20260910T110000Z\r\nDURATION:PT2H30M\r\nEND:VEVENT\r\n"
    );
    const result = parseIcsBusyIntervals(ics, FROM, TO);
    expect(result).toHaveLength(1);
    expect(result[0].end.toISOString()).toBe("2026-09-10T13:30:00.000Z");
  });

  it("defaults to 1 hour only when BOTH DTEND and DURATION are missing", () => {
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:5\r\nDTSTART:20260910T110000Z\r\nEND:VEVENT\r\n"
    );
    const result = parseIcsBusyIntervals(ics, FROM, TO);
    expect(result).toHaveLength(1);
    expect(result[0].end.toISOString()).toBe("2026-09-10T12:00:00.000Z");
  });

  it("expands a weekly RRULE with BYDAY within the window", () => {
    // Monday 2026-09-07, 10:00-11:00 Israel, repeating Mon+Wed.
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:6\r\nDTSTART;TZID=Asia/Jerusalem:20260907T100000\r\nDTEND;TZID=Asia/Jerusalem:20260907T110000\r\nRRULE:FREQ=WEEKLY;BYDAY=MO,WE\r\nEND:VEVENT\r\n"
    );
    const result = parseIcsBusyIntervals(ics, FROM, TO);
    const starts = result.map((r) => r.start.toISOString());
    // Mondays: 7, 14, 21, 28; Wednesdays: 9, 16, 23 (30th start is past TO); 10:00 IDT = 07:00Z
    expect(starts).toEqual([
      "2026-09-07T07:00:00.000Z",
      "2026-09-09T07:00:00.000Z",
      "2026-09-14T07:00:00.000Z",
      "2026-09-16T07:00:00.000Z",
      "2026-09-21T07:00:00.000Z",
      "2026-09-23T07:00:00.000Z",
      "2026-09-28T07:00:00.000Z",
    ]);
    expect(result[0].end.toISOString()).toBe("2026-09-07T08:00:00.000Z");
  });

  it("honors EXDATE in comma-separated form with TZID", () => {
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:7\r\nDTSTART;TZID=Asia/Jerusalem:20260907T100000\r\nDTEND;TZID=Asia/Jerusalem:20260907T110000\r\nRRULE:FREQ=WEEKLY;BYDAY=MO\r\nEXDATE;TZID=Asia/Jerusalem:20260914T100000,20260921T100000\r\nEND:VEVENT\r\n"
    );
    const result = parseIcsBusyIntervals(ics, FROM, TO);
    const starts = result.map((r) => r.start.toISOString());
    expect(starts).toEqual([
      "2026-09-07T07:00:00.000Z",
      "2026-09-28T07:00:00.000Z",
    ]);
  });

  it("expands FREQ=DAILY with INTERVAL and UNTIL", () => {
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:8\r\nDTSTART:20260901T080000Z\r\nDTEND:20260901T090000Z\r\nRRULE:FREQ=DAILY;INTERVAL=2;UNTIL=20260907T080000Z\r\nEND:VEVENT\r\n"
    );
    const result = parseIcsBusyIntervals(ics, FROM, TO);
    const starts = result.map((r) => r.start.toISOString());
    expect(starts).toEqual([
      "2026-09-01T08:00:00.000Z",
      "2026-09-03T08:00:00.000Z",
      "2026-09-05T08:00:00.000Z",
      "2026-09-07T08:00:00.000Z",
    ]);
  });

  it("honors COUNT", () => {
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:8b\r\nDTSTART:20260901T080000Z\r\nDTEND:20260901T090000Z\r\nRRULE:FREQ=DAILY;COUNT=3\r\nEND:VEVENT\r\n"
    );
    const result = parseIcsBusyIntervals(ics, FROM, TO);
    expect(result).toHaveLength(3);
    expect(result[2].start.toISOString()).toBe("2026-09-03T08:00:00.000Z");
  });

  it("skips TRANSP:TRANSPARENT and STATUS:CANCELLED events", () => {
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:9\r\nDTSTART:20260910T110000Z\r\nDTEND:20260910T120000Z\r\nTRANSP:TRANSPARENT\r\nEND:VEVENT\r\n" +
        "BEGIN:VEVENT\r\nUID:10\r\nDTSTART:20260911T110000Z\r\nDTEND:20260911T120000Z\r\nSTATUS:CANCELLED\r\nEND:VEVENT\r\n" +
        "BEGIN:VEVENT\r\nUID:11\r\nDTSTART:20260912T110000Z\r\nDTEND:20260912T120000Z\r\nTRANSP:OPAQUE\r\nEND:VEVENT\r\n"
    );
    const result = parseIcsBusyIntervals(ics, FROM, TO);
    expect(result).toHaveLength(1);
    expect(result[0].start.toISOString()).toBe("2026-09-12T11:00:00.000Z");
  });

  it("unfolds folded lines (CRLF + space)", () => {
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:12\r\nDTSTART:2026091\r\n 0T110000Z\r\nDTEND:20260910T1\r\n 20000Z\r\nEND:VEVENT\r\n"
    );
    const result = parseIcsBusyIntervals(ics, FROM, TO);
    expect(result).toHaveLength(1);
    expect(result[0].start.toISOString()).toBe("2026-09-10T11:00:00.000Z");
    expect(result[0].end.toISOString()).toBe("2026-09-10T12:00:00.000Z");
  });

  it("unfolds folded lines (bare LF + tab)", () => {
    const ics =
      "BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:13\nDTSTART:2026091\n\t0T110000Z\nDTEND:20260910T120000Z\nEND:VEVENT\nEND:VCALENDAR\n";
    const result = parseIcsBusyIntervals(ics, FROM, TO);
    expect(result).toHaveLength(1);
    expect(result[0].start.toISOString()).toBe("2026-09-10T11:00:00.000Z");
  });

  it("keeps only the first occurrence for unsupported FREQ (with one warn)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const ics = wrap(
        "BEGIN:VEVENT\r\nUID:14\r\nDTSTART:20260910T110000Z\r\nDTEND:20260910T120000Z\r\nRRULE:FREQ=MONTHLY\r\nEND:VEVENT\r\n" +
          "BEGIN:VEVENT\r\nUID:15\r\nDTSTART:20260911T110000Z\r\nDTEND:20260911T120000Z\r\nRRULE:FREQ=YEARLY\r\nEND:VEVENT\r\n"
      );
      const result = parseIcsBusyIntervals(ics, FROM, TO);
      expect(result).toHaveLength(2);
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it("excludes events entirely outside the window", () => {
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:16\r\nDTSTART:20261010T110000Z\r\nDTEND:20261010T120000Z\r\nEND:VEVENT\r\n" +
        "BEGIN:VEVENT\r\nUID:17\r\nDTSTART:20260810T110000Z\r\nDTEND:20260810T120000Z\r\nEND:VEVENT\r\n"
    );
    expect(parseIcsBusyIntervals(ics, FROM, TO)).toHaveLength(0);
  });

  it("ignores VALARM sub-components and events without DTSTART", () => {
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:18\r\nDTSTART:20260910T110000Z\r\nDTEND:20260910T120000Z\r\nBEGIN:VALARM\r\nTRIGGER:-PT15M\r\nACTION:DISPLAY\r\nEND:VALARM\r\nEND:VEVENT\r\n" +
        "BEGIN:VEVENT\r\nUID:19\r\nSUMMARY:no start\r\nEND:VEVENT\r\n"
    );
    const result = parseIcsBusyIntervals(ics, FROM, TO);
    expect(result).toHaveLength(1);
  });

  it("fast-forwards a weekly rule with DTSTART more than a year back", () => {
    // Monday 2025-01-06 10:00 Israel (winter, +2) → Sept 2026 Mondays 10:00 IDT = 07:00Z
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:20\r\nDTSTART;TZID=Asia/Jerusalem:20250106T100000\r\nDTEND;TZID=Asia/Jerusalem:20250106T110000\r\nRRULE:FREQ=WEEKLY;BYDAY=MO\r\nEND:VEVENT\r\n"
    );
    const starts = parseIcsBusyIntervals(ics, FROM, TO).map((r) =>
      r.start.toISOString()
    );
    expect(starts).toEqual([
      "2026-09-07T07:00:00.000Z",
      "2026-09-14T07:00:00.000Z",
      "2026-09-21T07:00:00.000Z",
      "2026-09-28T07:00:00.000Z",
    ]);
  });

  it("biweekly RRULE keeps only alternate weeks (DTSTART inside window)", () => {
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:21\r\nDTSTART:20260907T100000Z\r\nDTEND:20260907T110000Z\r\nRRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO\r\nEND:VEVENT\r\n"
    );
    const starts = parseIcsBusyIntervals(ics, FROM, TO).map((r) =>
      r.start.toISOString()
    );
    expect(starts).toEqual([
      "2026-09-07T10:00:00.000Z",
      "2026-09-21T10:00:00.000Z",
    ]);
  });

  it("biweekly RRULE lands in the correct alternate week after fast-forward", () => {
    // Monday 2026-01-05 + 14k days: even weeks → Sep 14 and Sep 28 (NOT 7/21)
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:22\r\nDTSTART:20260105T100000Z\r\nDTEND:20260105T110000Z\r\nRRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO\r\nEND:VEVENT\r\n"
    );
    const starts = parseIcsBusyIntervals(ics, FROM, TO).map((r) =>
      r.start.toISOString()
    );
    expect(starts).toEqual([
      "2026-09-14T10:00:00.000Z",
      "2026-09-28T10:00:00.000Z",
    ]);
  });

  it("groups biweekly BYDAY spanning Sunday by WKST=SU", () => {
    // Sunday 2026-09-06; with WKST=SU the following Monday is in the SAME week
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:23\r\nDTSTART:20260906T100000Z\r\nDTEND:20260906T110000Z\r\nRRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=SU,MO;WKST=SU\r\nEND:VEVENT\r\n"
    );
    const starts = parseIcsBusyIntervals(ics, FROM, TO).map((r) =>
      r.start.toISOString()
    );
    expect(starts).toEqual([
      "2026-09-06T10:00:00.000Z",
      "2026-09-07T10:00:00.000Z",
      "2026-09-20T10:00:00.000Z",
      "2026-09-21T10:00:00.000Z",
    ]);
  });

  it("defaults WKST to Monday (RFC) when absent", () => {
    // Same rule without WKST: Sunday and the next Monday are in DIFFERENT weeks
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:24\r\nDTSTART:20260906T100000Z\r\nDTEND:20260906T110000Z\r\nRRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=SU,MO\r\nEND:VEVENT\r\n"
    );
    const starts = parseIcsBusyIntervals(ics, FROM, TO).map((r) =>
      r.start.toISOString()
    );
    expect(starts).toEqual([
      "2026-09-06T10:00:00.000Z",
      "2026-09-14T10:00:00.000Z",
      "2026-09-20T10:00:00.000Z",
      "2026-09-28T10:00:00.000Z",
    ]);
  });

  it("does not drop occurrences of a COUNT rule with an old DTSTART", () => {
    // Weekly Mondays from 2025-01-06, COUNT=100 → runs into Nov 2026;
    // naive day-step caps would exhaust before the window without the
    // closed-form fast-forward. Occurrences 88-91 fall in Sept 2026.
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:25\r\nDTSTART:20250106T100000Z\r\nDTEND:20250106T110000Z\r\nRRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=100\r\nEND:VEVENT\r\n"
    );
    const starts = parseIcsBusyIntervals(ics, FROM, TO).map((r) =>
      r.start.toISOString()
    );
    expect(starts).toEqual([
      "2026-09-07T10:00:00.000Z",
      "2026-09-14T10:00:00.000Z",
      "2026-09-21T10:00:00.000Z",
      "2026-09-28T10:00:00.000Z",
    ]);
  });

  it("stops a COUNT rule that exhausts before the window", () => {
    // 10 weekly occurrences from Jan 2026 end in March — none reach September
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:26\r\nDTSTART:20260105T100000Z\r\nDTEND:20260105T110000Z\r\nRRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=10\r\nEND:VEVENT\r\n"
    );
    expect(parseIcsBusyIntervals(ics, FROM, TO)).toHaveLength(0);
  });

  it("matches a UTC EXDATE against a TZID DTSTART occurrence", () => {
    // Sep 14 10:00 Israel (IDT) === 07:00Z
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:27\r\nDTSTART;TZID=Asia/Jerusalem:20260907T100000\r\nDTEND;TZID=Asia/Jerusalem:20260907T110000\r\nRRULE:FREQ=WEEKLY;BYDAY=MO\r\nEXDATE:20260914T070000Z\r\nEND:VEVENT\r\n"
    );
    const starts = parseIcsBusyIntervals(ics, FROM, TO).map((r) =>
      r.start.toISOString()
    );
    expect(starts).toEqual([
      "2026-09-07T07:00:00.000Z",
      "2026-09-21T07:00:00.000Z",
      "2026-09-28T07:00:00.000Z",
    ]);
  });

  it("expands an all-day event with a weekly RRULE to full Israel days", () => {
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:28\r\nDTSTART;VALUE=DATE:20260907\r\nRRULE:FREQ=WEEKLY\r\nEND:VEVENT\r\n"
    );
    const result = parseIcsBusyIntervals(ics, FROM, TO);
    expect(result.map((r) => r.start.toISOString())).toEqual([
      "2026-09-06T21:00:00.000Z",
      "2026-09-13T21:00:00.000Z",
      "2026-09-20T21:00:00.000Z",
      "2026-09-27T21:00:00.000Z",
    ]);
    expect(result.every((r) => r.allDay)).toBe(true);
    expect(result[0].end.toISOString()).toBe("2026-09-07T21:00:00.000Z");
  });
});

describe("getExternalBusyIntervals", () => {
  it("negative-caches a failing feed for 60s (no repeat fetch)", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const result1 = await getExternalBusyIntervals(
        new Date("2026-09-01T00:00:00Z"),
        new Date("2026-09-02T00:00:00Z")
      );
      expect(result1).toEqual([]); // fail-open
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(errSpy).toHaveBeenCalled();

      // Different window, same URL, within the 60s TTL — circuit stays open
      const result2 = await getExternalBusyIntervals(
        new Date("2026-09-03T00:00:00Z"),
        new Date("2026-09-04T00:00:00Z")
      );
      expect(result2).toEqual([]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
      errSpy.mockRestore();
    }
  });

  it("one broken link does not disable the other calendars", async () => {
    const ics = wrap(
      "BEGIN:VEVENT\r\nUID:multi1\r\nDTSTART:20260910T090000Z\r\nDTEND:20260910T100000Z\r\nEND:VEVENT\r\n"
    );
    const fetchMock = vi
      .fn()
      .mockImplementation((url: string) =>
        url.includes("multi-good")
          ? Promise.resolve(new Response(ics))
          : Promise.reject(new Error("feed down"))
      );
    vi.stubGlobal("fetch", fetchMock);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { prisma } = await import("./prisma");
    vi.mocked(prisma.siteContent.findUnique).mockResolvedValueOnce({
      value: "https://multi-good.example/a.ics\nhttps://multi-bad.example/b.ics",
    } as never);
    try {
      const result = await getExternalBusyIntervals(FROM, TO);
      expect(fetchMock).toHaveBeenCalledTimes(2); // both links attempted
      expect(result).toHaveLength(1); // good feed still contributes
      expect(result[0].start.toISOString()).toBe("2026-09-10T09:00:00.000Z");
      expect(errSpy).toHaveBeenCalled(); // broken feed logged, not thrown
    } finally {
      vi.unstubAllGlobals();
      errSpy.mockRestore();
    }
  });
});
