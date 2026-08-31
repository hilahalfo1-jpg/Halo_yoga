// External (iCloud) calendar busy-sync.
//
// Reads public ICS share links (up to 5, newline/comma/space-separated) from
// SiteContent (section "settings", key "icloud_calendar_url") and turns their
// events into busy intervals that block booking slots. The ICS parser is
// hand-rolled and PURE (no prisma/network) so it can be unit-tested directly
// — only getExternalBusyIntervals touches the DB (lazily) and the network.
//
// SECURITY: feed content is UNTRUSTED (attacker-controlled URL). It is never
// interpolated into queries; the response is byte-capped and the number of
// parsed events is capped.

import {
  israelWallToUtc,
  addDaysToKey,
  dateKeyDayOfWeek,
} from "./time";

export interface BusyInterval {
  start: Date;
  end: Date;
  allDay: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const IL_TZ = "Asia/Jerusalem";

const MAX_ICS_BYTES = 2 * 1024 * 1024; // 2MB response cap
const MAX_EVENTS = 2000; // cap on parsed VEVENTs (untrusted input)
const MAX_INTERVALS = 5000; // cap on emitted busy intervals
// Safety net only — the analytic fast-forward keeps real iteration counts
// small, so this cap is only reachable with absurd attacker-shaped rules.
const MAX_RRULE_ITERATIONS = 20000;
const MAX_RRULE_INTERVAL = 1000; // clamp on untrusted INTERVAL values
const EXPANSION_CAP_DAYS = 90; // RRULE expansion horizon
const FETCH_TIMEOUT_MS = 5000;
const EVENT_CACHE_TTL_MS = 5 * 60 * 1000; // parsed-event cache per URL
const FAILURE_TTL_MS = 60 * 1000; // negative cache: skip a failing feed for 60s
const CACHE_MAX_ENTRIES = 64;
const MAX_CALENDAR_URLS = 10; // cap on configured calendar links

// ─── URL normalization ─────────────────────────

/** webcal:// → https://; returns null for empty/invalid/non-https URLs. */
export function normalizeCalendarUrl(
  raw: string | null | undefined
): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  const httpsUrl = trimmed.replace(/^webcal:\/\//i, "https://");
  try {
    const parsed = new URL(httpsUrl);
    // https only — plain http would fetch the feed over an unencrypted channel
    if (parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Parse the stored SiteContent value into a list of calendar URLs.
 * Splits on newlines/commas/whitespace, normalizes each (webcal→https,
 * https-only), drops invalids, dedupes, and caps at MAX_CALENDAR_URLS.
 * Pure — unit-tested directly.
 */
export function parseCalendarUrlList(raw: string | null | undefined): string[] {
  const urls: string[] = [];
  for (const part of (raw ?? "").split(/[\s,]+/)) {
    const url = normalizeCalendarUrl(part);
    if (url && !urls.includes(url)) {
      urls.push(url);
      if (urls.length >= MAX_CALENDAR_URLS) break;
    }
  }
  return urls;
}

// ─── Timezone helpers (arbitrary zone, Intl technique like israelOffsetMs) ───

/** Offset (ms) between a zone's wall clock and UTC at a given UTC instant. */
function zoneOffsetMs(utcDate: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = Object.fromEntries(
    dtf.formatToParts(utcDate).map((x) => [x.type, x.value])
  );
  const asUtc = Date.UTC(
    +p.year,
    +p.month - 1,
    +p.day,
    +p.hour % 24,
    +p.minute,
    +p.second
  );
  return asUtc - utcDate.getTime();
}

/** Convert wall-clock components in an arbitrary IANA zone to a UTC instant. */
function wallToUtcInZone(
  y: number,
  mo: number,
  d: number,
  hh: number,
  mm: number,
  ss: number,
  timeZone: string
): Date {
  const guess = Date.UTC(y, mo - 1, d, hh, mm, ss);
  let result = guess - zoneOffsetMs(new Date(guess), timeZone);
  result = guess - zoneOffsetMs(new Date(result), timeZone); // two-pass for DST edges
  return new Date(result);
}

/** Validate a TZID against Intl; unknown zones fall back to Israel time. */
function safeZone(tzid: string | undefined): string {
  if (!tzid) return IL_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tzid });
    return tzid;
  } catch {
    return IL_TZ;
  }
}

// ─── ICS line/property parsing ─────────────────────────

interface IcsProp {
  name: string;
  params: Record<string, string>;
  value: string;
}

/** Split "NAME;PARAM=V;PARAM2=V2:value" (colon inside quotes is respected). */
function parseIcsLine(line: string): IcsProp | null {
  let i = 0;
  let inQuotes = false;
  for (; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ":" && !inQuotes) break;
  }
  if (i >= line.length) return null;
  const head = line.slice(0, i);
  const value = line.slice(i + 1);
  const parts = head.split(";");
  const name = parts[0].toUpperCase();
  if (!name) return null;
  const params: Record<string, string> = {};
  for (let j = 1; j < parts.length; j++) {
    const eq = parts[j].indexOf("=");
    if (eq > 0) {
      params[parts[j].slice(0, eq).toUpperCase()] = parts[j]
        .slice(eq + 1)
        .replace(/^"|"$/g, "");
    }
  }
  return { name, params, value };
}

// ─── ICS date-time parsing ─────────────────────────

const ICS_DT_RE = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/;

interface ParsedDt {
  utc: Date;
  dateOnly: boolean;
  zone: string; // "UTC" for Z values; IANA zone otherwise (Israel for dates)
  key: string; // wall date key "YYYY-MM-DD" in `zone`
  time: string; // wall time "HH:mm:ss"
}

/** Parse an ICS date/date-time value with its property params. Null = invalid. */
function parseIcsDt(
  value: string,
  params: Record<string, string>
): ParsedDt | null {
  const m = ICS_DT_RE.exec(value.trim());
  if (!m) return null;
  const [, ys, mos, ds, hs, mis, ss, z] = m;
  const y = +ys;
  const mo = +mos;
  const d = +ds;
  const key = `${ys}-${mos}-${ds}`;

  const dateOnly = params.VALUE === "DATE" || hs === undefined;
  if (dateOnly) {
    // All-day values are wall dates — anchor to full Israel days.
    return {
      utc: israelWallToUtc(key, "00:00"),
      dateOnly: true,
      zone: IL_TZ,
      key,
      time: "00:00:00",
    };
  }

  const hh = +hs!;
  const mm = +mis!;
  const sec = ss ? +ss : 0;
  const time = `${hs}:${mis}:${ss ?? "00"}`;

  if (z) {
    return {
      utc: new Date(Date.UTC(y, mo - 1, d, hh, mm, sec)),
      dateOnly: false,
      zone: "UTC",
      key,
      time,
    };
  }

  // TZID= (arbitrary zone) or floating time — unknown/missing zone → Israel.
  const zone = safeZone(params.TZID);
  return {
    utc: wallToUtcInZone(y, mo, d, hh, mm, sec, zone),
    dateOnly: false,
    zone,
    key,
    time,
  };
}

/** Parse an ICS DURATION ("P1DT2H30M", "PT45M", "P1W") into ms. Null = invalid. */
function parseDurationMs(value: string): number | null {
  const m =
    /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(
      value.trim()
    );
  if (!m) return null;
  const [, sign, w, d, h, min, s] = m;
  if (!w && !d && !h && !min && !s) return null;
  const ms =
    ((+(w || 0) * 7 + +(d || 0)) * 86400 +
      +(h || 0) * 3600 +
      +(min || 0) * 60 +
      +(s || 0)) *
    1000;
  return sign === "-" ? -ms : ms;
}

// ─── VEVENT model ─────────────────────────

const BYDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function gcd(a: number, b: number): number {
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

interface ParsedEvent {
  start: ParsedDt;
  endUtc: Date;
  allDay: boolean;
  allDayLengthDays: number; // ≥1 when allDay
  durationMs: number;
  rrule: string | null;
  exdateInstants: Set<number>;
  exdateKeys: Set<string>;
}

interface RawEvent {
  props: IcsProp[];
}

/** Split unfolded ICS lines into VEVENT blocks (skipping nested VALARMs). */
function extractVevents(lines: string[]): RawEvent[] {
  const events: RawEvent[] = [];
  let current: IcsProp[] | null = null;
  let alarmDepth = 0;

  for (const line of lines) {
    if (!line) continue;
    const upper = line.toUpperCase();
    if (upper === "BEGIN:VEVENT") {
      current = [];
      alarmDepth = 0;
      continue;
    }
    if (current === null) continue;
    if (upper.startsWith("BEGIN:")) {
      alarmDepth++; // nested component (VALARM etc.) — ignore its content
      continue;
    }
    if (upper === "END:VEVENT") {
      events.push({ props: current });
      current = null;
      if (events.length >= MAX_EVENTS) break;
      continue;
    }
    if (upper.startsWith("END:")) {
      if (alarmDepth > 0) alarmDepth--;
      continue;
    }
    if (alarmDepth > 0) continue;
    const prop = parseIcsLine(line);
    if (prop) current.push(prop);
  }

  return events;
}

/** Build the event model from a raw VEVENT. Null = skipped (transparent/cancelled/invalid). */
function buildEvent(raw: RawEvent): ParsedEvent | null {
  let start: ParsedDt | null = null;
  let end: ParsedDt | null = null;
  let durationMs: number | null = null;
  let rrule: string | null = null;
  const exdateInstants = new Set<number>();
  const exdateKeys = new Set<string>();

  for (const prop of raw.props) {
    switch (prop.name) {
      case "TRANSP":
        if (prop.value.trim().toUpperCase() === "TRANSPARENT") return null;
        break;
      case "STATUS":
        if (prop.value.trim().toUpperCase() === "CANCELLED") return null;
        break;
      case "DTSTART":
        start = parseIcsDt(prop.value, prop.params);
        break;
      case "DTEND":
        end = parseIcsDt(prop.value, prop.params);
        break;
      case "DURATION":
        durationMs = parseDurationMs(prop.value);
        break;
      case "RRULE":
        rrule = prop.value;
        break;
      case "EXDATE":
        // Comma-separated values, optional TZID param on the line.
        for (const v of prop.value.split(",")) {
          const dt = parseIcsDt(v, prop.params);
          if (!dt) continue;
          if (dt.dateOnly) exdateKeys.add(dt.key);
          else exdateInstants.add(dt.utc.getTime());
        }
        break;
    }
  }

  if (!start) return null;

  const allDay = start.dateOnly;
  let endUtc: Date;

  if (allDay) {
    if (end && end.dateOnly) {
      // DTEND date is exclusive per RFC 5545.
      endUtc = end.utc;
    } else if (durationMs !== null && durationMs > 0) {
      endUtc = new Date(start.utc.getTime() + durationMs);
    } else {
      endUtc = israelWallToUtc(addDaysToKey(start.key, 1), "00:00");
    }
  } else if (end) {
    endUtc = end.utc;
  } else if (durationMs !== null) {
    endUtc = new Date(start.utc.getTime() + durationMs);
  } else {
    // Both DTEND and DURATION missing → 1 hour.
    endUtc = new Date(start.utc.getTime() + HOUR_MS);
  }

  if (endUtc.getTime() <= start.utc.getTime()) return null;

  const allDayLengthDays = allDay
    ? Math.max(1, Math.round((endUtc.getTime() - start.utc.getTime()) / DAY_MS))
    : 0;

  return {
    start,
    endUtc,
    allDay,
    allDayLengthDays,
    durationMs: endUtc.getTime() - start.utc.getTime(),
    rrule,
    exdateInstants,
    exdateKeys,
  };
}

// ─── RRULE expansion ─────────────────────────

function parseRruleParts(rrule: string): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const seg of rrule.split(";")) {
    const eq = seg.indexOf("=");
    if (eq > 0) {
      parts[seg.slice(0, eq).trim().toUpperCase()] = seg.slice(eq + 1).trim();
    }
  }
  return parts;
}

/** UNTIL is inclusive; a date-only UNTIL covers through end of that Israel day. */
function parseUntilUtc(value: string): Date | null {
  const dt = parseIcsDt(value, {});
  if (!dt) return null;
  if (dt.dateOnly) {
    return new Date(
      israelWallToUtc(addDaysToKey(dt.key, 1), "00:00").getTime() - 1
    );
  }
  return dt.utc;
}

/** Occurrence start/end (wall-clock stable across DST) for a day offset. */
function occurrenceAt(ev: ParsedEvent, dayOffset: number): BusyInterval {
  const key = addDaysToKey(ev.start.key, dayOffset);
  if (ev.allDay) {
    return {
      start: israelWallToUtc(key, "00:00"),
      end: israelWallToUtc(addDaysToKey(key, ev.allDayLengthDays), "00:00"),
      allDay: true,
    };
  }
  const [y, mo, d] = key.split("-").map(Number);
  const [hh, mm, ss] = ev.start.time.split(":").map(Number);
  const start = wallToUtcInZone(y, mo, d, hh, mm, ss, ev.start.zone);
  return {
    start,
    end: new Date(start.getTime() + ev.durationMs),
    allDay: false,
  };
}

function isExcluded(ev: ParsedEvent, occ: BusyInterval, key: string): boolean {
  return ev.exdateInstants.has(occ.start.getTime()) || ev.exdateKeys.has(key);
}

interface WarnState {
  warnedUnsupportedFreq: boolean;
}

/** Expand one event to busy intervals overlapping [windowStart, windowEnd]. */
function expandEvent(
  ev: ParsedEvent,
  windowStart: Date,
  windowEnd: Date,
  warnState: WarnState
): BusyInterval[] {
  const single: BusyInterval = {
    start: ev.start.utc,
    end: ev.endUtc,
    allDay: ev.allDay,
  };
  const overlaps = (b: BusyInterval) =>
    b.start < windowEnd && b.end > windowStart;

  if (!ev.rrule) {
    return overlaps(single) && !isExcluded(ev, single, ev.start.key)
      ? [single]
      : [];
  }

  const rule = parseRruleParts(ev.rrule);
  const freq = (rule.FREQ || "").toUpperCase();

  if (freq !== "DAILY" && freq !== "WEEKLY") {
    // MONTHLY/YEARLY etc. — first occurrence only (documented limitation).
    if (!warnState.warnedUnsupportedFreq) {
      console.warn(
        `[EXTERNAL_CALENDAR] unsupported RRULE FREQ "${freq}" — using first occurrence only`
      );
      warnState.warnedUnsupportedFreq = true;
    }
    return overlaps(single) && !isExcluded(ev, single, ev.start.key)
      ? [single]
      : [];
  }

  const interval = Math.min(
    MAX_RRULE_INTERVAL,
    Math.max(1, parseInt(rule.INTERVAL || "1", 10) || 1)
  );
  const count = rule.COUNT ? parseInt(rule.COUNT, 10) || 0 : null;
  const untilUtc = rule.UNTIL ? parseUntilUtc(rule.UNTIL) : null;

  let bydaySet: Set<number> | null = null;
  if (rule.BYDAY) {
    bydaySet = new Set<number>();
    for (const token of rule.BYDAY.toUpperCase().split(",")) {
      const code = token.trim().replace(/^[+-]?\d+/, ""); // "2MO" → "MO"
      const idx = BYDAY_CODES.indexOf(code);
      if (idx >= 0) bydaySet.add(idx);
    }
    if (bydaySet.size === 0) bydaySet = null;
  }

  const startDow = dateKeyDayOfWeek(ev.start.key);
  const weekdaySet =
    freq === "WEEKLY" ? (bydaySet ?? new Set([startDow])) : bydaySet;

  // Week start for WEEKLY interval grouping: RFC default is MO, Apple often
  // emits WKST=SU. Invalid values fall back to Monday.
  const wkstIdxRaw = BYDAY_CODES.indexOf((rule.WKST || "MO").toUpperCase());
  const wkstIdx = wkstIdxRaw >= 0 ? wkstIdxRaw : 1;
  // WKST-based day-in-week of DTSTART.
  const daysFromWeekStart = (startDow - wkstIdx + 7) % 7;

  const results: BusyInterval[] = [];

  // Analytic fast-forward toward the window. Occurrences consumed by the
  // skipped span are computed in closed form, so COUNT rules with an old
  // DTSTART are never silently dropped by the iteration cap.
  let startOffset = 0; // day offset to start iterating from
  let counted = 0; // occurrences already consumed before startOffset
  const daysBehind = Math.floor(
    (windowStart.getTime() - ev.start.utc.getTime()) / DAY_MS
  );

  if (freq === "DAILY") {
    // Candidate offsets repeat their weekday pattern every lcm(7, interval) days.
    const candidatesPerCycle = 7 / gcd(7, interval);
    const cycleDays = candidatesPerCycle * interval;
    let occPerCycle = candidatesPerCycle;
    if (weekdaySet) {
      occPerCycle = 0;
      for (let j = 0; j < candidatesPerCycle; j++) {
        if (weekdaySet.has((startDow + j * interval) % 7)) occPerCycle++;
      }
      if (occPerCycle === 0) return []; // BYDAY excludes every candidate
    }
    if (daysBehind > cycleDays + 8) {
      let cyclesToSkip = Math.floor((daysBehind - 8) / cycleDays) - 1;
      if (count !== null) {
        cyclesToSkip = Math.min(
          cyclesToSkip,
          Math.floor((count - 1) / occPerCycle)
        );
      }
      if (cyclesToSkip > 0) {
        startOffset = cyclesToSkip * cycleDays;
        counted = cyclesToSkip * occPerCycle;
      }
    }
  } else {
    // WEEKLY: every full qualifying week contributes each weekday in the set;
    // DTSTART's own week may be partial (only days at/after DTSTART count).
    const setSize = weekdaySet!.size;
    let occFirstWeek = 0;
    weekdaySet!.forEach((d) => {
      if ((d - wkstIdx + 7) % 7 >= daysFromWeekStart) occFirstWeek++;
    });
    const blockDays = 7 * interval;
    if (daysBehind > blockDays + 8) {
      let weeksToSkip = Math.floor((daysBehind - 8) / blockDays) - 1;
      if (count !== null) {
        // Largest w (≥1) with occFirstWeek + (w-1)*setSize ≤ count-1
        const byCount = Math.floor((count - 1 - occFirstWeek) / setSize) + 1;
        weeksToSkip = Math.min(weeksToSkip, Math.max(0, byCount));
      }
      if (weeksToSkip > 0) {
        startOffset = weeksToSkip * blockDays - daysFromWeekStart;
        counted = occFirstWeek + (weeksToSkip - 1) * setSize;
      }
    }
  }

  let iterations = 0;
  for (
    let n = startOffset;
    iterations < MAX_RRULE_ITERATIONS;
    n += freq === "DAILY" ? interval : 1, iterations++
  ) {
    if (freq === "WEEKLY") {
      const weekIndex = Math.floor((n + daysFromWeekStart) / 7);
      if (weekIndex % interval !== 0) continue;
      if (weekdaySet && !weekdaySet.has((startDow + n) % 7)) continue;
    } else if (weekdaySet && !weekdaySet.has((startDow + n) % 7)) {
      continue;
    }

    const key = addDaysToKey(ev.start.key, n);
    const occ = occurrenceAt(ev, n);

    if (untilUtc && occ.start > untilUtc) break;
    if (occ.start > windowEnd) break;

    counted++;
    if (count !== null && counted > count) break;

    if (overlaps(occ) && !isExcluded(ev, occ, key)) {
      results.push(occ);
      if (results.length >= MAX_INTERVALS) break;
    }
  }

  return results;
}

// ─── Public parser (PURE — unit-tested directly) ─────────────────────────

/** Parse ICS text into event models (window-independent — cacheable per URL). */
function parseIcsEvents(ics: string): ParsedEvent[] {
  // Unfold folded lines: CRLF or bare LF followed by a space or tab.
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  const events: ParsedEvent[] = [];
  for (const raw of extractVevents(lines)) {
    const ev = buildEvent(raw);
    if (ev) events.push(ev);
  }
  return events;
}

/** Expand parsed events into busy intervals overlapping [fromUtc, toUtc]. */
function expandEventsToBusy(
  events: ParsedEvent[],
  fromUtc: Date,
  toUtc: Date
): BusyInterval[] {
  const expansionEnd = new Date(
    Math.min(toUtc.getTime(), fromUtc.getTime() + EXPANSION_CAP_DAYS * DAY_MS)
  );

  const warnState: WarnState = { warnedUnsupportedFreq: false };
  const intervals: BusyInterval[] = [];

  for (const ev of events) {
    const windowEnd = ev.rrule ? expansionEnd : toUtc;
    for (const interval of expandEvent(ev, fromUtc, windowEnd, warnState)) {
      intervals.push(interval);
      if (intervals.length >= MAX_INTERVALS) return intervals;
    }
  }

  return intervals;
}

/**
 * Parse ICS text into busy intervals overlapping [fromUtc, toUtc].
 * RRULE expansion is additionally capped at 90 days past fromUtc.
 * Pure: no prisma, no network — safe to unit-test with fixture strings.
 */
export function parseIcsBusyIntervals(
  ics: string,
  fromUtc: Date,
  toUtc: Date
): BusyInterval[] {
  return expandEventsToBusy(parseIcsEvents(ics), fromUtc, toUtc);
}

// ─── Fetch + parse (throws on failure — used by the admin check route) ───────

/** Fetch ICS text (5s timeout, 2MB byte cap). Throws on any failure. */
async function fetchIcsText(url: string, fresh?: boolean): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    ...(fresh ? { cache: "no-store" as const } : { next: { revalidate: 300 } }),
  });
  if (!res.ok) {
    throw new Error(`ICS fetch failed: HTTP ${res.status}`);
  }
  // Abort before reading a declared-oversized body; chunked responses (no
  // Content-Length) are still caught by the post-read cap below.
  const contentLength = Number(res.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_ICS_BYTES) {
    throw new Error(`ICS feed too large: ${contentLength} bytes (Content-Length)`);
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_ICS_BYTES) {
    throw new Error(`ICS feed too large: ${buf.byteLength} bytes`);
  }
  return new TextDecoder("utf-8").decode(buf);
}

/**
 * Fetch an ICS URL (5s timeout, 2MB cap) and parse busy intervals.
 * `fresh: true` bypasses the Next data cache (admin "בדוק חיבור").
 */
export async function fetchAndParseIcs(
  url: string,
  fromUtc: Date,
  toUtc: Date,
  opts?: { fresh?: boolean }
): Promise<BusyInterval[]> {
  const text = await fetchIcsText(url, opts?.fresh);
  return parseIcsBusyIntervals(text, fromUtc, toUtc);
}

// ─── Main entry (cached per URL, fail-open) ─────────────────────────

// Parsed events cached per URL (5-min TTL) — every requested window (slot days,
// admin conflict checks) slices the same cached list.
const eventCache = new Map<
  string,
  { expires: number; events: ParsedEvent[] }
>();
// Negative cache / circuit breaker per URL (60s): a down or hanging feed must
// not cost every cold slot request the full fetch timeout on the public path.
const failureCache = new Map<string, number>();

function pruneCache<T>(
  cache: Map<string, T>,
  isExpired: (value: T) => boolean
): void {
  if (cache.size < CACHE_MAX_ENTRIES) return;
  cache.forEach((value, key) => {
    if (isExpired(value)) cache.delete(key);
  });
  if (cache.size >= CACHE_MAX_ENTRIES) cache.clear();
}

/**
 * Cached parsed events for one URL. Returns [] on failure (fail-open per
 * URL), with the failure negative-cached for 60s.
 */
async function getEventsForUrl(url: string): Promise<ParsedEvent[]> {
  const now = Date.now();
  const failedUntil = failureCache.get(url);
  if (failedUntil !== undefined && failedUntil > now) {
    return []; // circuit open — recent failure, skip the fetch entirely
  }

  const hit = eventCache.get(url);
  if (hit && hit.expires > now) {
    return hit.events;
  }

  let events: ParsedEvent[];
  try {
    events = parseIcsEvents(await fetchIcsText(url));
  } catch (fetchError) {
    console.error("[EXTERNAL_CALENDAR]", fetchError);
    pruneCache(failureCache, (expires) => expires <= now);
    failureCache.set(url, now + FAILURE_TTL_MS);
    return []; // fail-open
  }
  failureCache.delete(url);
  pruneCache(eventCache, (entry) => entry.expires <= now);
  eventCache.set(url, { expires: now + EVENT_CACHE_TTL_MS, events });
  return events;
}

/**
 * Busy intervals from the configured iCloud calendars (up to 5 links)
 * overlapping [fromUtc, toUtc]. No URLs configured → []. ANY failure →
 * log + skip that feed (fail-open per URL: one broken link never blocks
 * the others or the booking calendar), with each failure negative-cached
 * for 60s so a dead feed doesn't stall every request.
 */
export async function getExternalBusyIntervals(
  fromUtc: Date,
  toUtc: Date
): Promise<BusyInterval[]> {
  try {
    // Lazy import keeps this module prisma-free for the pure-parser tests.
    const { prisma } = await import("./prisma");
    const row = await prisma.siteContent.findUnique({
      where: {
        section_key: { section: "settings", key: "icloud_calendar_url" },
      },
      select: { value: true },
    });

    const urls = parseCalendarUrlList(row?.value);
    if (urls.length === 0) return [];

    // getEventsForUrl never rejects (fail-open per URL), but allSettled
    // keeps one unexpected throw from disabling the other feeds.
    const settled = await Promise.allSettled(urls.map(getEventsForUrl));

    const intervals: BusyInterval[] = [];
    for (const result of settled) {
      if (result.status !== "fulfilled") {
        console.error("[EXTERNAL_CALENDAR]", result.reason);
        continue;
      }
      for (const interval of expandEventsToBusy(
        result.value,
        fromUtc,
        toUtc
      )) {
        intervals.push(interval);
        if (intervals.length >= MAX_INTERVALS) return intervals;
      }
    }
    return intervals;
  } catch (error) {
    console.error("[EXTERNAL_CALENDAR]", error);
    return []; // fail-open (DB/unexpected errors)
  }
}
