"use client";

import { useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { DAYS_OF_WEEK_HE } from "@/lib/constants";

interface StepDateSelectProps {
  serviceId: string;
  selected: Date | null;
  onSelect: (date: Date) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepDateSelect({
  selected,
  onSelect,
  onNext,
  onBack,
}: StepDateSelectProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Get first day of month and days in month
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = new Date(year, month).toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const isPastDate = (day: number) => {
    const date = new Date(year, month, day);
    return date < today;
  };

  // Check if day has potential availability (Sun-Thu = 0-4)
  const hasPotentialSlots = (day: number) => {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek >= 0 && dayOfWeek <= 4; // Sun-Thu
  };

  const canGoPrev =
    currentMonth.getFullYear() > today.getFullYear() ||
    (currentMonth.getFullYear() === today.getFullYear() &&
      currentMonth.getMonth() > today.getMonth());

  return (
    <div>
      <h2 className="text-2xl font-bold text-text mb-2">בחרו תאריך</h2>
      <p className="text-text-secondary mb-6">בחרו יום פנוי מהלוח</p>

      <div className="bg-white rounded-xl border border-border p-6 max-w-md mx-auto">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={prevMonth}
            disabled={!canGoPrev}
            className="p-2 rounded-lg hover:bg-surface transition-colors disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <h3 className="text-lg font-semibold text-text">{monthName}</h3>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-surface transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS_OF_WEEK_HE.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-text-muted py-2"
            >
              {day.slice(0, 2)}׳
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month start */}
          {Array.from({ length: firstDayOfMonth }, (_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const date = new Date(year, month, day);
            const isSelected =
              selected?.toDateString() === date.toDateString();
            const isPast = isPastDate(day);
            const hasSlots = hasPotentialSlots(day);
            const isToday = date.toDateString() === today.toDateString();
            const isDisabled = isPast || !hasSlots;

            return (
              <button
                key={day}
                onClick={() => !isDisabled && onSelect(date)}
                disabled={isDisabled}
                className={cn(
                  "relative aspect-square flex items-center justify-center rounded-lg text-sm transition-all",
                  isSelected
                    ? "bg-primary text-white font-semibold"
                    : isDisabled
                      ? "text-text-muted/40 cursor-not-allowed"
                      : "text-text hover:bg-primary/10",
                  isToday && !isSelected && "font-bold",
                )}
              >
                {day}
                {/* Availability dot */}
                {hasSlots && !isPast && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-success" />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-xs text-text-muted">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success" />
            יש זמנים פנויים
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-200" />
            יום סגור
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 mt-6">
        <Button variant="ghost" onClick={onBack}>
          חזרה
        </Button>
        <Button size="lg" onClick={onNext} disabled={!selected}>
          המשך
        </Button>
      </div>
    </div>
  );
}
