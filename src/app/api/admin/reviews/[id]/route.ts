import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

  try {
    const body = await req.json();
    const { isApproved } = body;

    const existing = await prisma.review.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "המלצה לא נמצאה" }, { status: 404 });
    }

    const updated = await prisma.review.update({
      where: { id: params.id },
      data: { isApproved },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[ADMIN_REVIEWS_PATCH]", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון המלצה" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

  try {
    const existing = await prisma.review.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "המלצה לא נמצאה" }, { status: 404 });
    }

    await prisma.review.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_REVIEWS_DELETE]", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת המלצה" },
      { status: 500 }
    );
  }
}
