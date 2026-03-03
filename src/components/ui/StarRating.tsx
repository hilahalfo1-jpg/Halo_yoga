"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

const sizeStyles = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export default function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onChange,
}: StarRatingProps) {
  return (
    <div className="flex gap-0.5" dir="ltr">
      {Array.from({ length: maxRating }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= rating;

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(starValue)}
            className={cn(
              "transition-colors",
              interactive
                ? "cursor-pointer hover:scale-110"
                : "cursor-default"
            )}
            aria-label={`${starValue} כוכבים`}
          >
            <Star
              className={cn(
                sizeStyles[size],
                isFilled
                  ? "fill-warning text-warning"
                  : "fill-none text-border"
              )}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
}
