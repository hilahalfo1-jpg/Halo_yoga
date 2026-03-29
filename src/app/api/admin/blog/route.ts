import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper: generate a URL-safe slug from Hebrew title
function generateSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, "-")
    .replace(/[^\u0590-\u05FFa-z0-9-]/g, "") // keep Hebrew, latin, digits, hyphens
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || `post-${Date.now()}`;
}

// GET all blog posts (admin — drafts + published)
export async function GET() {
  try {
    const posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: posts });
  } catch (error) {
    console.error("[ADMIN_BLOG_GET]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// POST create blog post
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, content, excerpt, category, coverImage, isPublished } = body;

    if (!title || !content || !excerpt) {
      return NextResponse.json(
        { error: "חסרים שדות חובה (כותרת, תוכן, תקציר)" },
        { status: 400 }
      );
    }

    // Generate slug from title
    let slug = generateSlug(title);

    // Ensure uniqueness
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        category: category || "HEALTH",
        coverImage: coverImage || null,
        isPublished: isPublished || false,
        publishedAt: isPublished ? new Date() : null,
      },
    });

    return NextResponse.json({ data: post }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_BLOG_POST]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
