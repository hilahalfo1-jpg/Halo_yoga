import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE exception or rule by id
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Try deleting as exception first
    try {
      await prisma.availabilityException.delete({
        where: { id: params.id },
      });
      return NextResponse.json({ success: true });
    } catch {
      // Not an exception — try as a rule
    }

    // Try deleting as rule
    await prisma.availabilityRule.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AVAILABILITY_DELETE]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
