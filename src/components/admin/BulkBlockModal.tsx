"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { DAYS_OF_WEEK_HE } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface BulkBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Mode = "range" | "specific";
type BlockType = "BLOCKED" | "OVERRIDE";

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function BulkBlockModal({ isOpen, onClose, onSuccess }: BulkBlockModalProps) {
  const [mode, setMode] = useState<Mode>("range");
  const [blockType, setBlockType] = useState<BlockType>("BLOCKED");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  // Build calendar grid for specific mode
  const monthDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewMonth]);

  const toggleDay = (date: Date) => {
    const key = toKey(date);
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedKeys(next);
  };

  const resetForm = () => {
    setMode("range");
    setBlockType("BLOCKED");
    setFromDate("");
    setToDate("");
    setSelectedKeys(new Set());
    setStartTime("09:00");
    setEndTime("17:00");
    setReason("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    let dates: string[] = [];

    if (mode === "range") {
      if (!fromDate || !toDate) {
        toast.error("נא לבחור טווח תאריכים");
        return;
      }
      const from = new Date(fromDate);
      const to = new Date(toDate);
      if (from > to) {
        toast.error("תאריך ההתחלה חייב להיות לפני או שווה לתאריך הסיום");
        return;
      }
      const d = new Date(from);
      while (d <= to) {
        dates.push(toKey(d));
        d.setDate(d.getDate() + 1);
      }
    } else {
      dates = Array.from(selectedKeys);
      if (dates.length === 0) {
        toast.error("נא לבחור לפחות יום אחד");
        return;
      }
    }

    if (blockType === "OVERRIDE" && (!startTime || !endTime || startTime >= endTime)) {
      toast.error("נא להזין טווח שעות תקין");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/availability/bulk-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dates,
          type: blockType,
          startTime: blockType === "OVERRIDE" ? startTime : null,
          endTime: blockType === "OVERRIDE" ? endTime : null,
          reason: reason || null,
          category: null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "שגיאה בחסימה");
        return;
      }
      toast.success(`נחסמו ${json.data.created} ימים בהצלחה`);
      resetForm();
      onSuccess();
      onClose();
    } catch {
      toast.error("שגיאת שרת");
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="חסימת ימים" size="md">
      <div className="space-y-5">
        {/* Mode toggle */}
        <div className="flex gap-2 p-1 bg-surface rounded-lg">
          <button
            type="button"
            onClick={() => setMode("range")}
            className={cn(
              "flex-1 px-4 py-2 text-sm rounded-md transition-colors",
              mode === "range" ? "bg-white text-text font-medium shadow-sm" : "text-text-muted hover:text-text"
            )}
          >
            טווח תאריכים
          </button>
          <button
            type="button"
            onClick={() => setMode("specific")}
            className={cn(
              "flex-1 px-4 py-2 text-sm rounded-md transition-colors",
              mode === "specific" ? "bg-white text-text font-medium shadow-sm" : "text-text-muted hover:text-text"
            )}
          >
            בחירה ספציפית
          </button>
        </div>

        {/* Range mode */}
        {mode === "range" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="מתאריך"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              dir="ltr"
            />
            <Input
              label="עד תאריך"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              dir="ltr"
            />
          </div>
        )}

        {/* Specific mode — mini calendar */}
        {mode === "specific" && (
          <div className="border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
                className="p-1.5 rounded-md hover:bg-surface text-text-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium text-text">
                {viewMonth.toLocaleDateString("he-IL", { month: "long", year: "numeric" })}
              </span>
              <button
                type="button"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
                className="p-1.5 rounded-md hover:bg-surface text-text-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS_OF_WEEK_HE.map((d) => (
                <div key={d} className="text-[11px] text-text-muted text-center py-1">
                  {d.charAt(0)}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((date, idx) => {
                if (!date) return <div key={idx} />;
                const key = toKey(date);
                const selected = selectedKeys.has(key);
                const isPast = date < today;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isPast}
                    onClick={() => toggleDay(date)}
                    className={cn(
                      "aspect-square rounded-md text-sm transition-colors",
                      isPast && "text-text-muted opacity-30 cursor-not-allowed",
                      !isPast && selected && "bg-error text-white font-semibold",
                      !isPast && !selected && "hover:bg-surface text-text"
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {selectedKeys.size > 0 && (
              <p className="text-xs text-text-muted mt-3 text-center">
                נבחרו {selectedKeys.size} ימים
              </p>
            )}
          </div>
        )}

        {/* Block type */}
        <div className="flex gap-2 p-1 bg-surface rounded-lg">
          <button
            type="button"
            onClick={() => setBlockType("BLOCKED")}
            className={cn(
              "flex-1 px-4 py-2 text-sm rounded-md transition-colors",
              blockType === "BLOCKED" ? "bg-white text-text font-medium shadow-sm" : "text-text-muted hover:text-text"
            )}
          >
            יום שלם
          </button>
          <button
            type="button"
            onClick={() => setBlockType("OVERRIDE")}
            className={cn(
              "flex-1 px-4 py-2 text-sm rounded-md transition-colors",
              blockType === "OVERRIDE" ? "bg-white text-text font-medium shadow-sm" : "text-text-muted hover:text-text"
            )}
          >
            טווח שעות
          </button>
        </div>

        {/* Time range */}
        {blockType === "OVERRIDE" && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="משעה"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              dir="ltr"
            />
            <Input
              label="עד שעה"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              dir="ltr"
            />
          </div>
        )}

        {/* Reason */}
        <Textarea
          label="סיבה (אופציונלי)"
          placeholder="לדוגמה: חופשה, כנס, אירוע משפחתי"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            ביטול
          </Button>
          <Button size="sm" isLoading={isSubmitting} onClick={handleSubmit}>
            חסום
          </Button>
        </div>
      </div>
    </Modal>
  );
}
