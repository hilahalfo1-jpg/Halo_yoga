"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import Section from "@/components/ui/Section";
import Card from "@/components/ui/Card";
import StarRating from "@/components/ui/StarRating";
import Button from "@/components/ui/Button";
import type { ReviewItem } from "@/types";

interface ReviewsCarouselProps {
  reviews: ReviewItem[];
}

export default function ReviewsCarousel({ reviews }: ReviewsCarouselProps) {
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <Section bg="surface">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-text mb-4">
          מה אומרים עליי
        </h2>
        <div className="flex items-center justify-center gap-3 mb-2">
          <StarRating rating={Math.round(averageRating)} size="lg" />
          <span className="text-lg font-semibold text-text">
            {averageRating.toFixed(1)}
          </span>
        </div>
        <p className="text-text-secondary text-sm">
          מבוסס על {reviews.length} המלצות
        </p>
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {reviews.map((review, index) => (
          <motion.div
            key={review.id}
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
                <p className="font-medium text-text">{review.name}</p>
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
