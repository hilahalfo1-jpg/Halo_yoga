import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — full medical form for a booking (list endpoint returns only { id })
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const medicalForm = await prisma.medicalForm.findUnique({
      where: { bookingId: params.id },
    });

    if (!medicalForm) {
      return NextResponse.json({ error: "טופס רפואי לא נמצא" }, { status: 404 });
    }

    return NextResponse.json({ data: medicalForm });
  } catch (error) {
    console.error("[ADMIN_BOOKING_MEDICAL_FORM_GET]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
