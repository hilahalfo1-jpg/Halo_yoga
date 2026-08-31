"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { giftDetailsFormSchema } from "@/lib/validations";
import type { GiftData } from "./BookingWizard";

type GiftDetailsFormData = z.infer<typeof giftDetailsFormSchema>;

export const GIFT_TEMPLATE_OPTIONS = [
  { value: "botanical", label: "בוטני (ברירת מחדל)", swatch: "#dfe6d6" },
  { value: "minimal", label: "מינימליסטי", swatch: "#f0efec" },
  { value: "festive", label: "חגיגי / יום הולדת", swatch: "#ffd7e3" },
  { value: "gold", label: "זהב / יוקרתי", swatch: "#1c1812" },
  { value: "romantic", label: "רומנטי", swatch: "#f7d2db" },
] as const;

const MESSAGE_MAX = 500;

interface StepGiftDetailsProps {
  gift: GiftData;
  onUpdate: (partial: Partial<GiftData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepGiftDetails({
  gift,
  onUpdate,
  onNext,
  onBack,
}: StepGiftDetailsProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<GiftDetailsFormData>({
    resolver: zodResolver(giftDetailsFormSchema),
    defaultValues: {
      purchaserName: gift.purchaserName,
      purchaserPhone: gift.purchaserPhone,
      purchaserEmail: gift.purchaserEmail,
      recipientName: gift.recipientName,
      message: gift.message,
    },
  });

  const messageValue = watch("message") ?? "";

  const onSubmit = (formData: GiftDetailsFormData) => {
    onUpdate({
      purchaserName: formData.purchaserName,
      purchaserPhone: formData.purchaserPhone,
      purchaserEmail: formData.purchaserEmail || "",
      recipientName: formData.recipientName,
      message: formData.message || "",
    });
    onNext();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-text mb-2">פרטי המתנה</h2>
      <p className="text-text-secondary mb-6">
        מלאו את הפרטים שלכם ואת פרטי מקבל/ת המתנה
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5 max-w-md mx-auto"
      >
        <Input
          label="השם שלך (הרוכש/ת) *"
          placeholder="השם המלא שלכם"
          error={errors.purchaserName?.message}
          {...register("purchaserName")}
        />
        <Input
          label="טלפון *"
          type="tel"
          placeholder="050-1234567"
          error={errors.purchaserPhone?.message}
          {...register("purchaserPhone")}
        />
        <Input
          label="אימייל"
          type="email"
          placeholder="your@email.com"
          error={errors.purchaserEmail?.message}
          {...register("purchaserEmail")}
        />
        <Input
          label="שם מקבל/ת המתנה *"
          placeholder="למי מיועדת המתנה?"
          error={errors.recipientName?.message}
          {...register("recipientName")}
        />
        <div>
          <Textarea
            label="הודעת ברכה"
            placeholder="כתבו הודעה אישית שתופיע על הגיפט קארד... (אופציונלי)"
            rows={4}
            maxLength={MESSAGE_MAX}
            error={errors.message?.message}
            {...register("message")}
          />
          <p className="text-xs text-text-muted mt-1 text-left" dir="ltr">
            {messageValue.length}/{MESSAGE_MAX}
          </p>
        </div>

        {/* Template picker */}
        <div>
          <label className="block text-sm font-medium text-text mb-2 text-right">
            עיצוב הגיפט קארד
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GIFT_TEMPLATE_OPTIONS.map((opt) => {
              const isSelected = gift.template === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onUpdate({ template: opt.value })}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 min-h-[44px] text-right transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border hover:bg-surface"
                  }`}
                >
                  <span
                    className="h-6 w-6 flex-shrink-0 rounded-md border border-black/10"
                    style={{ backgroundColor: opt.swatch }}
                    aria-hidden="true"
                  />
                  <span className="text-sm text-text leading-tight">
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button type="submit" fullWidth>
            המשך לאישור
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            fullWidth
            className="sm:w-auto"
          >
            חזרה
          </Button>
        </div>
      </form>
    </div>
  );
}
