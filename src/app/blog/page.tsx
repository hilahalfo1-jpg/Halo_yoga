import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
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
        {/* Hero */}
        <div className="relative h-[40vh] min-h-[260px] sm:min-h-[300px] bg-gradient-to-br from-[#566668] via-[#637577] to-[#454f50] flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 pt-20 sm:pt-24 w-full">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
              הבלוג שלנו
            </h1>
            <p className="text-white/70 text-base md:text-lg">
              מאמרים, טיפים ותובנות מעולם היוגה והעיסוי
            </p>
          </div>
        </div>

        <BlogListClient posts={posts} />
      </main>
      <Footer />
    </>
  );
}
