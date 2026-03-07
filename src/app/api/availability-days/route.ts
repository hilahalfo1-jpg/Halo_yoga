import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — return which days of week have active availability rules
export async function GET() {
  try {
    const rules = await prisma.availabilityRule.findMany({
      where: { isActive: true },
      select: { dayOfWeek: true },
    });

    const daySet = new Set(rules.map((r) => r.dayOfWeek));
    const activeDays = Array.from(daySet);

    return NextResponse.json({ data: activeDays });
  } catch (error) {
    console.error("[AVAILABILITY_DAYS_GET]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
