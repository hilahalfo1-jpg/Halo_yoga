import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth is handled by the existing middleware on /api/admin/* — only an
// authenticated admin reaches this handler, so the token is never exposed publicly.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = process.env.CALENDAR_FEED_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "הפיד לא מוגדר" }, { status: 500 });
    }

    const host = req.headers.get("host");
    if (!host) {
      return NextResponse.json({ error: "שגיאה בזיהוי הכתובת" }, { status: 500 });
    }

    return NextResponse.json({
      webcalUrl: `webcal://${host}/api/calendar?token=${token}`,
      httpsUrl: `https://${host}/api/calendar?token=${token}`,
    });
  } catch (err) {
    console.error("[calendar-feed-url] failed:", err);
    return NextResponse.json({ error: "שגיאה בקבלת הקישור ליומן" }, { status: 500 });
  }
}
