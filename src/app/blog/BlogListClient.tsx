"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import Section from "@/components/ui/Section";
import Badge from "@/components/ui/Badge";

interface BlogPostItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  coverImage: string | null;
  author: string;
  publishedAt: string | null;
  createdAt: string;
}

const CATEGORIES = [
  { value: "ALL", label: "הכל" },
  { value: "MASSAGE", label: "עיסוי" },
  { value: "YOGA", label: "יוגה" },
  { value: "PILATES", label: "פילאטיס" },
  { value: "HEALTH", label: "בריאות" },
  { value: "TIPS", label: "טיפים" },
];

const CATEGORY_LABELS: Record<string, string> = {
  MASSAGE: "עיסוי",
  YOGA: "יוגה",
  PILATES: "פילאטיס",
  HEALTH: "בריאות",
  TIPS: "טיפים",
};

const CATEGORY_COLORS: Record<string, string> = {
  MASSAGE: "bg-purple-100 text-purple-700 border-purple-200",
  YOGA: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PILATES: "bg-blue-100 text-blue-700 border-blue-200",
  HEALTH: "bg-rose-100 text-rose-700 border-rose-200",
  TIPS: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function BlogListClient({ posts }: { posts: BlogPostItem[] }) {
  const [activeCategory, setActiveCategory] = useState("ALL");

  const filtered =
    activeCategory === "ALL"
      ? posts
      : posts.filter((p) => p.category === activeCategory);

  return (
    <Section>
      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 justify-center">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
              activeCategory === cat.value
                ? "bg-secondary text-white border-secondary"
                : "bg-white text-text-muted border-border hover:border-secondary hover:text-secondary"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Blog Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-muted text-lg">אין מאמרים בקטגוריה זו עדיין</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Link href={`/blog/${post.slug}`}>
                <article className="group bg-white rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
                  {/* Cover Image */}
                  <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-[#566668] via-[#637577] to-[#454f50]">
                    {post.coverImage ? (
                      <Image
                        src={post.coverImage}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl text-white/30 font-bold">
                          HALO
                        </span>
                      </div>
                    )}
                    {/* Category badge on image */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                          CATEGORY_COLORS[post.category] ||
                          "bg-gray-100 text-gray-700 border-gray-200"
                        }`}
                      >
                        {CATEGORY_LABELS[post.category] || post.category}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-text mb-2 line-clamp-2 group-hover:text-secondary transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-text-muted text-sm mb-4 line-clamp-3 flex-1">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-text-muted pt-3 border-t border-border">
                      <span>
                        {post.publishedAt
                          ? new Date(post.publishedAt).toLocaleDateString(
                              "he-IL",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )
                          : ""}
                      </span>
                      <span className="text-secondary font-medium group-hover:underline">
                        קראו עוד
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </Section>
  );
}
