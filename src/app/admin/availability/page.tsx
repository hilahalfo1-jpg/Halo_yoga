"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Clock, Plus, Trash2 } from "lucide-react";
import CalendarGrid, { type DayInfo, type DayStatus } from "@/components/admin/CalendarGrid";
import DayDetailPanel from "@/components/admin/DayDetailPanel";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { DAYS_OF_WEEK_HE, CATEGORY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Rule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  category: string | null;
}

interface ExceptionItem {
  id: string;
  date: string;
  type: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  category: string | null;
}

const CATEGORY_TABS = [
  { value: null, label: "כללי" },
  { value: "MASSAGE", label: "עיסויים" },
  { value: "YOGA", label: "יוגה" },
  { value: "PILATES", label: "פילאטיס" },
];

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Inline time input that saves on blur only
function TimeInput({
  value,
  onSave,
}: {
  value: string;
  onSave: (val: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <input
      ref={ref}
      type="time"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local && local !== value) {
          onSave(local);
        }
      }}
      className="px-2 py-1.5 text-sm rounded-lg border border-border bg-white cursor-pointer w-[100px] text-center"
      dir="ltr"
    />
  );
}

export default function AvailabilityPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showWeeklyRules, setShowWeeklyRules] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/availability");
      const result = await res.json();
      setRules(result.data.rules);
      setExceptions(result.data.exceptions);
    } catch {
      toast.error("שגיאה בטעינת נתונים");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute day status map for the calendar
  const dayInfoMap = useMemo(() => {
    const map = new Map<string, DayInfo>();
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const start = new Date(year, month, -6);
    const end = new Date(year, month + 1, 7);

    const d = new Date(start);
    while (d <= end) {
      const key = toKey(d);
      const dow = d.getDay();

      // Find ALL applicable rules for this day
      const catRules = selectedCategory
        ? rules.filter((r) => r.dayOfWeek === dow && r.category === selectedCategory && r.isActive)
        : [];
      const genRules = rules.filter(
        (r) => r.dayOfWeek === dow && r.category === null && r.isActive
      );
      const activeRules = catRules.length > 0 ? catRules : genRules;

      // Find exceptions for this date
      const dayExceptions = exceptions.filter((e) => {
        const excDate = new Date(e.date);
        return toKey(excDate) === key;
      });

      const catExceptions = dayExceptions.filter(
        (e) => e.category === selectedCategory
      );
      const genExceptions = dayExceptions.filter((e) => e.category === null);
      const relevantExceptions = catExceptions.length > 0 ? catExceptions : genExceptions;

      let status: DayStatus;
      let effectiveStart: string | undefined;
      let effectiveEnd: string | undefined;

      if (relevantExceptions.length > 0) {
        if (relevantExceptions.some((e) => e.type === "BLOCKED")) {
          status = "blocked";
        } else {
          status = "override";
          // Collect all OVERRIDE ranges
          const overrides = relevantExceptions
            .filter((e) => e.type === "OVERRIDE" && e.startTime && e.endTime)
            .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
          if (overrides.length > 0) {
            effectiveStart = overrides[0].startTime || undefined;
            effectiveEnd = overrides[overrides.length - 1].endTime || undefined;
          }
        }
      } else if (activeRules.length > 0) {
        status = "available";
        // Show earliest start and latest end
        const sorted = [...activeRules].sort((a, b) => a.startTime.localeCompare(b.startTime));
        effectiveStart = sorted[0].startTime;
        effectiveEnd = sorted[sorted.length - 1].endTime;
      } else {
        status = "dayoff";
      }

      // Build ranges summary for multi-range days
      let rangesSummary: string | undefined;
      if (status === "override" && relevantExceptions.length > 1) {
        const overrides = relevantExceptions
          .filter((e) => e.type === "OVERRIDE" && e.startTime && e.endTime)
          .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
        if (overrides.length > 1) {
          rangesSummary = overrides
            .map((e) => `${(e.startTime || "").slice(0, 5)}-${(e.endTime || "").slice(0, 5)}`)
            .join(", ");
        }
      } else if (status === "available" && activeRules.length > 1) {
        const sorted = [...activeRules].sort((a, b) => a.startTime.localeCompare(b.startTime));
        rangesSummary = sorted
          .map((r) => `${r.startTime.slice(0, 5)}-${r.endTime.slice(0, 5)}`)
          .join(", ");
      }

      map.set(key, {
        date: new Date(d),
        status,
        effectiveStart,
        effectiveEnd,
        rangesSummary,
        hasException: dayExceptions.length > 0,
      });

      d.setDate(d.getDate() + 1);
    }

    return map;
  }, [currentMonth, rules, exceptions, selectedCategory]);

  // ─── Actions ─────────────────────────
  const saveRule = async (data: {
    id?: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
    category: string | null;
  }) => {
    try {
      const res = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "rule", data }),
      });
      if (res.ok) {
        toast.success("עודכן בהצלחה");
        fetchData();
      } else {
        const result = await res.json();
        toast.error(result.error || "שגיאה");
      }
    } catch {
      toast.error("שגיאת שרת");
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/availability/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("נמחק בהצלחה");
        fetchData();
      }
    } catch {
      toast.error("שגיאת שרת");
    }
  };

  // Legacy updateRule for DayDetailPanel compatibility
  const updateRule = async (dayOfWeek: number, updates: Partial<Rule>) => {
    const dayRules = rules.filter((r) =>
      r.dayOfWeek === dayOfWeek &&
      (selectedCategory === null ? r.category === null : r.category === selectedCategory)
    );

    if (dayRules.length === 0) {
      // No rules exist yet — create one
      await saveRule({
        dayOfWeek,
        startTime: updates.startTime ?? "09:00",
        endTime: updates.endTime ?? "18:00",
        isActive: updates.isActive ?? true,
        category: selectedCategory,
      });
    } else if (updates.isActive !== undefined) {
      // Toggle active state on ALL rules for this day
      for (const rule of dayRules) {
        await saveRule({
          id: rule.id,
          dayOfWeek,
          startTime: rule.startTime,
          endTime: rule.endTime,
          isActive: updates.isActive,
          category: selectedCategory,
        });
      }
    } else {
      // Update the first rule with the provided changes
      const existing = dayRules[0];
      await saveRule({
        id: existing.id,
        dayOfWeek,
        startTime: updates.startTime ?? existing.startTime,
        endTime: updates.endTime ?? existing.endTime,
        isActive: updates.isActive ?? existing.isActive,
        category: selectedCategory,
      });
    }
  };

  const addException = async (excData: {
    date: string;
    type: "BLOCKED" | "OVERRIDE";
    startTime?: string;
    endTime?: string;
    reason?: string;
    category: string | null;
  }) => {
    try {
      const res = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "exception",
          data: { ...excData, category: excData.category },
        }),
      });
      if (res.ok) {
        toast.success("נשמר בהצלחה");
        fetchData();
      } else {
        const result = await res.json();
        toast.error(result.error || "שגיאה");
      }
    } catch {
      toast.error("שגיאת שרת");
    }
  };

  const deleteException = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/availability/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("נמחק בהצלחה");
        fetchData();
      }
    } catch {
      toast.error("שגיאת שרת");
    }
  };

  // ─── Render ─────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner label="טוען זמינות..." />
      </div>
    );
  }

  const detailPanel = selectedDate ? (
    <DayDetailPanel
      date={selectedDate}
      rules={rules}
      exceptions={exceptions}
      selectedCategory={selectedCategory}
      onClose={() => setSelectedDate(null)}
      onAddException={addException}
      onDeleteException={deleteException}
      onUpdateRule={updateRule}
    />
  ) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">ניהול זמינות</h1>
        <p className="text-text-muted text-sm mt-1">
          לחצו על תאריך ביומן כדי לנהל את הזמינות שלו
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-surface rounded-lg">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value ?? "general"}
            onClick={() => setSelectedCategory(tab.value)}
            className={cn(
              "px-4 py-2 text-sm rounded-md transition-colors",
              selectedCategory === tab.value
                ? "bg-white text-text font-medium shadow-sm"
                : "text-text-muted hover:text-text"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Calendar + Detail Panel */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <CalendarGrid
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            dayInfoMap={dayInfoMap}
          />
        </div>

        <div className="hidden lg:block lg:w-[380px] flex-shrink-0">
          {detailPanel || (
            <div className="bg-white rounded-xl border border-border p-8 text-center text-text-muted">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">בחרו תאריך מהיומן</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Detail Modal */}
      {isMobile && (
        <Modal
          isOpen={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          title=""
          size="sm"
        >
          {detailPanel}
        </Modal>
      )}

      {/* Collapsible Weekly Defaults */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setShowWeeklyRules(!showWeeklyRules)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-text-muted" />
            <span className="font-medium text-text text-sm">
              הגדרות ברירת מחדל שבועיות
            </span>
            {selectedCategory && (
              <span className="text-xs text-text-muted">
                ({CATEGORY_LABELS[selectedCategory]})
              </span>
            )}
          </div>
          {showWeeklyRules ? (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
        </button>

        {showWeeklyRules && (
          <div className="border-t border-border p-4 space-y-3">
            <p className="text-xs text-text-muted mb-3">
              {selectedCategory
                ? `שעות קבועות עבור ${CATEGORY_LABELS[selectedCategory]}. גוברות על הכללי.`
                : "שעות קבועות לכל ימות השבוע — חלות על כל סוגי השירותים. ניתן להוסיף כמה טווחי שעות ליום."}
            </p>
            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
              // Get ALL rules for this day + category
              const dayRules = rules
                .filter((r) =>
                  selectedCategory === null
                    ? r.category === null && r.dayOfWeek === day
                    : r.category === selectedCategory && r.dayOfWeek === day
                )
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              const hasActiveSlots = dayRules.some((r) => r.isActive);

              const globalRules = selectedCategory
                ? rules.filter(
                    (r) => r.dayOfWeek === day && r.category === null && r.isActive
                  )
                : [];

              return (
                <div
                  key={day}
                  className={cn(
                    "p-3 rounded-lg border",
                    hasActiveSlots
                      ? "border-border bg-white"
                      : "border-transparent bg-surface/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-text text-sm">
                      {DAYS_OF_WEEK_HE[day]}
                    </span>
                    <button
                      onClick={() =>
                        saveRule({
                          dayOfWeek: day,
                          startTime: "09:00",
                          endTime: "18:00",
                          isActive: true,
                          category: selectedCategory,
                        })
                      }
                      className="flex items-center gap-1 text-xs text-secondary hover:text-secondary-dark transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      הוסף טווח
                    </button>
                  </div>

                  {dayRules.length === 0 ? (
                    <div className="text-xs text-text-muted">
                      {selectedCategory && globalRules.length > 0 ? (
                        <span>
                          כללי:{" "}
                          {globalRules
                            .map((r) => `${r.startTime}-${r.endTime}`)
                            .join(", ")}
                        </span>
                      ) : (
                        "יום חופש — לחצו \'הוסף טווח\' להגדרת שעות"
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayRules.map((rule) => (
                        <div
                          key={rule.id}
                          className={cn(
                            "flex items-center gap-2 flex-wrap",
                            !rule.isActive && "opacity-50"
                          )}
                        >
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rule.isActive}
                              onChange={(e) =>
                                saveRule({
                                  id: rule.id,
                                  dayOfWeek: day,
                                  startTime: rule.startTime,
                                  endTime: rule.endTime,
                                  isActive: e.target.checked,
                                  category: selectedCategory,
                                })
                              }
                              className="w-4 h-4 rounded border-border text-secondary focus:ring-secondary"
                            />
                            <span className="text-xs text-text-secondary">
                              {rule.isActive ? "פעיל" : "מושבת"}
                            </span>
                          </label>

                          <div className="flex items-center gap-1.5" dir="ltr">
                            <TimeInput
                              value={rule.startTime}
                              onSave={(v) =>
                                saveRule({
                                  id: rule.id,
                                  dayOfWeek: day,
                                  startTime: v,
                                  endTime: rule.endTime,
                                  isActive: rule.isActive,
                                  category: selectedCategory,
                                })
                              }
                            />
                            <span className="text-text-muted text-sm">—</span>
                            <TimeInput
                              value={rule.endTime}
                              onSave={(v) =>
                                saveRule({
                                  id: rule.id,
                                  dayOfWeek: day,
                                  startTime: rule.startTime,
                                  endTime: v,
                                  isActive: rule.isActive,
                                  category: selectedCategory,
                                })
                              }
                            />
                          </div>

                          <button
                            onClick={() => deleteRule(rule.id)}
                            className="p-1 rounded text-text-muted hover:text-error hover:bg-error/10 transition-colors ms-auto"
                            title="מחק טווח"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
