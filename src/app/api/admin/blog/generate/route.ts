import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const BLOG_CATEGORIES: Record<string, string> = {
  MASSAGE: "עיסוי",
  YOGA: "יוגה",
  PILATES: "פילאטיס",
  HEALTH: "בריאות",
  TIPS: "טיפים",
};

export async function POST(req: Request) {
  try {
    const { topic, category } = await req.json();

    if (!topic) {
      return NextResponse.json(
        { error: "נא להזין נושא למאמר" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "מפתח API של Anthropic לא הוגדר" },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });

    const categoryLabel = BLOG_CATEGORIES[category] || "בריאות";

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `אתה כותב תוכן מקצועי עבור עסק של יוגה ועיסוי רפואי בישראל. כתוב מאמר בלוג מקצועי בעברית.

נושא: ${topic}
קטגוריה: ${categoryLabel}

החזר JSON בלבד (ללא markdown, ללא backticks) בפורמט הבא:
{
  "title": "כותרת המאמר",
  "content": "תוכן המאמר המלא. פסקאות מופרדות בשורה ריקה. כתוב לפחות 4-5 פסקאות.",
  "excerpt": "תקציר של 1-2 משפטים"
}

הנחיות:
- כתוב בשפה מקצועית אך נגישה
- התמקד ביתרונות הטיפול/הפעילות
- כלול מידע מעשי שהקורא יכול ליישם
- הכותרת צריכה להיות מושכת ובעברית
- התוכן צריך להיות אינפורמטיבי ומקורי`,
        },
      ],
    });

    // Extract text from response
    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "לא התקבלה תשובה מ-AI" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(textBlock.text);

    return NextResponse.json({
      data: {
        title: parsed.title,
        content: parsed.content,
        excerpt: parsed.excerpt,
      },
    });
  } catch (error) {
    console.error("[BLOG_GENERATE]", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת תוכן עם AI" },
      { status: 500 }
    );
  }
}
