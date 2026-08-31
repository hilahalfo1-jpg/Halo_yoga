import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface BulkBlockBody {
  dates: string[]; // array of date strings "YYYY-MM-DD" or ISO
  type: "BLOCKED" | "OVERRIDE";
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
  category?: string | null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BulkBlockBody;
    const { dates, type, startTime, endTime, reason, category } = body;

    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: "לא נבחרו תאריכים" }, { status: 400 });
    }
    if (type !== "BLOCKED" && type !== "OVERRIDE") {
      return NextResponse.json({ error: "סוג חסימה לא תקין" }, { status: 400 });
    }
    if (type === "OVERRIDE" && (!startTime || !endTime)) {
      return NextResponse.json({ error: "חובה להזין שעות לחסימת טווח שעות" }, { status: 400 });
    }
    if (dates.length > 366) {
      return NextResponse.json({ error: "ניתן לחסום עד 366 ימים בבת אחת" }, { status: 400 });
    }

    const excCategory = category ?? null;
    const parsed: Date[] = [];
    for (const s of dates) {
      const d = new Date(s);
      if (isNaN(d.getTime())) continue;
      d.setHours(0, 0, 0, 0);
      parsed.push(d);
    }

    if (parsed.length === 0) {
      return NextResponse.json({ error: "תאריכים לא תקינים" }, { status: 400 });
    }

    // Duplicate input dates collapse to a single DB row (same as the previous
    // sequential per-date implementation).
    const seen = new Set<number>();
    const uniqueDates = parsed.filter((d) => {
      if (seen.has(d.getTime())) return false;
      seen.add(d.getTime());
      return true;
    });

    // Per-date [midnight, next midnight) ranges — same matching semantics as
    // the previous per-date deleteMany, but in a single query.
    const dateRanges = uniqueDates.map((date) => {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      return { date: { gte: date, lt: nextDay } };
    });

    let created = 0;

    if (type === "BLOCKED") {
      // Atomic delete+create — a mid-request failure must not wipe exceptions
      await prisma.$transaction([
        prisma.availabilityException.deleteMany({
          where: { category: excCategory, OR: dateRanges },
        }),
        prisma.availabilityException.createMany({
          data: uniqueDates.map((date) => ({
            date,
            type: "BLOCKED",
            reason: reason || null,
            category: excCategory,
          })),
        }),
      ]);
      // The previous implementation counted every parsed date (duplicates included)
      created = parsed.length;
    } else {
      // Prefetch pre-existing OVERRIDE rows for the overlap check
      const existing = await prisma.availabilityException.findMany({
        where: { category: excCategory, type: "OVERRIDE", OR: dateRanges },
      });

      const toCreate = uniqueDates.filter((date) => {
        const dayStart = date.getTime();
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        const dayEnd = nextDay.getTime();
        const overlap = existing.some(
          (e) =>
            e.date.getTime() >= dayStart &&
            e.date.getTime() < dayEnd &&
            e.startTime &&
            e.endTime &&
            startTime! < e.endTime &&
            endTime! > e.startTime
        );
        return !overlap;
      });

      // Atomic delete+create — a mid-request failure must not wipe exceptions
      await prisma.$transaction([
        prisma.availabilityException.deleteMany({
          where: { category: excCategory, type: "BLOCKED", OR: dateRanges },
        }),
        ...(toCreate.length > 0
          ? [
              prisma.availabilityException.createMany({
                data: toCreate.map((date) => ({
                  date,
                  type: "OVERRIDE",
                  startTime,
                  endTime,
                  reason: reason || null,
                  category: excCategory,
                })),
              }),
            ]
          : []),
      ]);
      created = toCreate.length;
    }

    return NextResponse.json({ data: { created, total: parsed.length } }, { status: 201 });
  } catch (error) {
    console.error("[BULK_BLOCK_POST]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
