import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Reads request.url — always dynamic (avoids dynamic-server-usage noise at build)
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: leads });
  } catch (error) {
    console.error("[ADMIN_LEADS_GET]", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת פניות" },
      { status: 500 }
    );
  }
}
