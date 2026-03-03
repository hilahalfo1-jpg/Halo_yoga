import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Section from "@/components/ui/Section";
import ReviewsPageClient from "./ReviewsPageClient";
import type { ReviewItem } from "@/types";

export const metadata: Metadata = {
  title: "המלצות",
  description: "קראו המלצות מלקוחות מרוצים על טיפולי העיסוי ושיעורי היוגה שלנו.",
};

async function getReviews(): Promise<ReviewItem[]> {
  const reviews = await prisma.review.findMany({
    where: { isApproved: true },
    orderBy: { createdAt: "desc" },
  });
  return reviews.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

export default async function ReviewsPage() {
  const reviews = await getReviews();

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <div className="relative h-[35vh] min-h-[260px] bg-gradient-to-br from-[#566668] via-[#637577] to-[#454f50] flex items-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 pt-24 w-full">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
              המלצות
            </h1>
            <p className="text-white/70 text-lg">
              מה הלקוחות שלנו אומרים
            </p>
          </div>
        </div>

        <Section>
          <ReviewsPageClient reviews={reviews} />
        </Section>
      </main>
      <Footer />
    </>
  );
}
