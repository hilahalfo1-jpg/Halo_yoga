"use client";

import { useState } from "react";
import { PenLine } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StarRating from "@/components/ui/StarRating";
import EmptyState from "@/components/ui/EmptyState";
import ReviewSubmitModal from "./ReviewSubmitModal";
import type { ReviewItem } from "@/types";

interface ReviewsPageClientProps {
  reviews: ReviewItem[];
}

export default function ReviewsPageClient({ reviews }: ReviewsPageClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState("ALL");

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const filters = [
    { value: "ALL", label: "הכל" },
    { value: "עיסוי", label: "עיסויים" },
    { value: "יוגה", label: "יוגה" },
  ];

  const filtered =
    filter === "ALL"
      ? reviews
      : reviews.filter((r) =>
          r.service ? r.service.toLowerCase().includes(filter.toLowerCase()) : false
        );

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
          {reviews.length} המלצות מלקוחות מרוצים
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        {/* Filter tabs */}
        <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-start">
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
            <Card key={review.id} className="flex flex-col">
              <StarRating rating={review.rating} size="sm" />
              <p className="text-text mt-4 mb-4 leading-relaxed text-sm flex-1">
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
