import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const serviceId = searchParams.get("serviceId");

    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") where.status = status;
    if (serviceId && serviceId !== "ALL") where.serviceId = serviceId;

    const bookings = await prisma.booking.findMany({
      where,
      include: { service: true },
      orderBy: { startAt: "desc" },
    });

    return NextResponse.json({ data: bookings });
  } catch (error) {
    console.error("[ADMIN_BOOKINGS_GET]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
