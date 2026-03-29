"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";
import Section from "@/components/ui/Section";
import Button from "@/components/ui/Button";
import { useSiteContent } from "@/lib/hooks/useSiteContent";
import type { ReviewItem, GoogleReviewItem } from "@/types";

/** Google colored "G" icon */
function GoogleIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

/** Small yellow stars */
function MiniStars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={i < count ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          className={i < count ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}
        >
          <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
        </svg>
      ))}
    </div>
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
  profilePhotoUrl: string | null;
  date: string;
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return "היום";
  if (diffDays === 1) return "אתמול";
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return "לפני שבוע";
  if (diffWeeks < 4) return `לפני ${diffWeeks} שבועות`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "לפני חודש";
  if (diffMonths < 12) return `לפני ${diffMonths} חודשים`;
  return `לפני ${Math.floor(diffDays / 365)} שנים`;
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
      profilePhotoUrl: null,
      date: r.createdAt,
    }));

    const google: CarouselReview[] = googleReviews
      .filter((r) => r.text)
      .map((r) => ({
        id: r.id,
        name: r.authorName,
        rating: r.rating,
        content: r.text!,
        service: null,
        source: "google",
        profilePhotoUrl: r.profilePhotoUrl,
        date: r.time,
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
          <MiniStars count={Math.round(averageRating)} />
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-lg p-6 h-full flex flex-col min-w-0 transition-shadow duration-200">
              {/* Header row: photo | name+time | stars+google */}
              <div className="flex items-center gap-3 mb-4">
                {review.profilePhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={review.profilePhotoUrl}
                    alt={review.name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {review.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 text-right min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{review.name}</p>
                  <p className="text-xs text-gray-400">{getRelativeTime(review.date)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <MiniStars count={review.rating} />
                  {review.source === "google" && <GoogleIcon />}
                </div>
              </div>
              {/* Review text */}
              <p className="text-gray-600 text-sm leading-relaxed text-right flex-1">
                {review.content}
              </p>
            </div>
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
