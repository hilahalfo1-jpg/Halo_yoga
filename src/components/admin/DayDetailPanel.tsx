"use client";

import { useState } from "react";
import {
  X,
  Ban,
  Clock,
  Trash2,
  RotateCcw,
} from "lucide-react";
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
  const [mode, setMode] = useState<"view" | "custom-hours">("view");
  const [customStart, setCustomStart] = useState("09:00");
  const [customEnd, setCustomEnd] = useState("18:00");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dayOfWeek = date.getDay();
  const dateKey = toDateString(date);
  const dayName = DAYS_OF_WEEK_HE[dayOfWeek];

  const formattedDate = date.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Find ALL rules for this day (not just one)
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
  const categoryException = dayExceptions.find(
    (e) => e.category === selectedCategory
  );
  const generalException = dayExceptions.find((e) => e.category === null);
  const activeException = categoryException || generalException;

  let statusLabel: string;
  let statusVariant: "success" | "error" | "warning" | "default";
  let effectiveHours: string | null = null;

  if (activeException) {
    if (activeException.type === "BLOCKED") {
      statusLabel = "חסום";
      statusVariant = "error";
    } else {
      statusLabel = "שעות מיוחדות";
      statusVariant = "warning";
      effectiveHours = `${activeException.startTime} - ${activeException.endTime}`;
    }
  } else if (activeRules.some((r) => r.isActive)) {
    statusLabel = "פעיל";
    statusVariant = "success";
    // Show all active time ranges
    const activeTimeRanges = activeRules.filter((r) => r.isActive);
    effectiveHours = activeTimeRanges
      .map((r) => `${r.startTime} - ${r.endTime}`)
      .join(" , ");
  } else {
    statusLabel = "יום חופש";
    statusVariant = "default";
  }

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

  const handleCustomHours = async () => {
    setIsSubmitting(true);
    try {
      await onAddException({
        date: new Date(date).toISOString(),
        type: "OVERRIDE",
        startTime: customStart,
        endTime: customEnd,
        reason: reason || undefined,
        category: selectedCategory,
      });
      setMode("view");
      setReason("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRule = async () => {
    const newActive = !activeRules.some((r) => r.isActive);
    // Toggle ALL rules for this day (updateRule handles multiple rules)
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
          {effectiveHours && (
            <span className="text-sm text-text-muted flex items-center gap-1" dir="ltr">
              <Clock className="h-3.5 w-3.5" />
              {effectiveHours}
            </span>
          )}
        </div>

        {/* Default Rule Info */}
        {activeRules.length > 0 && (
          <div className="text-xs text-text-muted bg-surface/50 rounded-lg px-3 py-2">
            ברירת מחדל ליום {dayName}:{" "}
            {activeRules.some((r) => r.isActive)
              ? activeRules
                  .filter((r) => r.isActive)
                  .map((r) => `${r.startTime} - ${r.endTime}`)
                  .join(" , ")
              : "יום חופש"}
          </div>
        )}

        {/* Existing Exceptions */}
        {dayExceptions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-muted">חריגות ביום זה:</p>
            {dayExceptions.map((exc) => (
              <div
                key={exc.id}
                className="flex items-center justify-between bg-surface/50 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant={exc.type === "BLOCKED" ? "error" : "warning"}
                    className="text-xs"
                  >
                    {exc.type === "BLOCKED" ? "חסום" : "מיוחד"}
                  </Badge>
                  {exc.category && (
                    <span className="text-xs text-text-muted">
                      {CATEGORY_LABELS[exc.category]}
                    </span>
                  )}
                  {exc.type === "OVERRIDE" && (
                    <span className="text-xs" dir="ltr">
                      {exc.startTime}-{exc.endTime}
                    </span>
                  )}
                  {exc.reason && (
                    <span className="text-xs text-text-muted">
                      ({exc.reason})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onDeleteException(exc.id)}
                  className="p-1 rounded text-error hover:bg-error/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Quick Actions */}
        {mode === "view" ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-muted">פעולות מהירות:</p>

            {/* Block Day */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="סיבה (אופציונלי)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-error border-error/20 hover:bg-error/5"
                  onClick={handleBlock}
                  isLoading={isSubmitting}
                >
                  <Ban className="h-4 w-4" />
                  חסום יום זה
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => setMode("custom-hours")}
                >
                  <Clock className="h-4 w-4" />
                  שעות מיוחדות
                </Button>
              </div>
            </div>

            {/* Toggle weekly rule */}
            <button
              onClick={handleToggleRule}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-right",
                "text-text-muted hover:bg-surface"
              )}
            >
              <RotateCcw className="h-4 w-4" />
              {activeRules.some((r) => r.isActive)
                ? `הפוך את כל ימי ${dayName} ליום חופש`
                : `הפעל את כל ימי ${dayName}`}
            </button>
          </div>
        ) : (
          /* Custom Hours Form */
          <div className="space-y-3">
            <p className="text-sm font-medium text-text">הגדרת שעות מיוחדות:</p>
            <div className="grid grid-cols-2 gap-3" dir="ltr">
              <div>
                <label className="text-xs text-text-muted block mb-1 text-right">
                  שעת התחלה
                </label>
                <input
                  type="time"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white text-center"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1 text-right">
                  שעת סיום
                </label>
                <input
                  type="time"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
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
                className="flex-1"
                onClick={handleCustomHours}
                isLoading={isSubmitting}
              >
                שמור
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode("view")}
              >
                ביטול
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
