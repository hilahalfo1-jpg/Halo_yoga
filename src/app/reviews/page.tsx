import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getGoogleReviews } from "@/lib/google-reviews";

export const revalidate = 60;
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Section from "@/components/ui/Section";
import ReviewsHero from "@/components/reviews/ReviewsHero";
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
    take: 60,
  });
  return reviews.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

export default async function ReviewsPage() {
  const [reviews, googleReviews] = await Promise.all([
    getReviews(),
    getGoogleReviews(),
  ]);

  return (
    <>
      <Header />
      <main>
        <ReviewsHero />

        <Section>
          <ReviewsPageClient reviews={reviews} googleReviews={googleReviews} />
        </Section>
      </main>
      <Footer />
    </>
  );
}
