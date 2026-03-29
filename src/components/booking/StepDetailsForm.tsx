"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRef, useState } from "react";
import { Home, Camera, X } from "lucide-react";
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

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    data.customerPhoto ? URL.createObjectURL(data.customerPhoto) : null
  );

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png"];
    if (!allowed.includes(file.type)) {
      alert("סוג קובץ לא נתמך. השתמשו ב-JPG או PNG");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert("הקובץ גדול מדי. מקסימום 3MB");
      return;
    }

    onUpdate({ customerPhoto: file });
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    onUpdate({ customerPhoto: null });
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

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

        {/* Customer Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-text mb-1.5">
            העלאת תמונת פנים (אופציונלי)
          </label>
          <input
            ref={photoInputRef}
            type="file"
            accept=".jpg,.jpeg,.png"
            onChange={handlePhotoChange}
            className="hidden"
          />
          {photoPreview ? (
            <div className="relative inline-block">
              <img
                src={photoPreview}
                alt="תמונת לקוח"
                className="w-24 h-24 rounded-lg object-cover border border-border"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute -top-2 -left-2 p-1 rounded-full bg-error text-white shadow-sm hover:bg-red-700 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all text-sm text-text-muted"
            >
              <Camera className="h-5 w-5" />
              JPG / PNG, עד 3MB
            </button>
          )}
        </div>

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

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onBack} fullWidth className="sm:w-auto">
            חזרה
          </Button>
          <Button type="submit" fullWidth>
            המשך לאישור
          </Button>
        </div>
      </form>
    </div>
  );
}
