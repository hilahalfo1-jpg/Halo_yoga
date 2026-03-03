"use client";

import { useState } from "react";
import { CalendarX, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { formatDateTime } from "@/lib/utils";

interface CancelBookingClientProps {
  booking: {
    id: string;
    cancelToken: string;
    status: string;
    customerName: string;
    startAt: string;
    endAt: string;
    serviceName: string;
  };
}

export default function CancelBookingClient({
  booking,
}: CancelBookingClientProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelled, setIsCancelled] = useState(
    booking.status === "CANCELLED"
  );

  const isPast = new Date(booking.startAt) < new Date();

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: booking.cancelToken }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success("התור בוטל בהצלחה");
        setIsCancelled(true);
        setIsConfirmOpen(false);
      } else {
        toast.error(result.error || "שגיאה בביטול התור");
      }
    } catch {
      toast.error("שגיאת שרת, אנא נסו שוב מאוחר יותר");
    } finally {
      setIsLoading(false);
    }
  };

  // Already cancelled
  if (isCancelled) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-surface flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-text-muted" />
        </div>
        <h1 className="text-2xl font-bold text-text mb-3">התור בוטל</h1>
        <p className="text-text-secondary">
          התור ל{booking.serviceName} בתאריך{" "}
          {formatDateTime(booking.startAt)} בוטל בהצלחה.
        </p>
      </div>
    );
  }

  // Past booking
  if (isPast) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-error/10 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-error" />
        </div>
        <h1 className="text-2xl font-bold text-text mb-3">
          לא ניתן לבטל
        </h1>
        <p className="text-text-secondary">
          לא ניתן לבטל תור שכבר עבר.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-md mx-auto text-center py-8">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-warning/10 flex items-center justify-center">
          <CalendarX className="h-8 w-8 text-warning" />
        </div>
        <h1 className="text-2xl font-bold text-text mb-3">ביטול תור</h1>
        <p className="text-text-secondary mb-8">
          האם ברצונכם לבטל את התור הבא?
        </p>

        <Card className="text-right mb-8 space-y-3">
          <div className="flex justify-between">
            <span className="text-text-muted">שירות</span>
            <span className="font-medium text-text">{booking.serviceName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">תאריך ושעה</span>
            <span className="font-medium text-text" dir="ltr">
              {formatDateTime(booking.startAt)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">שם</span>
            <span className="font-medium text-text">
              {booking.customerName}
            </span>
          </div>
        </Card>

        <Button
          variant="danger"
          size="lg"
          fullWidth
          onClick={() => setIsConfirmOpen(true)}
        >
          ביטול התור
        </Button>
      </div>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="אישור ביטול"
        size="sm"
      >
        <div className="text-center py-4">
          <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
          <p className="text-text mb-6">
            האם אתם בטוחים שברצונכם לבטל את התור?
            <br />
            <span className="text-sm text-text-secondary">
              פעולה זו אינה ניתנת לביטול.
            </span>
          </p>
          <div className="flex gap-3">
            <Button
              variant="danger"
              fullWidth
              isLoading={isLoading}
              onClick={handleCancel}
            >
              כן, בטלו את התור
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setIsConfirmOpen(false)}
              disabled={isLoading}
            >
              חזרה
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
