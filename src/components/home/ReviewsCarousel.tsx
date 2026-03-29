"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";
import Section from "@/components/ui/Section";
import Card from "@/components/ui/Card";
import StarRating from "@/components/ui/StarRating";
import Button from "@/components/ui/Button";
import { useSiteContent } from "@/lib/hooks/useSiteContent";
import type { ReviewItem, GoogleReviewItem } from "@/types";

/** Small Google "G" badge */
function GoogleBadge() {
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white mr-1.5"
      style={{ background: "#4285F4" }}
      title="ביקורת Google"
    >
      G
    </span>
  );
}

interface ReviewsCarouselProps {
  reviews: ReviewItem[];
  googleReviews?: GoogleReviewItem[];
}

interface CarouselReview {
  id: string;
  name: string;
  rating: number;
  content: string;
  service: string | null;
  source: "internal" | "google";
}

export default function ReviewsCarousel({
  reviews,
  googleReviews = [],
}: ReviewsCarouselProps) {
  const { t } = useSiteContent();

  // Merge and pick top-rated, max 6 total
  const displayReviews = useMemo<CarouselReview[]>(() => {
    const internal: CarouselReview[] = reviews.map((r) => ({
      id: r.id,
      name: r.name,
      rating: r.rating,
      content: r.content,
      service: r.service,
      source: "internal",
    }));

    const google: CarouselReview[] = googleReviews
      .filter((r) => r.text) // only show reviews with text
      .map((r) => ({
        id: r.id,
        name: r.authorName,
        rating: r.rating,
        content: r.text!,
        service: null,
        source: "google",
      }));

    return [...internal, ...google]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6);
  }, [reviews, googleReviews]);

  const averageRating =
    displayReviews.length > 0
      ? displayReviews.reduce((sum, r) => sum + r.rating, 0) /
        displayReviews.length
      : 0;

  const totalCount = reviews.length + googleReviews.length;

  return (
    <Section bg="surface">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
          {t("reviews", "title", "מה אומרים עליי")}
        </h2>
        <div className="flex items-center justify-center gap-3 mb-2">
          <StarRating rating={Math.round(averageRating)} size="lg" />
          <span className="text-lg font-semibold text-text">
            {averageRating.toFixed(1)}
          </span>
        </div>
        <p className="text-text-secondary text-sm">
          מבוסס על {totalCount} המלצות
        </p>
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {displayReviews.map((review, index) => (
          <motion.div
            key={`${review.source}-${review.id}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="min-w-[260px] max-w-[85vw] md:min-w-[350px] md:max-w-none snap-center flex-shrink-0"
          >
            <Card className="h-full">
              <StarRating rating={review.rating} size="sm" />
              <p className="text-text mt-4 mb-4 leading-relaxed text-sm">
                &ldquo;{review.content}&rdquo;
              </p>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center">
                  {review.source === "google" && <GoogleBadge />}
                  <p className="font-medium text-text">{review.name}</p>
                </div>
                {review.service && (
                  <p className="text-xs text-text-muted mt-0.5">
                    {review.service}
                  </p>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link href="/reviews">
          <Button variant="outline" className="gap-2">
            כל ההמלצות
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </Section>
  );
}
