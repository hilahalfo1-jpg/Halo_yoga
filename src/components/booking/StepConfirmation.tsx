"use client";

import { useState } from "react";
import { CalendarCheck, Clock, User, Phone, FileText, Home } from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatPrice, formatDuration } from "@/lib/utils";
import type { BookingData } from "./BookingWizard";

interface StepConfirmationProps {
  data: BookingData;
  onBack: () => void;
  onSuccess: (result: Record<string, unknown>) => void;
}

export default function StepConfirmation({
  data,
  onBack,
  onSuccess,
}: StepConfirmationProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!data.service || !data.date || !data.timeSlot) return;

    setIsLoading(true);
    try {
      // Build the startAt datetime
      const [hours, minutes] = data.timeSlot.startTime.split(":").map(Number);
      const startAt = new Date(data.date);
      startAt.setHours(hours, minutes, 0, 0);

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: data.service.id,
          startAt: startAt.toISOString(),
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail,
          notes: data.notes,
          isHomeVisit: data.isHomeVisit,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success("הבקשה נשלחה בהצלחה! ממתינה לאישור");
        onSuccess(result.data);
      } else {
        toast.error(result.error || "שגיאה בקביעת התור");
      }
    } catch {
      toast.error("שגיאת שרת, אנא נסו שוב מאוחר יותר");
    } finally {
      setIsLoading(false);
    }
  };

  const dateDisplay = data.date?.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <h2 className="text-2xl font-bold text-text mb-2">אישור הזמנה</h2>
      <p className="text-text-secondary mb-6">בדקו את הפרטים ואשרו</p>

      <Card className="max-w-md mx-auto space-y-4">
        {/* Service */}
        <div className="flex items-start gap-3 pb-4 border-b border-border">
          <CalendarCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-text-muted">שירות</p>
            <p className="font-semibold text-text">{data.service?.name}</p>
            <div className="flex items-center gap-4 mt-1 text-sm text-text-secondary">
              <span>{formatDuration(data.service?.duration || 0)}</span>
              <span>{formatPrice(data.service?.price || 0)}</span>
            </div>
            {data.isHomeVisit && data.service?.homeVisitSurcharge && (
              <p className="text-sm text-secondary mt-1">
                + ביקור בית: {formatPrice(data.service.homeVisitSurcharge)}
              </p>
            )}
          </div>
        </div>

        {/* Date & Time */}
        <div className="flex items-start gap-3 pb-4 border-b border-border">
          <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-text-muted">מועד</p>
            <p className="font-semibold text-text">{dateDisplay}</p>
            <p className="text-sm text-text-secondary" dir="ltr">
              {data.timeSlot?.startTime} - {data.timeSlot?.endTime}
            </p>
          </div>
        </div>

        {/* Customer */}
        <div className="flex items-start gap-3 pb-4 border-b border-border">
          <User className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-text-muted">פרטים אישיים</p>
            <p className="font-semibold text-text">{data.customerName}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 pb-4 border-b border-border">
          <Phone className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-text-muted">טלפון</p>
            <p className="font-semibold text-text" dir="ltr">
              {data.customerPhone}
            </p>
          </div>
        </div>

        {data.isHomeVisit && (
          <div className="flex items-start gap-3 pb-4 border-b border-border">
            <Home className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-text-muted">סוג טיפול</p>
              <p className="font-semibold text-text">ביקור בית</p>
            </div>
          </div>
        )}

        {data.notes && (
          <div className="flex items-start gap-3 pb-4 border-b border-border">
            <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-text-muted">הערות</p>
              <p className="text-sm text-text">{data.notes}</p>
            </div>
          </div>
        )}

        {/* Total Price */}
        <div className="bg-surface rounded-lg p-4 text-center">
          <p className="text-sm text-text-muted mb-1">סה&quot;כ לתשלום</p>
          <p className="text-2xl font-bold text-text">
            {formatPrice(
              (data.service?.price || 0) +
              (data.isHomeVisit ? (data.service?.homeVisitSurcharge || 0) : 0)
            )}
          </p>
        </div>
      </Card>

      {/* Cancellation policy */}
      <p className="text-xs text-text-muted text-center max-w-md mx-auto mt-4">
        ניתן לבטל תור עד 24 שעות לפני המועד ללא חיוב. ביטול מאוחר יותר עלול להיות כרוך בתשלום מלא.
      </p>

      <div className="flex flex-col-reverse sm:flex-row gap-3 max-w-md mx-auto mt-4">
        <Button variant="ghost" onClick={onBack} disabled={isLoading} fullWidth className="sm:w-auto">
          חזרה
        </Button>
        <Button
          onClick={handleConfirm}
          isLoading={isLoading}
          fullWidth
          size="lg"
        >
          אישור הזמנה
        </Button>
      </div>
    </div>
  );
}
