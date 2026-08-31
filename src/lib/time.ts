// Israel-timezone helpers over real UTC instants.
// Client-safe: no prisma or server-only imports.

const IL_TZ = "Asia/Jerusalem";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Offset (ms) between Israel wall clock and UTC at a given UTC instant.
 * Winter (UTC+2) → 7200000, summer (UTC+3) → 10800000.
 */
function israelOffsetMs(utcDate: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: IL_TZ,
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

/**
 * Convert an Israel wall-clock date + time ("YYYY-MM-DD", "HH:mm")
 * to the real UTC instant.
 */
export function israelWallToUtc(dateKey: string, time: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let result = guess - israelOffsetMs(new Date(guess));
  result = guess - israelOffsetMs(new Date(result)); // two-pass for DST edges
  return new Date(result);
}

/**
 * Format a UTC instant as Israel wall-clock "HH:mm".
 */
export function utcToIsraelTimeStr(d: Date): string {
  return d.toLocaleTimeString("en-GB", {
    timeZone: IL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23", // never "24:00" at midnight — the "00:00" round-trip is load-bearing
  });
}

/**
 * Format a UTC instant as its Israel date key "YYYY-MM-DD".
 */
export function toIsraelDateKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: IL_TZ });
}

/**
 * Day of week (0=Sunday..6=Saturday) for a "YYYY-MM-DD" date key.
 */
export function dateKeyDayOfWeek(dateKey: string): number {
  return new Date(dateKey + "T00:00:00Z").getUTCDay();
}

/**
 * Add n days to a "YYYY-MM-DD" date key (n may be negative).
 */
export function addDaysToKey(dateKey: string, n: number): string {
  const base = new Date(dateKey + "T00:00:00Z");
  return new Date(base.getTime() + n * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Format a Date as "YYYY-MM-DD" from its browser-local parts.
 * NEVER use toISOString here — it shifts across midnight in non-UTC browsers.
 */
export function localDateToKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
