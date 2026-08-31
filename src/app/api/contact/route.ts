import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contactSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = contactSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    // Throttle: max 3 leads per phone per hour, max 30 leads globally per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [phoneCount, globalCount] = await Promise.all([
      prisma.lead.count({
        where: {
          phone: validated.data.phone,
          createdAt: { gte: oneHourAgo },
        },
      }),
      prisma.lead.count({ where: { createdAt: { gte: oneHourAgo } } }),
    ]);
    if (phoneCount >= 3 || globalCount >= 30) {
      console.warn(
        `[THROTTLE] contact POST blocked (phoneCount=${phoneCount}, globalCount=${globalCount})`
      );
      return NextResponse.json(
        { error: "יותר מדי פניות, אנא נסו שוב מאוחר יותר" },
        { status: 429 }
      );
    }

    const lead = await prisma.lead.create({
      data: {
        name: validated.data.name,
        phone: validated.data.phone,
        email: validated.data.email || null,
        subject: validated.data.subject || null,
        message: validated.data.message,
      },
    });

    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (error) {
    console.error("[CONTACT_API]", error);
    return NextResponse.json(
      { error: "שגיאת שרת, אנא נסו שוב מאוחר יותר" },
      { status: 500 }
    );
  }
}
