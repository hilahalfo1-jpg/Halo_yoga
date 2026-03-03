"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
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
  { value: "REHABILITATION", label: "שיקום" },
];

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

    // Cover the full calendar view (include edge days)
    const start = new Date(year, month, -6);
    const end = new Date(year, month + 1, 7);

    const d = new Date(start);
    while (d <= end) {
      const key = toKey(d);
      const dow = d.getDay();

      // Find applicable rule
      const catRule = selectedCategory
        ? rules.find((r) => r.dayOfWeek === dow && r.category === selectedCategory)
        : null;
      const genRule = rules.find(
        (r) => r.dayOfWeek === dow && r.category === null
      );
      const rule = catRule || genRule;

      // Find exceptions for this date
      const dayExceptions = exceptions.filter((e) => {
        const excDate = new Date(e.date);
        return toKey(excDate) === key;
      });

      const catException = dayExceptions.find(
        (e) => e.category === selectedCategory
      );
      const genException = dayExceptions.find((e) => e.category === null);
      const exception = catException || genException;

      let status: DayStatus;
      let effectiveStart: string | undefined;
      let effectiveEnd: string | undefined;

      if (exception) {
        if (exception.type === "BLOCKED") {
          status = "blocked";
        } else {
          status = "override";
          effectiveStart = exception.startTime || undefined;
          effectiveEnd = exception.endTime || undefined;
        }
      } else if (rule && rule.isActive) {
        status = "available";
        effectiveStart = rule.startTime;
        effectiveEnd = rule.endTime;
      } else {
        status = "dayoff";
      }

      map.set(key, {
        date: new Date(d),
        status,
        effectiveStart,
        effectiveEnd,
        hasException: dayExceptions.length > 0,
      });

      d.setDate(d.getDate() + 1);
    }

    return map;
  }, [currentMonth, rules, exceptions, selectedCategory]);

  // ─── Actions ─────────────────────────
  const updateRule = async (dayOfWeek: number, updates: Partial<Rule>) => {
    const catRules = rules.filter((r) =>
      selectedCategory === null
        ? r.category === null
        : r.category === selectedCategory
    );
    const existing = catRules.find((r) => r.dayOfWeek === dayOfWeek);
    const data = {
      dayOfWeek,
      startTime: updates.startTime ?? existing?.startTime ?? "09:00",
      endTime: updates.endTime ?? existing?.endTime ?? "18:00",
      isActive: updates.isActive ?? existing?.isActive ?? true,
      category: selectedCategory,
    };

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
          data: {
            ...excData,
            category: excData.category,
          },
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
        {/* Calendar */}
        <div className="flex-1">
          <CalendarGrid
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            dayInfoMap={dayInfoMap}
          />
        </div>

        {/* Desktop Detail Panel */}
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
          <div className="border-t border-border p-4 space-y-2">
            <p className="text-xs text-text-muted mb-3">
              {selectedCategory
                ? `שעות קבועות עבור ${CATEGORY_LABELS[selectedCategory]}. גוברות על הכללי.`
                : "שעות קבועות לכל ימות השבוע — חלות על כל סוגי השירותים."}
            </p>
            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
              const catRules = rules.filter((r) =>
                selectedCategory === null
                  ? r.category === null
                  : r.category === selectedCategory
              );
              const rule = catRules.find((r) => r.dayOfWeek === day);
              const isActive = rule?.isActive ?? false;

              const globalRule = selectedCategory
                ? rules.find(
                    (r) => r.dayOfWeek === day && r.category === null
                  )
                : null;

              return (
                <div
                  key={day}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border",
                    isActive
                      ? "border-border bg-white"
                      : "border-transparent bg-surface/50"
                  )}
                >
                  <span className="w-16 font-medium text-text text-sm">
                    {DAYS_OF_WEEK_HE[day]}
                  </span>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) =>
                        updateRule(day, { isActive: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-border text-secondary focus:ring-secondary"
                    />
                    <span className="text-sm text-text-secondary">
                      {isActive ? "פעיל" : "חופש"}
                    </span>
                  </label>

                  {isActive && (
                    <div className="flex items-center gap-2 mr-auto">
                      <input
                        type="time"
                        value={rule?.startTime ?? "09:00"}
                        onChange={(e) =>
                          updateRule(day, { startTime: e.target.value })
                        }
                        className="px-2 py-1 text-sm rounded border border-border bg-white"
                        dir="ltr"
                      />
                      <span className="text-text-muted">—</span>
                      <input
                        type="time"
                        value={rule?.endTime ?? "18:00"}
                        onChange={(e) =>
                          updateRule(day, { endTime: e.target.value })
                        }
                        className="px-2 py-1 text-sm rounded border border-border bg-white"
                        dir="ltr"
                      />
                    </div>
                  )}

                  {selectedCategory && !rule && globalRule?.isActive && (
                    <span className="text-xs text-text-muted">
                      (כללי: {globalRule.startTime}-{globalRule.endTime})
                    </span>
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
