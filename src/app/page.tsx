import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import ServicesGrid from "@/components/home/ServicesGrid";
import HowItWorks from "@/components/home/HowItWorks";
import AboutPreview from "@/components/home/AboutPreview";
import ReviewsCarousel from "@/components/home/ReviewsCarousel";
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
  });
  return reviews.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

export default async function HomePage() {
  const [services, reviews] = await Promise.all([
    getServices(),
    getApprovedReviews(),
  ]);

  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <ServicesGrid services={services} />
        <HowItWorks />
        <AboutPreview />
        <ReviewsCarousel reviews={reviews} />
        <FAQ />
        <QuickContact />
      </main>
      <Footer />
    </>
  );
}
