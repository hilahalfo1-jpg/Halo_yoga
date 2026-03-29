"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { PenLine } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ReviewSubmitModal from "./ReviewSubmitModal";
import type { ReviewItem, GoogleReviewItem } from "@/types";

/** Google colored icon */
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

function MiniStars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={i < count ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className={i < count ? "text-yellow-400 fill-yellow-400" : "text-border"}>
          <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
        </svg>
      ))}
    </div>
  );
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
          <MiniStars count={Math.round(averageRating)} />
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
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${
                filter === f.value
                  ? "bg-secondary text-white border-secondary"
                  : "bg-bg text-text-muted border-border hover:border-secondary hover:text-secondary"
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
          {filtered.map((review, index) => (
            <motion.div
              key={`${review.source}-${review.id}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              className="bg-bg rounded-2xl border border-border shadow-sm hover:shadow-md hover:-translate-y-1 p-6 h-full flex flex-col min-w-0 transition-all duration-300"
            >
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
                  <p className="font-semibold text-sm text-text truncate">{review.name}</p>
                  <p className="text-xs text-text-muted">{getRelativeTime(review.date)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <MiniStars count={review.rating} />
                  {review.source === "google" && <GoogleIcon />}
                </div>
              </div>
              {review.content && (
                <p className="text-text-secondary text-sm leading-relaxed text-right flex-1">
                  {review.content}
                </p>
              )}
            </motion.div>
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
