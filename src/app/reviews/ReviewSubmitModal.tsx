"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import StarRating from "@/components/ui/StarRating";
import { reviewSchema, type ReviewFormData } from "@/lib/validations";

interface ReviewSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReviewSubmitModal({
  isOpen,
  onClose,
}: ReviewSubmitModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [rating, setRating] = useState(0);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0 },
  });

  const handleRatingChange = (value: number) => {
    setRating(value);
    setValue("rating", value, { shouldValidate: true });
  };

  const onSubmit = async (data: ReviewFormData) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success("ההמלצה נשלחה לאישור, תודה!");
        reset();
        setRating(0);
        onClose();
      } else {
        const result = await res.json();
        toast.error(result.error || "שגיאה בשליחת ההמלצה");
      }
    } catch {
      toast.error("שגיאת שרת, אנא נסו שוב מאוחר יותר");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="כתבו המלצה" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="שם *"
          placeholder="השם שלכם"
          error={errors.name?.message}
          {...register("name")}
        />

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            דירוג *
          </label>
          <StarRating
            rating={rating}
            size="lg"
            interactive
            onChange={handleRatingChange}
          />
          {errors.rating?.message && (
            <p className="mt-1.5 text-sm text-error">{errors.rating.message}</p>
          )}
        </div>

        <Textarea
          label="ההמלצה שלכם *"
          placeholder="ספרו על החוויה שלכם..."
          rows={4}
          error={errors.content?.message}
          {...register("content")}
        />

        <Input
          label="סוג שירות"
          placeholder="למשל: עיסוי שוודי, יוגה..."
          error={errors.service?.message}
          {...register("service")}
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" isLoading={isLoading} fullWidth>
            שליחת המלצה
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            ביטול
          </Button>
        </div>
      </form>
    </Modal>
  );
}
