import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BlogHero from "@/components/blog/BlogHero";
import BlogListClient from "./BlogListClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "בלוג | HALO יוגה ועיסוי",
  description:
    "מאמרים מקצועיים בנושאי יוגה, עיסוי, פילאטיס, בריאות וטיפים לאורח חיים בריא.",
};

async function getPublishedPosts() {
  const posts = await prisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
  });
  return posts.map((p) => ({
    ...p,
    publishedAt: p.publishedAt?.toISOString() || null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <>
      <Header />
      <main>
        <BlogHero />

        <BlogListClient posts={posts} />
      </main>
      <Footer />
    </>
  );
}
