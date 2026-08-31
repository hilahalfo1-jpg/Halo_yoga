import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BlogHero from "@/components/blog/BlogHero";
import BlogListClient from "./BlogListClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "בלוג | HALO יוגה ועיסוי",
  description:
    "מאמרים מקצועיים בנושאי יוגה, עיסוי, פילאטיס, בריאות וטיפים לאורח חיים בריא.",
};

async function getPublishedPosts() {
  const posts = await prisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      category: true,
      coverImage: true,
      publishedAt: true,
    },
  });
  return posts.map((p) => ({
    ...p,
    publishedAt: p.publishedAt?.toISOString() || null,
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
