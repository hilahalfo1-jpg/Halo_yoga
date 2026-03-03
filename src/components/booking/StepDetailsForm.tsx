"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Home } from "lucide-react";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { formatPrice, cn } from "@/lib/utils";
import type { BookingData } from "./BookingWizard";

const detailsSchema = z.object({
  customerName: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  customerPhone: z
    .string()
    .regex(/^05\d[-]?\d{7}$/, "מספר טלפון לא תקין (05X-XXXXXXX)"),
  customerEmail: z
    .string()
    .email("כתובת אימייל לא תקינה")
    .optional()
    .or(z.literal("")),
  notes: z.string().max(500, "ההערה ארוכה מדי").optional(),
});

type DetailsFormData = z.infer<typeof detailsSchema>;

interface StepDetailsFormProps {
  data: BookingData;
  onUpdate: (partial: Partial<BookingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepDetailsForm({
  data,
  onUpdate,
  onNext,
  onBack,
}: StepDetailsFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DetailsFormData>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail,
      notes: data.notes,
    },
  });

  const onSubmit = (formData: DetailsFormData) => {
    onUpdate({
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerEmail: formData.customerEmail || "",
      notes: formData.notes || "",
    });
    onNext();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-text mb-2">פרטים אישיים</h2>
      <p className="text-text-secondary mb-6">מלאו את הפרטים לקביעת התור</p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5 max-w-md mx-auto"
      >
        <Input
          label="שם מלא *"
          placeholder="השם המלא שלכם"
          error={errors.customerName?.message}
          {...register("customerName")}
        />
        <Input
          label="טלפון *"
          type="tel"
          placeholder="050-1234567"
          error={errors.customerPhone?.message}
          {...register("customerPhone")}
        />
        <Input
          label="אימייל"
          type="email"
          placeholder="your@email.com"
          error={errors.customerEmail?.message}
          {...register("customerEmail")}
        />
        <Textarea
          label="הערות"
          placeholder="יש משהו שחשוב לנו לדעת?"
          rows={3}
          error={errors.notes?.message}
          {...register("notes")}
        />

        {/* Home Visit Option */}
        {data.service?.homeVisitSurcharge != null && (
          <button
            type="button"
            onClick={() => onUpdate({ isHomeVisit: !data.isHomeVisit })}
            className={cn(
              "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-right",
              data.isHomeVisit
                ? "border-secondary bg-secondary/5"
                : "border-border hover:border-text-muted"
            )}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                data.isHomeVisit ? "bg-secondary text-white" : "bg-surface text-text-muted"
              )}
            >
              <Home className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-text">ביקור בית</p>
              <p className="text-xs text-text-muted">
                המטפלת תגיע אליכם הביתה (תוספת של{" "}
                {formatPrice(data.service.homeVisitSurcharge!)})
              </p>
            </div>
            <div
              className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                data.isHomeVisit ? "border-secondary bg-secondary" : "border-border"
              )}
            >
              {data.isHomeVisit && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
          </button>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" fullWidth>
            המשך לאישור
          </Button>
          <Button type="button" variant="ghost" onClick={onBack}>
            חזרה
          </Button>
        </div>
      </form>
    </div>
  );
}
