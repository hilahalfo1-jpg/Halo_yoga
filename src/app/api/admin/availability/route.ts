import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { availabilityRuleSchema, availabilityExceptionSchema } from "@/lib/validations";

// GET all rules + exceptions
export async function GET() {
  try {
    const [rules, exceptions] = await Promise.all([
      prisma.availabilityRule.findMany({ orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] }),
      prisma.availabilityException.findMany({
        orderBy: { date: "asc" },
      }),
    ]);

    return NextResponse.json({ data: { rules, exceptions } });
  } catch (error) {
    console.error("[AVAILABILITY_GET]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// POST — create or update rule / create exception
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type: actionType } = body;

    if (actionType === "rule") {
      const validated = availabilityRuleSchema.safeParse(body.data);
      if (!validated.success) {
        return NextResponse.json(
          { error: "נתונים לא תקינים", details: validated.error.flatten() },
          { status: 400 }
        );
      }

      const category = body.data.category ?? null;
      const ruleId = body.data.id as string | undefined;

      let rule;
      if (ruleId) {
        // Update existing rule by ID
        rule = await prisma.availabilityRule.update({
          where: { id: ruleId },
          data: { ...validated.data, category },
        });
      } else {
        // Create new rule (allows multiple per day)
        rule = await prisma.availabilityRule.create({
          data: { ...validated.data, category },
        });
      }

      return NextResponse.json({ data: rule }, { status: 201 });
    }

    if (actionType === "exception") {
      const validated = availabilityExceptionSchema.safeParse(body.data);
      if (!validated.success) {
        return NextResponse.json(
          { error: "נתונים לא תקינים", details: validated.error.flatten() },
          { status: 400 }
        );
      }

      const excCategory = body.data.category ?? null;
      const excDate = new Date(validated.data.date);
      excDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(excDate);
      nextDay.setDate(nextDay.getDate() + 1);

      let exception;

      if (validated.data.type === "BLOCKED") {
        // BLOCKED: replace all existing exceptions for this date+category with one BLOCKED
        await prisma.availabilityException.deleteMany({
          where: {
            date: { gte: excDate, lt: nextDay },
            category: excCategory,
          },
        });
        exception = await prisma.availabilityException.create({
          data: {
            date: new Date(validated.data.date),
            type: "BLOCKED",
            reason: validated.data.reason || null,
            category: excCategory,
          },
        });
      } else {
        // OVERRIDE: allow multiple time ranges per date+category
        // Remove any BLOCKED exception first (opening the day back up)
        await prisma.availabilityException.deleteMany({
          where: {
            date: { gte: excDate, lt: nextDay },
            category: excCategory,
            type: "BLOCKED",
          },
        });
        exception = await prisma.availabilityException.create({
          data: {
            date: new Date(validated.data.date),
            type: "OVERRIDE",
            startTime: validated.data.startTime || null,
            endTime: validated.data.endTime || null,
            reason: validated.data.reason || null,
            category: excCategory,
          },
        });
      }

      return NextResponse.json({ data: exception }, { status: 201 });
    }

    return NextResponse.json({ error: "סוג פעולה לא תקין" }, { status: 400 });
  } catch (error) {
    console.error("[AVAILABILITY_POST]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
