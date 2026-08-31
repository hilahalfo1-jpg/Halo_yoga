import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { blogPatchSchema } from "@/lib/validations";

// GET single blog post
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { id: params.id },
    });

    if (!post) {
      return NextResponse.json({ error: "מאמר לא נמצא" }, { status: 404 });
    }

    return NextResponse.json({ data: post });
  } catch (error) {
    console.error("[ADMIN_BLOG_GET_ONE]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// PATCH update blog post
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validated = blogPatchSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.blogPost.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "מאמר לא נמצא" }, { status: 404 });
    }

    // If transitioning to published and no publishedAt yet, set it
    const updateData: Record<string, unknown> = { ...validated.data };
    if (validated.data.isPublished === true && !existing.publishedAt) {
      updateData.publishedAt = new Date();
    }

    const post = await prisma.blogPost.update({
      where: { id: params.id },
      data: updateData,
    });

    revalidatePath("/", "layout");
    return NextResponse.json({ data: post });
  } catch (error) {
    console.error("[ADMIN_BLOG_PATCH]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// DELETE blog post
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.blogPost.delete({
      where: { id: params.id },
    });

    revalidatePath("/", "layout");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_BLOG_DELETE]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}
