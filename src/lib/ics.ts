/**
 * Escape a string for use as an iCalendar TEXT value (RFC 5545).
 * Order matters: backslash first, then the rest.
 */
export function escapeICal(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

/**
 * Format a Date as iCal UTC basic format: YYYYMMDDTHHMMSSZ.
 * Stored DateTimes are UTC; we output the UTC components with a trailing Z.
 */
export function formatICalUTC(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}` +
    `${pad(date.getUTCMonth() + 1)}` +
    `${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}` +
    `${pad(date.getUTCMinutes())}` +
    `${pad(date.getUTCSeconds())}Z`
  );
}

interface IcsEventInput {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  /** DTSTAMP value; defaults to now. */
  dtstamp?: Date;
  /** Optional STATUS line (e.g. TENTATIVE / CONFIRMED). */
  status?: string;
}

/** Build BEGIN:VEVENT…END:VEVENT lines with escaped text + UTC timestamps. */
export function buildIcsEvent({
  uid,
  start,
  end,
  summary,
  description,
  location,
  url,
  dtstamp,
  status,
}: IcsEventInput): string[] {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatICalUTC(dtstamp ?? new Date())}`,
    `DTSTART:${formatICalUTC(start)}`,
    `DTEND:${formatICalUTC(end)}`,
    `SUMMARY:${escapeICal(summary)}`,
  ];
  if (description) lines.push(`DESCRIPTION:${escapeICal(description)}`);
  if (location) lines.push(`LOCATION:${escapeICal(location)}`);
  if (url) lines.push(`URL:${url}`);
  if (status) lines.push(`STATUS:${status}`);
  lines.push("END:VEVENT");
  return lines;
}
