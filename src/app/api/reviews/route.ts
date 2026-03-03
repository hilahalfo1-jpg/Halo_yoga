import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reviewSchema } from "@/lib/validations";

// GET approved reviews
export async function GET() {
  try {
    const reviews = await prisma.review.findMany({
      where: { isApproved: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: reviews });
  } catch (error) {
    console.error("[REVIEWS_GET]", error);
    return NextResponse.json(
      { error: "שגיאת שרת" },
      { status: 500 }
    );
  }
}

// POST new review (pending approval)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = reviewSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const review = await prisma.review.create({
      data: {
        name: validated.data.name,
        rating: validated.data.rating,
        content: validated.data.content,
        service: validated.data.service || null,
        isApproved: false,
      },
    });

    return NextResponse.json({ data: review }, { status: 201 });
  } catch (error) {
    console.error("[REVIEWS_POST]", error);
    return NextResponse.json(
      { error: "שגיאת שרת, אנא נסו שוב מאוחר יותר" },
      { status: 500 }
    );
  }
}
