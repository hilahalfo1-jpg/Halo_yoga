"use client";

import { ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAYS_OF_WEEK_HE } from "@/lib/constants";

export type DayStatus = "available" | "blocked" | "override" | "dayoff";

export interface DayInfo {
  date: Date;
  status: DayStatus;
  effectiveStart?: string;
  effectiveEnd?: string;
  hasException: boolean;
}

interface CalendarGridProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  dayInfoMap: Map<string, DayInfo>;
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarGrid({
  currentMonth,
  onMonthChange,
  selectedDate,
  onDateSelect,
  dayInfoMap,
}: CalendarGridProps) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthName = new Date(year, month).toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Previous month trailing days
  const prevMonthDays = new Date(year, month, 0).getDate();

  const prevMonth = () => onMonthChange(new Date(year, month - 1, 1));
  const nextMonth = () => onMonthChange(new Date(year, month + 1, 1));
  const goToToday = () => onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1));

  const statusColors: Record<DayStatus, string> = {
    available: "bg-success/15",
    blocked: "bg-error/15",
    override: "bg-warning/15",
    dayoff: "",
  };

  const dotColors: Record<DayStatus, string> = {
    available: "bg-success",
    blocked: "bg-error",
    override: "bg-warning",
    dayoff: "bg-gray-300",
  };

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface/50 border-b border-border">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-white transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-text-muted" />
        </button>

        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-text">{monthName}</h3>
          <button
            onClick={goToToday}
            className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            היום
          </button>
        </div>

        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-white transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-text-muted" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS_OF_WEEK_HE.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-text-muted py-2"
          >
            {day.slice(0, 2)}׳
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {/* Previous month days */}
        {Array.from({ length: firstDayOfMonth }, (_, i) => {
          const day = prevMonthDays - firstDayOfMonth + 1 + i;
          return (
            <div
              key={`prev-${i}`}
              className="aspect-square flex items-center justify-center text-sm text-text-muted/30 border-b border-r border-border/30"
            >
              {day}
            </div>
          );
        })}

        {/* Current month days */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const date = new Date(year, month, day);
          const key = toKey(date);
          const info = dayInfoMap.get(key);
          const status = info?.status ?? "dayoff";
          const isToday = date.toDateString() === today.toDateString();
          const isSelected = selectedDate?.toDateString() === date.toDateString();

          return (
            <button
              key={day}
              onClick={() => onDateSelect(date)}
              className={cn(
                "relative aspect-square flex flex-col items-center justify-center text-sm transition-all border-b border-r border-border/30",
                isSelected
                  ? "bg-secondary text-white ring-2 ring-secondary ring-inset"
                  : statusColors[status],
                !isSelected && "hover:bg-surface"
              )}
            >
              <span
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-full text-sm",
                  isToday && !isSelected && "bg-secondary text-white font-bold",
                  isSelected && "font-bold",
                  !isToday && !isSelected && status === "dayoff" && "text-text-muted/50",
                  !isToday && !isSelected && status !== "dayoff" && "text-text"
                )}
              >
                {day}
              </span>

              {/* Status dot */}
              {!isSelected && status !== "dayoff" && (
                <span
                  className={cn(
                    "absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                    dotColors[status]
                  )}
                />
              )}

              {/* Exception indicator */}
              {info?.hasException && !isSelected && (
                <span className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-warning" />
              )}

              {/* Time hint */}
              {info?.effectiveStart && !isSelected && (
                <span className="absolute bottom-0 text-[9px] text-text-muted/60 leading-none hidden sm:block">
                  {info.effectiveStart}
                </span>
              )}
            </button>
          );
        })}

        {/* Next month days to fill the grid */}
        {(() => {
          const totalCells = firstDayOfMonth + daysInMonth;
          const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
          return Array.from({ length: remaining }, (_, i) => (
            <div
              key={`next-${i}`}
              className="aspect-square flex items-center justify-center text-sm text-text-muted/30 border-b border-r border-border/30"
            >
              {i + 1}
            </div>
          ));
        })()}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-border text-xs text-text-muted">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-success" />
          פעיל
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-error" />
          חסום
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-warning" />
          שעות מיוחדות
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          יום חופש
        </div>
      </div>
    </div>
  );
}
