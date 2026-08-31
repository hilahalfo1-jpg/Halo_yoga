import { prisma } from "@/lib/prisma";
import { getGoogleReviews, getGoogleRatingInfo } from "@/lib/google-reviews";

export const revalidate = 60;

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import ServicesGrid from "@/components/home/ServicesGrid";
import HowItWorks from "@/components/home/HowItWorks";
import GiftCardPromo from "@/components/home/GiftCardPromo";
import AboutPreview from "@/components/home/AboutPreview";
import ReviewsCarousel from "@/components/home/ReviewsCarousel";
import BlogPreview from "@/components/home/BlogPreview";
import FAQ from "@/components/home/FAQ";
import QuickContact from "@/components/home/QuickContact";
import type { ServiceItem, ReviewItem } from "@/types";

async function getServices(): Promise<ServiceItem[]> {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return services.map((s) => ({
    ...s,
    category: s.category as ServiceItem["category"],
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));
}

async function getApprovedReviews(): Promise<ReviewItem[]> {
  const reviews = await prisma.review.findMany({
    where: { isApproved: true },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  return reviews.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

// Aggregate over ALL approved reviews (for the JSON-LD rating), without fetching them
async function getReviewStats(): Promise<{ count: number; avgRating: number }> {
  const agg = await prisma.review.aggregate({
    where: { isApproved: true },
    _avg: { rating: true },
    _count: true,
  });
  return { count: agg._count, avgRating: agg._avg.rating ?? 0 };
}

async function getLatestBlogPosts() {
  const posts = await prisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });
  return posts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    category: p.category,
    coverImage: p.coverImage,
    publishedAt: p.publishedAt?.toISOString() || null,
  }));
}

function getJsonLd(reviewCount: number, avgRating: number) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://haloyogamassage.com";
  return {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    name: "HALO - יוגה ועיסוי רפואי",
    image: `${baseUrl}/images/logo.png`,
    url: baseUrl,
    telephone: "+972-54-313-5182",
    email: "hilahalfo1@gmail.com",
    address: {
      "@type": "PostalAddress",
      streetAddress: "רחוב דובנוב",
      addressLocality: "ראשון לציון",
      addressCountry: "IL",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 31.9646,
      longitude: 34.8046,
    },
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Sunday", opens: "11:00", closes: "20:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Monday", opens: "07:00", closes: "20:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Wednesday", opens: "07:00", closes: "20:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Thursday", opens: "07:00", closes: "20:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Friday", opens: "09:00", closes: "17:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "11:00", closes: "18:30" },
    ],
    priceRange: "₪140 - ₪350",
    ...(reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: avgRating.toFixed(1),
        reviewCount: reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };
}

export default async function HomePage() {
  const [services, reviews, googleReviews, latestPosts, googleRatingInfo, reviewStats] = await Promise.all([
    getServices(),
    getApprovedReviews(),
    getGoogleReviews(12),
    getLatestBlogPosts(),
    getGoogleRatingInfo(),
    getReviewStats(),
  ]);

  const jsonLd = getJsonLd(reviewStats.count, reviewStats.avgRating);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main>
        <HeroSection />
        <ServicesGrid services={services} />
        <HowItWorks />
        <GiftCardPromo />
        <AboutPreview />
        <ReviewsCarousel reviews={reviews} googleReviews={googleReviews} googleRating={googleRatingInfo.rating} googleTotalReviews={googleRatingInfo.totalReviews} />
        <BlogPreview posts={latestPosts} />
        <FAQ />
        <QuickContact />
      </main>
      <Footer />
    </>
  );
}
