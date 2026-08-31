"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Download,
  CalendarRange,
  TrendingUp,
  CheckCircle,
  ListChecks,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import DonutChart from "@/components/admin/charts/DonutChart";
import BarChart from "@/components/admin/charts/BarChart";
import BarsOverTime, { hebrewMonthLabel } from "@/components/admin/charts/BarsOverTime";
import { formatPrice } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
import {
  CATEGORY_LABELS,
  BOOKING_STATUS_LABELS,
} from "@/lib/constants";

interface ServiceRow {
  name: string;
  count: number;
  revenue: number;
}

interface CategoryRow {
  category: string;
  count: number;
  revenue: number;
}

interface TrendPoint {
  month: string;
  revenue: number;
  bookings: number;
}

interface ReportData {
  range: { from: string; to: string };
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
  statusCounts: Record<string, number>;
  byService: ServiceRow[];
  byCategory: CategoryRow[];
  monthlyTrend: TrendPoint[];
  newVsReturning: { new: number; returning: number };
  homeVisitShare: { home: number; studio: number };
  attemptsByReason: Array<{ reason: string; count: number }>;
}

const STATUS_ORDER = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
  "NO_SHOW",
];

// Status semantics (never the categorical palette): green confirmed/completed,
// amber pending, red cancelled/rejected, gray no-show
const STATUS_CHART_COLORS: Record<string, string> = {
  PENDING: "#e8830c",
  CONFIRMED: "#2e9e5b",
  COMPLETED: "#1f7a44",
  CANCELLED: "#dc2626",
  REJECTED: "#991b1b",
  NO_SHOW: "#8a8f8a",
};

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function ReportsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?month=${month}`);
      if (!res.ok) throw new Error("fetch failed");
      const result = await res.json();
      setData(result.data || null);
    } catch {
      toast.error("שגיאה בטעינת הדוח");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const exportCSV = () => {
    if (!data) return;
    const lines: string[][] = [];

    lines.push([]);
    lines.push(["סיכום"]);
    lines.push(["סך הזמנות", String(data.totalBookings)]);
    lines.push(["הזמנות שהושלמו", String(data.completedBookings)]);
    lines.push(["הכנסה (₪)", String(data.totalRevenue)]);
    lines.push([]);

    lines.push(["פילוח לפי שירות"]);
    lines.push(["שירות", "כמות הזמנות", "הכנסה (₪)"]);
    data.byService.forEach((s) => lines.push([s.name, String(s.count), String(s.revenue)]));
    lines.push([]);

    lines.push(["פילוח לפי קטגוריה"]);
    lines.push(["קטגוריה", "כמות הזמנות", "הכנסה (₪)"]);
    data.byCategory.forEach((c) =>
      lines.push([CATEGORY_LABELS[c.category] || c.category, String(c.count), String(c.revenue)])
    );
    lines.push([]);

    lines.push(["פילוח לפי סטטוס"]);
    lines.push(["סטטוס", "כמות"]);
    STATUS_ORDER.forEach((s) =>
      lines.push([BOOKING_STATUS_LABELS[s] || s, String(data.statusCounts[s] || 0)])
    );
    lines.push([]);

    lines.push(["הכנסות לפי חודש (12 חודשים אחרונים)"]);
    lines.push(["חודש", "הכנסה (₪)", "הזמנות"]);
    data.monthlyTrend.forEach((m) =>
      lines.push([m.month, String(m.revenue), String(m.bookings)])
    );
    lines.push([]);

    lines.push(["לקוחות חדשים מול חוזרים"]);
    lines.push(["לקוחות חדשים", String(data.newVsReturning.new)]);
    lines.push(["לקוחות חוזרים", String(data.newVsReturning.returning)]);
    lines.push([]);

    lines.push(["ביקורי בית"]);
    lines.push(["ביקור בית", String(data.homeVisitShare.home)]);
    lines.push(["אצל המטפלת", String(data.homeVisitShare.studio)]);
    lines.push([]);

    lines.push(["ביקושים שאבדו (ניסיונות הזמנה שנכשלו)"]);
    lines.push(["סיבה", "כמות"]);
    data.attemptsByReason.forEach((a) => lines.push([a.reason, String(a.count)]));

    downloadCsv(`report-${month}.csv`, [`דוח חודש ${month}`], lines);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-secondary" strokeWidth={1.5} />
          דוחות
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={!data || data.totalBookings === 0}
          >
            <Download className="h-4 w-4 ml-1" />
            ייצוא CSV
          </Button>
        </div>
      </div>

      {/* Month picker: prev/next arrows + Hebrew month chip (iOS-safe) */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-muted flex items-center gap-1">
            <CalendarRange className="h-3.5 w-3.5" />
            חודש
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="חודש קודם"
              onClick={() => setMonth(addMonths(month, -1))}
              className="h-10 w-10 flex items-center justify-center rounded-lg border border-border bg-white text-text-muted hover:text-text hover:border-text-muted transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="min-w-[8.5rem] h-10 flex items-center justify-center px-4 rounded-lg border border-border bg-white text-sm font-medium text-text">
              {hebrewMonthLabel(month)}
            </div>
            <button
              type="button"
              aria-label="חודש הבא"
              onClick={() => setMonth(addMonths(month, 1))}
              className="h-10 w-10 flex items-center justify-center rounded-lg border border-border bg-white text-text-muted hover:text-text hover:border-text-muted transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setMonth(currentMonth())}>
            החודש הנוכחי
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMonth(addMonths(currentMonth(), -1))}
          >
            חודש קודם
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner label="טוען דוח..." />
        </div>
      ) : !data ? (
        <EmptyState
          icon={<BarChart3 className="h-12 w-12" />}
          title="אין נתונים"
          description="לא נמצאו נתונים לחודש שנבחר"
        />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-info/10 text-info">
                  <ListChecks className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm text-text-muted">סך הזמנות</p>
                  <p className="text-2xl font-bold text-text">{data.totalBookings}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-success/10 text-success">
                  <CheckCircle className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm text-text-muted">הושלמו</p>
                  <p className="text-2xl font-bold text-text">{data.completedBookings}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/20 text-secondary">
                  <TrendingUp className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm text-text-muted">הכנסה (הושלמו)</p>
                  <p className="text-2xl font-bold text-text" dir="ltr">
                    {formatPrice(data.totalRevenue)}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Revenue over the last 12 months */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-text mb-1">
              הכנסות — 12 חודשים אחרונים
            </h2>
            <p className="text-xs text-text-muted mb-4">
              המספר מעל כל עמודה הוא מספר ההזמנות באותו חודש
            </p>
            <BarsOverTime data={data.monthlyTrend} />
          </Card>

          {/* By service (count) */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-text mb-4">
              פילוח לפי שירות (כמות הזמנות)
            </h2>
            <DonutChart
              // API sorts by revenue; the donut shows counts — re-sort by count
              // so a high-count service can't fold into "אחר"
              data={[...data.byService]
                .sort((a, b) => b.count - a.count)
                .map((s) => ({ label: s.name, value: s.count }))}
            />
          </Card>

          {/* Status distribution */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-text mb-4">פילוח לפי סטטוס</h2>
            <BarChart
              data={STATUS_ORDER.map((s) => ({
                label: BOOKING_STATUS_LABELS[s] || s,
                value: data.statusCounts[s] || 0,
                color: STATUS_CHART_COLORS[s],
              }))}
            />
          </Card>

          {/* New vs returning + home visits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-text mb-4">
                לקוחות חדשים מול חוזרים
              </h2>
              <DonutChart
                size={128}
                data={[
                  { label: "לקוחות חדשים", value: data.newVsReturning.new },
                  { label: "לקוחות חוזרים", value: data.newVsReturning.returning },
                ]}
              />
            </Card>
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-text mb-4">ביקורי בית</h2>
              <DonutChart
                size={128}
                data={[
                  { label: "ביקור בית", value: data.homeVisitShare.home },
                  { label: "אצל המטפלת", value: data.homeVisitShare.studio },
                ]}
              />
            </Card>
          </div>

          {/* Lost demand: failed booking attempts by reason */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-text mb-1">ביקושים שאבדו</h2>
            <p className="text-xs text-text-muted mb-4">
              ניסיונות הזמנה שלא הושלמו בחודש שנבחר, לפי סיבה
            </p>
            <BarChart
              data={data.attemptsByReason.map((a) => ({
                label: a.reason,
                value: a.count,
              }))}
            />
          </Card>

          {/* By service — mobile cards */}
          <div className="space-y-3 lg:hidden">
            <h2 className="text-sm font-semibold text-text">פילוח לפי שירות</h2>
            {data.byService.length === 0 ? (
              <Card className="p-4">
                <p className="text-sm text-text-muted">אין נתונים</p>
              </Card>
            ) : (
              data.byService.map((s) => (
                <Card key={s.name} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-text min-w-0 truncate">{s.name}</p>
                    <p className="text-sm font-medium text-text shrink-0" dir="ltr">
                      {formatPrice(s.revenue)}
                    </p>
                  </div>
                  <p className="text-sm text-text-muted mt-1">{s.count} הזמנות</p>
                </Card>
              ))
            )}
          </div>

          {/* By service — desktop table */}
          <Card className="overflow-x-auto p-0 hidden lg:block">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-semibold text-text">פילוח לפי שירות</h2>
            </div>
            {data.byService.length === 0 ? (
              <p className="p-4 text-sm text-text-muted">אין נתונים</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/50">
                    <th className="text-right p-3 font-medium text-text-muted">שירות</th>
                    <th className="text-right p-3 font-medium text-text-muted">כמות הזמנות</th>
                    <th className="text-right p-3 font-medium text-text-muted">הכנסה</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byService.map((s) => (
                    <tr
                      key={s.name}
                      className="border-b border-border last:border-0 hover:bg-surface/30"
                    >
                      <td className="p-3 text-text">{s.name}</td>
                      <td className="p-3 text-text">{s.count}</td>
                      <td className="p-3 text-text" dir="ltr">
                        <span className="inline-block">{formatPrice(s.revenue)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* By category — mobile cards */}
          <div className="space-y-3 lg:hidden">
            <h2 className="text-sm font-semibold text-text">פילוח לפי קטגוריה</h2>
            {data.byCategory.length === 0 ? (
              <Card className="p-4">
                <p className="text-sm text-text-muted">אין נתונים</p>
              </Card>
            ) : (
              data.byCategory.map((c) => (
                <Card key={c.category} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-text min-w-0 truncate">
                      {CATEGORY_LABELS[c.category] || c.category}
                    </p>
                    <p className="text-sm font-medium text-text shrink-0" dir="ltr">
                      {formatPrice(c.revenue)}
                    </p>
                  </div>
                  <p className="text-sm text-text-muted mt-1">{c.count} הזמנות</p>
                </Card>
              ))
            )}
          </div>

          {/* By category — desktop table */}
          <Card className="overflow-x-auto p-0 hidden lg:block">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-semibold text-text">פילוח לפי קטגוריה</h2>
            </div>
            {data.byCategory.length === 0 ? (
              <p className="p-4 text-sm text-text-muted">אין נתונים</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/50">
                    <th className="text-right p-3 font-medium text-text-muted">קטגוריה</th>
                    <th className="text-right p-3 font-medium text-text-muted">כמות הזמנות</th>
                    <th className="text-right p-3 font-medium text-text-muted">הכנסה</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCategory.map((c) => (
                    <tr
                      key={c.category}
                      className="border-b border-border last:border-0 hover:bg-surface/30"
                    >
                      <td className="p-3 text-text">
                        {CATEGORY_LABELS[c.category] || c.category}
                      </td>
                      <td className="p-3 text-text">{c.count}</td>
                      <td className="p-3 text-text" dir="ltr">
                        <span className="inline-block">{formatPrice(c.revenue)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
