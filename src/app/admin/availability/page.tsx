"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Plus,
  Trash2,
  CalendarX,
  CalendarClock,
} from "lucide-react";
import CalendarGrid, { type DayInfo, type DayStatus } from "@/components/admin/CalendarGrid";
import DayDetailPanel from "@/components/admin/DayDetailPanel";
import BulkBlockModal from "@/components/admin/BulkBlockModal";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { DAYS_OF_WEEK_HE, CATEGORY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

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

interface IcloudLinkCheck {
  url: string;
  ok: boolean;
  eventCount?: number;
  upcoming?: { start: string; end: string; allDay: boolean }[];
  error?: string;
}

interface IcloudCheckResult {
  ok: boolean;
  error?: string;
  eventCount?: number;
  links?: IcloudLinkCheck[];
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
      className="px-2 py-1.5 text-base sm:text-sm rounded-lg border border-border bg-white cursor-pointer w-[100px] text-center"
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
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [showBulkBlockModal, setShowBulkBlockModal] = useState(false);

  // iCloud calendar sync
  const [icloudUrl, setIcloudUrl] = useState("");
  // Refs (not state): read inside async handlers without stale closures
  const savedIcloudUrlRef = useRef("");
  const icloudSaveRef = useRef<Promise<boolean> | null>(null);
  const [isCheckingIcloud, setIsCheckingIcloud] = useState(false);
  const [icloudCheck, setIcloudCheck] = useState<IcloudCheckResult | null>(null);
  const [showIcloudHelp, setShowIcloudHelp] = useState(false);

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

  // Load the saved iCloud calendar URL (SiteContent settings/icloud_calendar_url)
  useEffect(() => {
    const loadIcloudUrl = async () => {
      try {
        const res = await fetch("/api/admin/site-content");
        if (!res.ok) return;
        const result = await res.json();
        const row = (result.data as { section: string; key: string; value: string }[])?.find(
          (r) => r.section === "settings" && r.key === "icloud_calendar_url"
        );
        if (row) {
          setIcloudUrl(row.value);
          savedIcloudUrlRef.current = row.value;
        }
      } catch {
        // Non-critical — the field simply starts empty
      }
    };
    loadIcloudUrl();
  }, []);

  // ─── iCloud sync actions ─────────────────────────
  const saveIcloudUrl = (): Promise<boolean> => {
    // Dedupe: blur + "בדוק חיבור" click can both trigger a save
    if (icloudSaveRef.current) return icloudSaveRef.current;
    const value = icloudUrl.trim();
    if (value === savedIcloudUrlRef.current) return Promise.resolve(true);
    const save = (async () => {
      try {
        const res = await fetch("/api/admin/site-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "settings",
            key: "icloud_calendar_url",
            value,
          }),
        });
        if (res.ok) {
          savedIcloudUrlRef.current = value;
          toast.success("הקישור נשמר");
          return true;
        }
        const result = await res.json();
        toast.error(result.error || "שגיאה בשמירת הקישור");
        return false;
      } catch {
        toast.error("שגיאת שרת");
        return false;
      } finally {
        icloudSaveRef.current = null;
      }
    })();
    icloudSaveRef.current = save;
    return save;
  };

  const checkIcloudConnection = async () => {
    setIsCheckingIcloud(true);
    setIcloudCheck(null);
    try {
      // Save first if the field was edited, so the check reads the new link
      const saved = await saveIcloudUrl();
      if (!saved) return;
      const res = await fetch("/api/admin/external-calendar?check=1");
      const result = await res.json();
      if (res.ok && result.links) {
        setIcloudCheck({
          ok: result.ok,
          eventCount: result.eventCount,
          links: result.links,
        });
      } else {
        setIcloudCheck({
          ok: false,
          error: result.error || "שגיאה בבדיקת החיבור",
        });
      }
    } catch {
      setIcloudCheck({ ok: false, error: "שגיאת שרת, אנא נסו שוב" });
    } finally {
      setIsCheckingIcloud(false);
    }
  };

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
      hideClose={isMobile}
    />
  ) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text">ניהול זמינות</h1>
          <p className="text-text-muted text-sm mt-1">
            לחצו על תאריך ביומן כדי לנהל את הזמינות שלו
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowBulkBlockModal(true)}>
          <CalendarX className="h-4 w-4" />
          חסימת ימים
        </Button>
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
          title="פרטי היום"
          size="sm"
        >
          {detailPanel}
        </Modal>
      )}

      {/* Bulk Block Modal */}
      <BulkBlockModal
        isOpen={showBulkBlockModal}
        onClose={() => setShowBulkBlockModal(false)}
        onSuccess={fetchData}
      />

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
                      className="flex items-center gap-1 min-h-[40px] px-2 text-xs text-secondary hover:text-secondary-dark transition-colors"
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
                            className="p-2.5 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors ms-auto"
                            title="מחק טווח"
                          >
                            <Trash2 className="h-5 w-5" />
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

      {/* iCloud Calendar Sync */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <CalendarClock className="h-5 w-5 text-text-muted" />
          <h2 className="font-medium text-text text-sm">סנכרון יומן iCloud</h2>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-text-muted">
            הדביקו כאן קישור ציבורי ליומן ה-iCloud שלכם — זמנים שתפוסים ביומן
            ייחסמו אוטומטית להזמנות באתר. שינויים ביומן נקלטים באתר תוך עד 5
            דקות.
          </p>

          <textarea
            dir="ltr"
            rows={3}
            placeholder="webcal://p12-caldav.icloud.com/published/..."
            value={icloudUrl}
            onChange={(e) => setIcloudUrl(e.target.value)}
            onBlur={() => saveIcloudUrl()}
            className="w-full min-h-[44px] px-3 py-2.5 text-base rounded-lg border border-border bg-white text-left focus:outline-none focus:ring-2 focus:ring-secondary resize-y"
          />

          <p className="text-xs text-text-muted">
            אפשר לחבר כמה יומנים — קישור אחד בכל שורה (עד 10)
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={checkIcloudConnection}
              isLoading={isCheckingIcloud}
              className="min-h-[40px]"
            >
              בדוק חיבור
            </Button>
            <button
              onClick={() => setShowIcloudHelp(!showIcloudHelp)}
              className="flex items-center gap-1 min-h-[40px] px-2 text-xs text-secondary hover:text-secondary-dark transition-colors"
            >
              איך משיגים את הקישור?
              {showIcloudHelp ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {showIcloudHelp && (
            <div className="rounded-lg bg-surface p-3 text-xs text-text-secondary space-y-1.5">
              <p className="font-medium text-text">שיתוף היומן מהאייפון:</p>
              <ol className="list-decimal pr-4 space-y-1">
                <li>פתחו הגדרות ← יומן באייפון</li>
                <li>בחרו את היומן הרצוי</li>
                <li>הפעילו &quot;שיתוף יומן ציבורי&quot;</li>
                <li>
                  לחצו &quot;שיתוף קישור&quot; והעתיקו את הקישור (מתחיל
                  ב-webcal://)
                </li>
                <li>הדביקו את הקישור כאן ולחצו &quot;בדוק חיבור&quot;</li>
              </ol>
              <p>
                יש כמה יומנים? חזרו על השלבים לכל יומן והדביקו כל קישור בשורה
                נפרדת (עד 10 יומנים).
              </p>
              <p className="text-text-muted">
                שימו לב: שינויים שתעשו ביומן עשויים להופיע באתר רק לאחר עד 5
                דקות.
              </p>
            </div>
          )}

          {icloudCheck &&
            (icloudCheck.links ? (
              <div
                className={cn(
                  "rounded-lg border p-3 space-y-3",
                  icloudCheck.ok
                    ? "bg-success/10 border-success/30"
                    : "bg-error/10 border-error/30"
                )}
              >
                <p className="text-sm font-medium text-text">
                  {icloudCheck.ok
                    ? `החיבור תקין — נמצאו ${icloudCheck.eventCount ?? 0} אירועים ב-60 הימים הקרובים`
                    : "חלק מהיומנים לא נקראו — בדקו את הקישורים המסומנים"}
                </p>
                <ul className="space-y-2">
                  {icloudCheck.links.map((link, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span
                        className={cn(
                          "font-bold shrink-0",
                          link.ok ? "text-success" : "text-error"
                        )}
                        aria-hidden
                      >
                        {link.ok ? "✔" : "✖"}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p
                          className="text-text-muted break-all text-left"
                          dir="ltr"
                        >
                          {link.url}
                        </p>
                        {link.ok ? (
                          <p className="text-text-secondary">
                            נמצאו {link.eventCount ?? 0} אירועים
                          </p>
                        ) : (
                          <p className="text-error">{link.error}</p>
                        )}
                        {link.ok &&
                          link.upcoming &&
                          link.upcoming.length > 0 && (
                            <ul className="space-y-0.5">
                              {link.upcoming.map((ev, j) => (
                                <li key={j} className="text-text-secondary">
                                  {ev.allDay ? (
                                    <>
                                      יום שלם: <span dir="ltr">{ev.start}</span>
                                      {ev.end !== ev.start && (
                                        <>
                                          {" "}
                                          עד <span dir="ltr">{ev.end}</span>
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <span dir="ltr">{ev.start}</span> עד{" "}
                                      <span dir="ltr">{ev.end}</span>
                                    </>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-lg bg-error/10 border border-error/30 p-3">
                <p className="text-sm text-error">{icloudCheck.error}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
