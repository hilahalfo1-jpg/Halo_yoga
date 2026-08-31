import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBlogReminderEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Weekly cron (see vercel.json): email Hila if no blog post was published
// in the last 7 days. Vercel sends `Authorization: Bearer ${CRON_SECRET}`.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[CRON_BLOG_REMINDER] CRON_SECRET env is not set");
    return NextResponse.json({ error: "שגיאת תצורה" }, { status: 500 });
  }

  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  }

  try {
    const latest = await prisma.blogPost.findFirst({
      where: { isPublished: true, publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      select: { publishedAt: true },
    });

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const shouldSend =
      !latest?.publishedAt || latest.publishedAt.getTime() < sevenDaysAgo;

    let sent = false;
    if (shouldSend) {
      sent = await sendBlogReminderEmail();
    }

    return NextResponse.json({ due: shouldSend, sent });
  } catch (error) {
    console.error("[CRON_BLOG_REMINDER]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
