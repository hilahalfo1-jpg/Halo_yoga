import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      bookingId,
      idNumber,
      conditions,
      conditionDetails,
      signatureData,
      medicalDocUrl,
    } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "חסר מזהה הזמנה" },
        { status: 400 }
      );
    }

    // Verify booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "הזמנה לא נמצאה" },
        { status: 404 }
      );
    }

    // Upload signature image to Vercel Blob if provided
    let signatureUrl: string | null = null;
    if (signatureData) {
      try {
        // Convert base64 data URL to buffer
        const base64Data = signatureData.replace(
          /^data:image\/png;base64,/,
          ""
        );
        const buffer = Buffer.from(base64Data, "base64");
        const blob = await put(
          `signatures/${bookingId}-${Date.now()}.png`,
          buffer,
          { access: "public", contentType: "image/png" }
        );
        signatureUrl = blob.url;
      } catch (e) {
        console.error("[MEDICAL_FORM] Signature upload error:", e);
      }
    }

    // Create medical form record
    const medicalForm = await prisma.medicalForm.create({
      data: {
        bookingId,
        idNumber: idNumber || null,
        conditions: JSON.stringify(conditions || []),
        conditionDetails: conditionDetails || null,
        signatureUrl,
        medicalDocUrl: medicalDocUrl || null,
      },
    });

    return NextResponse.json({ data: medicalForm }, { status: 201 });
  } catch (error) {
    // Handle unique constraint (medical form already exists for this booking)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "טופס רפואי כבר קיים עבור הזמנה זו" },
        { status: 409 }
      );
    }

    console.error("[MEDICAL_FORM_POST]", error);
    return NextResponse.json(
      { error: "שגיאת שרת, אנא נסו שוב" },
      { status: 500 }
    );
  }
}
