import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Section from "@/components/ui/Section";
import Badge from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  MASSAGE: "עיסוי",
  YOGA: "יוגה",
  PILATES: "פילאטיס",
  HEALTH: "בריאות",
  TIPS: "טיפים",
};

async function getPost(slug: string) {
  const post = await prisma.blogPost.findUnique({
    where: { slug },
  });
  if (!post || !post.isPublished) return null;
  return post;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) {
    return { title: "מאמר לא נמצא" };
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://haloyogamassage.com";

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.author],
      ...(post.coverImage && {
        images: [{ url: post.coverImage }],
      }),
    },
    alternates: {
      canonical: `${baseUrl}/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://haloyogamassage.com";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    author: {
      "@type": "Person",
      name: post.author,
    },
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    description: post.excerpt,
    ...(post.coverImage && {
      image: post.coverImage,
    }),
    publisher: {
      "@type": "Organization",
      name: "HALO - יוגה ועיסוי",
      url: baseUrl,
    },
  };

  // Split content into paragraphs
  const paragraphs = post.content
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main>
        {/* Hero / Cover */}
        <div className="relative h-[40vh] min-h-[300px] sm:min-h-[350px] bg-gradient-to-br from-[#566668] via-[#637577] to-[#454f50] flex items-end">
          {post.coverImage && (
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          )}
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 pt-20 sm:pt-24 w-full">
            <Badge className="mb-3 bg-white/20 text-white border-white/30">
              {CATEGORY_LABELS[post.category] || post.category}
            </Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-white/70 text-sm">
              <span>{post.author}</span>
              <span>|</span>
              <span>
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString("he-IL", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <Section>
          <div className="max-w-3xl mx-auto">
            {/* Back link */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-secondary hover:underline mb-8 text-sm font-medium"
            >
              <ArrowRight className="h-4 w-4" />
              חזרה לבלוג
            </Link>

            {/* Excerpt */}
            <p className="text-lg text-text-muted mb-8 leading-relaxed font-medium border-r-4 border-secondary pr-4">
              {post.excerpt}
            </p>

            {/* Content */}
            <article className="prose prose-lg max-w-none">
              {paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className="text-text leading-relaxed mb-6 text-base"
                >
                  {paragraph.trim()}
                </p>
              ))}
            </article>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-border text-center">
              <p className="text-text-muted mb-4">נהניתם מהמאמר?</p>
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-secondary hover:underline font-medium"
              >
                <ArrowRight className="h-4 w-4" />
                עוד מאמרים בבלוג
              </Link>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
