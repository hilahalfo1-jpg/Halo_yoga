"use client";

import { useState } from "react";
import {
  X,
  Ban,
  Clock,
  Trash2,
  Plus,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { DAYS_OF_WEEK_HE, CATEGORY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ExceptionItem {
  id: string;
  date: string;
  type: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  category: string | null;
}

interface Rule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  category: string | null;
}

interface DayDetailPanelProps {
  date: Date;
  rules: Rule[];
  exceptions: ExceptionItem[];
  selectedCategory: string | null;
  onClose: () => void;
  onAddException: (data: {
    date: string;
    type: "BLOCKED" | "OVERRIDE";
    startTime?: string;
    endTime?: string;
    reason?: string;
    category: string | null;
  }) => Promise<void>;
  onDeleteException: (id: string) => Promise<void>;
  onUpdateRule: (dayOfWeek: number, updates: Partial<Rule>) => Promise<void>;
}

function toDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}


export default function DayDetailPanel({
  date,
  rules,
  exceptions,
  selectedCategory,
  onClose,
  onAddException,
  onDeleteException,
  onUpdateRule,
}: DayDetailPanelProps) {
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("18:00");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddRange, setShowAddRange] = useState(false);

  const dayOfWeek = date.getDay();
  const dateKey = toDateString(date);
  const dayName = DAYS_OF_WEEK_HE[dayOfWeek];

  const formattedDate = date.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Find ALL rules for this day
  const categoryRules = rules
    .filter((r) => r.dayOfWeek === dayOfWeek && r.category === selectedCategory)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const generalRules = rules
    .filter((r) => r.dayOfWeek === dayOfWeek && r.category === null)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const activeRules = (selectedCategory && categoryRules.length > 0) ? categoryRules : generalRules;

  // Find exceptions for this date
  const dayExceptions = exceptions.filter((e) => {
    const excDate = new Date(e.date);
    const excKey = toDateString(excDate);
    return excKey === dateKey;
  });

  // Determine current status
  const categoryExceptions = dayExceptions.filter(
    (e) => e.category === selectedCategory
  );
  const generalExceptions = dayExceptions.filter((e) => e.category === null);
  const relevantExceptions = categoryExceptions.length > 0 ? categoryExceptions : generalExceptions;

  // Get existing OVERRIDE ranges for this day (sorted)
  const overrideRanges = relevantExceptions
    .filter((e) => e.type === "OVERRIDE" && e.startTime && e.endTime)
    .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

  const isBlocked = relevantExceptions.some((e) => e.type === "BLOCKED");
  const hasOverrides = overrideRanges.length > 0;
  const hasActiveWeeklyRules = activeRules.some((r) => r.isActive);

  // Status display
  let statusLabel: string;
  let statusVariant: "success" | "error" | "warning" | "default";

  if (isBlocked) {
    statusLabel = "חסום";
    statusVariant = "error";
  } else if (hasOverrides) {
    statusLabel = "שעות מיוחדות";
    statusVariant = "warning";
  } else if (hasActiveWeeklyRules) {
    statusLabel = "פעיל";
    statusVariant = "success";
  } else {
    statusLabel = "יום חופש";
    statusVariant = "default";
  }

  const handleAddRange = async () => {
    if (newStart >= newEnd) {
      toast.error("שעת סיום חייבת להיות אחרי שעת התחלה");
      return;
    }

    // Check for overlapping ranges
    const hasOverlap = overrideRanges.some((e) => {
      return newStart < e.endTime! && newEnd > e.startTime!;
    });
    if (hasOverlap) {
      toast.error("טווח השעות חופף לטווח קיים");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddException({
        date: new Date(date).toISOString(),
        type: "OVERRIDE",
        startTime: newStart,
        endTime: newEnd,
        reason: reason || undefined,
        category: selectedCategory,
      });
      setReason("");
      setShowAddRange(false);
      // Smart defaults for next range — suggest after the last range
      const allRanges = [...overrideRanges, { startTime: newStart, endTime: newEnd }]
        .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
      const lastEnd = allRanges[allRanges.length - 1]?.endTime || "18:00";
      const [h, m] = lastEnd.split(":").map(Number);
      const nextHour = h + 2;
      if (nextHour < 23) {
        setNewStart(`${String(nextHour).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
        setNewEnd(`${String(Math.min(nextHour + 3, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlock = async () => {
    setIsSubmitting(true);
    try {
      await onAddException({
        date: new Date(date).toISOString(),
        type: "BLOCKED",
        reason: reason || undefined,
        category: selectedCategory,
      });
      setReason("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRule = async () => {
    const newActive = !hasActiveWeeklyRules;
    await onUpdateRule(dayOfWeek, { isActive: newActive });
  };

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface/50 border-b border-border">
        <div>
          <h3 className="font-bold text-text">{formattedDate}</h3>
          {selectedCategory && (
            <span className="text-xs text-text-muted">
              {CATEGORY_LABELS[selectedCategory]}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white text-text-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Current Status */}
        <div className="flex items-center gap-3">
          <Badge variant={statusVariant} className="text-sm">
            {statusLabel}
          </Badge>
        </div>

        {/* Default Rule Info */}
        {activeRules.length > 0 && (
          <div className="text-xs text-text-muted bg-surface/50 rounded-lg px-3 py-2">
            ברירת מחדל ליום {dayName}:{" "}
            {hasActiveWeeklyRules
              ? activeRules
                  .filter((r) => r.isActive)
                  .map((r) => `${r.startTime} - ${r.endTime}`)
                  .join(" , ")
              : "יום חופש"}
          </div>
        )}

        {/* ─── Active Time Windows ─── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text">
            חלונות זמן ליום זה:
          </p>

          {/* Show override ranges if any, otherwise show weekly rules */}
          {hasOverrides ? (
            <div className="space-y-1.5">
              {overrideRanges.map((exc) => (
                <div
                  key={exc.id}
                  className="flex items-center justify-between bg-warning/5 border border-warning/20 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-warning" />
                    <span className="text-sm font-medium" dir="ltr">
                      {exc.startTime} - {exc.endTime}
                    </span>
                    {exc.reason && (
                      <span className="text-xs text-text-muted">
                        ({exc.reason})
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onDeleteException(exc.id)}
                    className="p-1.5 rounded-md text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                    title="מחק טווח"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : isBlocked ? (
            <div className="flex items-center justify-between bg-error/5 border border-error/20 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Ban className="h-3.5 w-3.5 text-error" />
                <span className="text-sm text-error font-medium">יום חסום</span>
                {relevantExceptions.find((e) => e.type === "BLOCKED")?.reason && (
                  <span className="text-xs text-text-muted">
                    ({relevantExceptions.find((e) => e.type === "BLOCKED")?.reason})
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  const blocked = relevantExceptions.find((e) => e.type === "BLOCKED");
                  if (blocked) onDeleteException(blocked.id);
                }}
                className="p-1.5 rounded-md text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                title="הסר חסימה"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : hasActiveWeeklyRules ? (
            <div className="space-y-1.5">
              {activeRules.filter((r) => r.isActive).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 bg-success/5 border border-success/20 rounded-lg px-3 py-2"
                >
                  <Clock className="h-3.5 w-3.5 text-success" />
                  <span className="text-sm font-medium" dir="ltr">
                    {r.startTime} - {r.endTime}
                  </span>
                  <span className="text-xs text-text-muted">(ברירת מחדל)</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-text-muted bg-surface/50 rounded-lg px-3 py-2 text-center">
              אין שעות עבודה מוגדרות ליום זה
            </div>
          )}
        </div>

        {/* ─── Add Range Button / Form ─── */}
        {!isBlocked && (
          <div>
            {!showAddRange ? (
              <button
                onClick={() => setShowAddRange(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 hover:border-primary/50 transition-colors"
              >
                <Plus className="h-4 w-4" />
                הוסף טווח שעות
              </button>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); handleAddRange(); }}
                className="space-y-3 bg-surface/30 rounded-lg p-3 border border-border"
              >
                <div className="grid grid-cols-2 gap-3" dir="ltr">
                  <div>
                    <label className="text-xs text-text-muted block mb-1 text-right">
                      מ-
                    </label>
                    <input
                      type="time"
                      value={newStart}
                      onChange={(e) => setNewStart(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white text-center"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1 text-right">
                      עד-
                    </label>
                    <input
                      type="time"
                      value={newEnd}
                      onChange={(e) => setNewEnd(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white text-center"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="סיבה (אופציונלי)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5"
                    type="submit"
                    isLoading={isSubmitting}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    הוסף
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setShowAddRange(false)}
                  >
                    ביטול
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ─── Divider ─── */}
        <div className="border-t border-border" />

        {/* ─── Day Actions ─── */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-muted">פעולות:</p>

          {/* Block / Unblock Day */}
          {!isBlocked ? (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="סיבה לחסימה (אופציונלי)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                variant="outline"
                size="sm"
                type="button"
                className="w-full gap-1.5 text-error border-error/20 hover:bg-error/5"
                onClick={handleBlock}
                isLoading={isSubmitting}
              >
                <Ban className="h-4 w-4" />
                חסום יום שלם
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="w-full gap-1.5 text-success border-success/20 hover:bg-success/5"
              onClick={() => {
                const blocked = relevantExceptions.find((e) => e.type === "BLOCKED");
                if (blocked) onDeleteException(blocked.id);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              הסר חסימה ופתח את היום
            </Button>
          )}

          {/* Toggle weekly rule */}
          {!isBlocked && (
            <button
              onClick={handleToggleRule}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-right",
                "text-text-muted hover:bg-surface"
              )}
            >
              <RotateCcw className="h-4 w-4" />
              {hasActiveWeeklyRules
                ? `הפוך את כל ימי ${dayName} ליום חופש`
                : `הפעל את כל ימי ${dayName}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
