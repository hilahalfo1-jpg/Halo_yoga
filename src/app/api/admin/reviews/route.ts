import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Reads request.url — always dynamic (avoids dynamic-server-usage noise at build)
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter");

    const where: Record<string, unknown> = {};
    if (filter === "approved") {
      where.isApproved = true;
    } else if (filter === "pending") {
      where.isApproved = false;
    }

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: reviews });
  } catch (error) {
    console.error("[ADMIN_REVIEWS_GET]", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת המלצות" },
      { status: 500 }
    );
  }
}
