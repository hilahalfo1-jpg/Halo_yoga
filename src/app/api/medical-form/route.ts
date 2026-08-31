import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { medicalFormSchema } from "@/lib/validations";
import { TERMS_VERSION } from "@/lib/terms-content";

const MAX_SIGNATURE_BYTES = 200 * 1024; // 200KB decoded

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Shadow-banned bookings get a fake success (no real booking exists).
    // Must run BEFORE validation — shadow ids short-circuit.
    if (
      typeof body?.bookingId === "string" &&
      body.bookingId.startsWith("shadow_")
    ) {
      return NextResponse.json({ data: { ok: true } });
    }

    const validated = medicalFormSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const {
      bookingId,
      idNumber,
      conditions,
      conditionDetails,
      signatureData,
      medicalDocUrl,
    } = validated.data;

    // Cap decoded signature size (computed from base64 length)
    if (signatureData) {
      const base64Part = signatureData.slice(signatureData.indexOf(",") + 1);
      const decodedSize = Math.floor((base64Part.length * 3) / 4);
      if (decodedSize > MAX_SIGNATURE_BYTES) {
        return NextResponse.json(
          { error: "החתימה גדולה מדי" },
          { status: 400 }
        );
      }
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
        const isJpeg = signatureData.startsWith("data:image/jpeg");
        const base64Data = signatureData.slice(signatureData.indexOf(",") + 1);
        const buffer = Buffer.from(base64Data, "base64");
        const blob = await put(
          `signatures/${bookingId}-${Date.now()}.${isJpeg ? "jpg" : "png"}`,
          buffer,
          { access: "public", contentType: isJpeg ? "image/jpeg" : "image/png" }
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
        // Stamped server-side from the canonical constant — the client-sent
        // termsVersion is still accepted by the schema (old clients) but never trusted.
        termsVersion: TERMS_VERSION,
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
