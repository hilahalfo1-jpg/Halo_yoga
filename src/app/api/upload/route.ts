import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

// Sniff the real file type from magic bytes — the client-supplied
// `file.type` is user-controlled and must not be trusted.
function sniffFileType(
  bytes: Uint8Array
): { ext: "jpg" | "png" | "webp" | "pdf"; mime: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { ext: "png", mime: "image/png" };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return { ext: "webp", mime: "image/webp" };
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 // F
  ) {
    return { ext: "pdf", mime: "application/pdf" };
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "הקובץ גדול מדי. מקסימום 5MB" },
        { status: 400 }
      );
    }

    // Validate file type by magic bytes (images + PDF for medical docs)
    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffFileType(buffer);
    if (!sniffed) {
      return NextResponse.json(
        { error: "סוג קובץ לא נתמך. השתמשו ב-JPG, PNG, WebP או PDF" },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob under a server-generated filename
    const blob = await put(
      `uploads/${crypto.randomUUID()}.${sniffed.ext}`,
      buffer,
      { access: "public", contentType: sniffed.mime }
    );

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
    });
  } catch (error) {
    console.error("[PUBLIC_UPLOAD]", error);
    return NextResponse.json(
      { error: "שגיאה בהעלאת הקובץ" },
      { status: 500 }
    );
  }
}
