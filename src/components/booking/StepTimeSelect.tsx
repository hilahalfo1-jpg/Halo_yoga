"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import type { TimeSlot } from "@/types";

interface StepTimeSelectProps {
  serviceId: string;
  date: Date;
  selected: TimeSlot | null;
  onSelect: (slot: TimeSlot) => void;
  onBack: () => void;
}

export default function StepTimeSelect({
  serviceId,
  date,
  selected,
  onSelect,
  onBack,
}: StepTimeSelectProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSlots() {
      setIsLoading(true);
      try {
        const dateStr = date.toISOString().split("T")[0];
        const res = await fetch(
          `/api/bookings?date=${dateStr}&serviceId=${serviceId}`
        );
        const result = await res.json();
        setSlots(result.data || []);
      } catch {
        setSlots([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSlots();
  }, [date, serviceId]);

  const availableSlots = slots.filter((s) => s.isAvailable);
  const dateDisplay = date.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (isLoading) {
    return (
      <div className="py-12">
        <Spinner label="טוען זמנים פנויים..." />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-text mb-2">בחרו שעה</h2>
      <p className="text-text-secondary mb-6">{dateDisplay}</p>

      {availableSlots.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-12 w-12" />}
          title="אין זמנים פנויים"
          description="לא נמצאו זמנים פנויים בתאריך זה. נסו תאריך אחר."
          action={
            <Button variant="outline" onClick={onBack}>
              בחרו תאריך אחר
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
            {slots.map((slot) => (
              <button
                key={slot.startTime}
                onClick={() => slot.isAvailable && onSelect(slot)}
                disabled={!slot.isAvailable}
                className={cn(
                  "py-3 px-2 rounded-lg text-sm font-medium transition-all border",
                  selected?.startTime === slot.startTime
                    ? "bg-primary text-white border-primary"
                    : slot.isAvailable
                      ? "bg-white text-text border-border hover:border-primary hover:text-primary"
                      : "bg-surface text-text-muted/40 border-transparent cursor-not-allowed line-through"
                )}
                dir="ltr"
              >
                {slot.startTime}
              </button>
            ))}
          </div>

          <div className="flex justify-center mt-8">
            <Button variant="ghost" onClick={onBack}>
              חזרה
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
