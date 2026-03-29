"use client";

import { useState, useMemo } from "react";
import { PenLine } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StarRating from "@/components/ui/StarRating";
import EmptyState from "@/components/ui/EmptyState";
import ReviewSubmitModal from "./ReviewSubmitModal";
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

interface ReviewsPageClientProps {
  reviews: ReviewItem[];
  googleReviews?: GoogleReviewItem[];
}

/** Unified review for sorting & rendering */
interface UnifiedReview {
  id: string;
  name: string;
  rating: number;
  content: string;
  service: string | null;
  date: string; // ISO
  source: "internal" | "google";
  profilePhotoUrl?: string | null;
}

export default function ReviewsPageClient({
  reviews,
  googleReviews = [],
}: ReviewsPageClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState("ALL");

  // Merge internal + google reviews into unified list
  const allReviews = useMemo<UnifiedReview[]>(() => {
    const internal: UnifiedReview[] = reviews.map((r) => ({
      id: r.id,
      name: r.name,
      rating: r.rating,
      content: r.content,
      service: r.service,
      date: r.createdAt,
      source: "internal",
    }));

    const google: UnifiedReview[] = googleReviews.map((r) => ({
      id: r.id,
      name: r.authorName,
      rating: r.rating,
      content: r.text || "",
      service: null,
      date: r.time,
      source: "google",
      profilePhotoUrl: r.profilePhotoUrl,
    }));

    return [...internal, ...google].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [reviews, googleReviews]);

  const averageRating =
    allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;

  const filters = [
    { value: "ALL", label: "הכל" },
    { value: "עיסוי", label: "עיסויים" },
    { value: "יוגה", label: "יוגה" },
    ...(googleReviews.length > 0
      ? [{ value: "GOOGLE", label: "Google" }]
      : []),
  ];

  const filtered = useMemo(() => {
    if (filter === "ALL") return allReviews;
    if (filter === "GOOGLE") return allReviews.filter((r) => r.source === "google");
    return allReviews.filter((r) =>
      r.service ? r.service.toLowerCase().includes(filter.toLowerCase()) : false
    );
  }, [filter, allReviews]);

  return (
    <>
      {/* Stats */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-2">
          <StarRating rating={Math.round(averageRating)} size="lg" />
          <span className="text-2xl font-bold text-text">
            {averageRating.toFixed(1)}
          </span>
        </div>
        <p className="text-text-secondary">
          {allReviews.length} המלצות מלקוחות מרוצים
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        {/* Filter tabs */}
        <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-start flex-wrap">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === f.value
                  ? "bg-primary text-white"
                  : "bg-surface text-text-secondary hover:bg-surface-alt"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          onClick={() => setIsModalOpen(true)}
          className="gap-2 w-full sm:w-auto"
        >
          <PenLine className="h-4 w-4" />
          כתבו המלצה
        </Button>
      </div>

      {/* Reviews Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="אין המלצות עדיין"
          description="היו הראשונים לכתוב המלצה!"
          action={
            <Button variant="outline" onClick={() => setIsModalOpen(true)}>
              כתבו המלצה
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filtered.map((review) => (
            <Card key={`${review.source}-${review.id}`} className="flex flex-col">
              {/* Author row — Google style */}
              <div className="flex items-center gap-3 mb-3">
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-text text-sm truncate">{review.name}</p>
                    {review.source === "google" && <GoogleBadge />}
                  </div>
                  {review.service && (
                    <p className="text-xs text-text-muted truncate">{review.service}</p>
                  )}
                </div>
              </div>
              <StarRating rating={review.rating} size="sm" />
              {review.content && (
                <p className="text-text mt-3 leading-relaxed text-sm flex-1">
                  &ldquo;{review.content}&rdquo;
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <ReviewSubmitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
