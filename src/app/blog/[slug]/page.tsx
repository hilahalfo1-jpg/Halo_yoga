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
import { formatDate } from "@/lib/utils";

export const revalidate = 60;

const CATEGORY_LABELS: Record<string, string> = {
  MASSAGE: "עיסוי",
  YOGA: "יוגה",
  PILATES: "פילאטיס",
  HEALTH: "בריאות",
  TIPS: "טיפים",
};

// Inline image token: [תמונה: <url>] or [תמונה: <url> | כיתוב]
const IMAGE_TOKEN_RE = /^\[תמונה:\s*(\S+)(?:\s*\|\s*(.+))?\]$/;

// Same blob-host check as medicalDocUrl in src/lib/validations.ts
function isAllowedImageUrl(u: string): boolean {
  try {
    const parsed = new URL(u);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(".public.blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

async function getPost(slug: string) {
  // 1. exact match (fast path)
  let post = await prisma.blogPost.findUnique({
    where: { slug },
  });

  // 2. fallback: tolerate whitespace / Unicode-normalization / encoding mismatches
  if (!post) {
    const norm = (s: string) => {
      try {
        return decodeURIComponent(s).normalize("NFC").trim();
      } catch {
        return s.normalize("NFC").trim();
      }
    };
    const target = norm(slug);
    const candidates = await prisma.blogPost.findMany({
      where: { isPublished: true },
    });
    post = candidates.find((p) => norm(p.slug) === target) ?? null;
  }

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
                {post.publishedAt ? formatDate(post.publishedAt) : ""}
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
              {paragraphs.map((paragraph, index) => {
                const trimmed = paragraph.trim();
                const match = trimmed.match(IMAGE_TOKEN_RE);
                if (match) {
                  // Token with a disallowed/invalid URL: hide it from readers
                  if (!isAllowedImageUrl(match[1])) return null;
                  const caption = match[2]?.trim();
                  return (
                    <figure key={index} className="my-8">
                      <Image
                        src={match[1]}
                        alt={caption || post.title}
                        width={800}
                        height={450}
                        sizes="(max-width: 800px) 100vw, 800px"
                        className="rounded-xl mx-auto"
                        style={{ width: "100%", maxWidth: 800, height: "auto" }}
                      />
                      {caption && (
                        <figcaption className="mt-2 text-sm text-text-muted text-center">
                          {caption}
                        </figcaption>
                      )}
                    </figure>
                  );
                }
                return (
                  <p
                    key={index}
                    className="text-text leading-relaxed mb-6 text-base"
                  >
                    {trimmed}
                  </p>
                );
              })}
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
