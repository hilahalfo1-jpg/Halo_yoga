import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

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
