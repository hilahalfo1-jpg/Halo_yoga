"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Clock, CalendarOff, CalendarCog } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
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
  { value: null, label: "כללי (הכל)" },
  { value: "MASSAGE", label: "עיסויים" },
  { value: "YOGA", label: "יוגה" },
  { value: "REHABILITATION", label: "שיקום" },
];

const CATEGORY_FILTER_OPTIONS = [
  { value: "ALL", label: "כל הקטגוריות" },
  { value: "GENERAL", label: "כללי" },
  { value: "MASSAGE", label: "עיסויים" },
  { value: "YOGA", label: "יוגה" },
  { value: "REHABILITATION", label: "שיקום" },
];

export default function AvailabilityPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Exception form
  const [excForm, setExcForm] = useState({
    date: "",
    type: "BLOCKED" as "BLOCKED" | "OVERRIDE",
    startTime: "",
    endTime: "",
    reason: "",
    category: "ALL",
  });

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

  // Get rules for the selected category
  const filteredRules = rules.filter((r) =>
    selectedCategory === null ? r.category === null : r.category === selectedCategory
  );

  const updateRule = async (dayOfWeek: number, updates: Partial<Rule>) => {
    const existing = filteredRules.find((r) => r.dayOfWeek === dayOfWeek);
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
        toast.success("הזמינות עודכנה");
        fetchData();
      } else {
        const result = await res.json();
        toast.error(result.error || "שגיאה");
      }
    } catch {
      toast.error("שגיאת שרת");
    }
  };

  const addException = async () => {
    try {
      const res = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "exception",
          data: {
            date: new Date(excForm.date).toISOString(),
            type: excForm.type,
            startTime: excForm.type === "OVERRIDE" ? excForm.startTime : undefined,
            endTime: excForm.type === "OVERRIDE" ? excForm.endTime : undefined,
            reason: excForm.reason || undefined,
            category: excForm.category === "ALL" ? null : excForm.category,
          },
        }),
      });

      if (res.ok) {
        toast.success("החריגה נוספה");
        setIsExceptionModalOpen(false);
        setExcForm({ date: "", type: "BLOCKED", startTime: "", endTime: "", reason: "", category: "ALL" });
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
        toast.success("החריגה נמחקה");
        fetchData();
      }
    } catch {
      toast.error("שגיאת שרת");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner label="טוען זמינות..." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-text">ניהול זמינות</h1>

      {/* Weekly Rules */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-text-muted" />
          <h2 className="text-lg font-semibold text-text">שעות פעילות שבועיות</h2>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 p-1 bg-surface rounded-lg">
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

        <p className="text-xs text-text-muted mb-4">
          {selectedCategory
            ? `שעות פעילות עבור ${CATEGORY_LABELS[selectedCategory]}. כללים אלו עוברים על הכללים הכלליים.`
            : "שעות פעילות כלליות — חלות על כל סוגי השירותים אלא אם קיימים כללים ספציפיים לקטגוריה."}
        </p>

        <div className="space-y-3">
          {[0, 1, 2, 3, 4, 5, 6].map((day) => {
            const rule = filteredRules.find((r) => r.dayOfWeek === day);
            const isActive = rule?.isActive ?? false;

            // Check if there's a global fallback when viewing category-specific
            const globalRule = selectedCategory
              ? rules.find((r) => r.dayOfWeek === day && r.category === null)
              : null;

            return (
              <div
                key={day}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border",
                  isActive ? "border-border bg-white" : "border-transparent bg-surface/50"
                )}
              >
                <div className="w-20 flex-shrink-0">
                  <span className="font-medium text-text text-sm">
                    {DAYS_OF_WEEK_HE[day]}
                  </span>
                </div>

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
                    {isActive ? "פעיל" : "יום חופש"}
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

                {/* Show fallback indicator */}
                {selectedCategory && !rule && globalRule?.isActive && (
                  <span className="text-xs text-text-muted">
                    (ירש מכללי: {globalRule.startTime}-{globalRule.endTime})
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Exceptions */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5 text-text-muted" />
            <h2 className="text-lg font-semibold text-text">חריגות</h2>
          </div>
          <Button
            size="sm"
            onClick={() => setIsExceptionModalOpen(true)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            הוסף חריגה
          </Button>
        </div>

        {exceptions.length === 0 ? (
          <EmptyState
            icon={<CalendarCog className="h-10 w-10" />}
            title="אין חריגות"
            description="הוסיפו ימי חופש או שעות מיוחדות לתאריכים ספציפיים"
          />
        ) : (
          <div className="space-y-2">
            {exceptions.map((exc) => (
              <div
                key={exc.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <Badge variant={exc.type === "BLOCKED" ? "error" : "warning"}>
                    {exc.type === "BLOCKED" ? "חסימה" : "שעות מיוחדות"}
                  </Badge>
                  {exc.category && (
                    <Badge className="bg-surface text-text-secondary border-border">
                      {CATEGORY_LABELS[exc.category] || exc.category}
                    </Badge>
                  )}
                  <div>
                    <p className="text-sm font-medium text-text" dir="ltr">
                      {new Date(exc.date).toLocaleDateString("he-IL")}
                    </p>
                    {exc.type === "OVERRIDE" && exc.startTime && (
                      <p className="text-xs text-text-muted" dir="ltr">
                        {exc.startTime} - {exc.endTime}
                      </p>
                    )}
                    {exc.reason && (
                      <p className="text-xs text-text-muted">{exc.reason}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteException(exc.id)}
                  className="p-2 rounded text-error hover:bg-error/5 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Exception Modal */}
      <Modal
        isOpen={isExceptionModalOpen}
        onClose={() => setIsExceptionModalOpen(false)}
        title="הוספת חריגה"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="תאריך *"
            type="date"
            value={excForm.date}
            onChange={(e) => setExcForm((p) => ({ ...p, date: e.target.value }))}
          />
          <Select
            label="קטגוריה"
            value={excForm.category}
            onChange={(e) =>
              setExcForm((p) => ({ ...p, category: e.target.value }))
            }
            options={CATEGORY_FILTER_OPTIONS}
          />
          <Select
            label="סוג *"
            value={excForm.type}
            onChange={(e) =>
              setExcForm((p) => ({
                ...p,
                type: e.target.value as "BLOCKED" | "OVERRIDE",
              }))
            }
            options={[
              { value: "BLOCKED", label: "חסימה (יום חופש)" },
              { value: "OVERRIDE", label: "שעות מיוחדות" },
            ]}
          />
          {excForm.type === "OVERRIDE" && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="שעת התחלה"
                type="time"
                value={excForm.startTime}
                onChange={(e) =>
                  setExcForm((p) => ({ ...p, startTime: e.target.value }))
                }
              />
              <Input
                label="שעת סיום"
                type="time"
                value={excForm.endTime}
                onChange={(e) =>
                  setExcForm((p) => ({ ...p, endTime: e.target.value }))
                }
              />
            </div>
          )}
          <Input
            label="סיבה"
            placeholder="חג, יום אישי..."
            value={excForm.reason}
            onChange={(e) =>
              setExcForm((p) => ({ ...p, reason: e.target.value }))
            }
          />
          <Button fullWidth onClick={addException}>
            הוספה
          </Button>
        </div>
      </Modal>
    </div>
  );
}
