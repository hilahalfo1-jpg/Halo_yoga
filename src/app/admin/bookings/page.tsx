"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Calendar, Phone, FileText, CheckCircle, XCircle, Trash2, Search, Download, Heart, Plus, CalendarPlus, Home, MessageCircle, Check } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Textarea from "@/components/ui/Textarea";
import ManualBookingModal from "@/components/admin/ManualBookingModal";
import { formatDateShort, formatTime, formatPhone } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
import { toIsraelDateKey } from "@/lib/time";
import { waMeLink } from "@/lib/phone";
import { waText, MAPS_REVIEW_FALLBACK } from "@/lib/wa-messages";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_COLORS,
} from "@/lib/constants";

interface MedicalFormData {
  id: string;
  idNumber: string | null;
  conditions: string;
  conditionDetails: string | null;
  signatureUrl: string | null;
  medicalDocUrl: string | null;
  termsVersion: string | null;
  agreedAt: string;
}

interface BookingRow {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  notes: string | null;
  adminNotes: string | null;
  customerPhotoUrl: string | null;
  isHomeVisit: boolean;
  homeVisitSurcharge: number | null;
  medicalForm: { id: string } | null;
  service: { name: string };
  cancelToken?: string;
  // WhatsApp send stamps — undefined until WA-A's schema lands, then flow
  // automatically through the admin GET (findMany with no select).
  waReceivedSentAt?: string | null;
  waApprovedSentAt?: string | null;
  waRejectedSentAt?: string | null;
  waReviewSentAt?: string | null;
  waReminderSentAt?: string | null;
}

// Which WhatsApp message fits each booking status (NO_SHOW → no button)
const WA_STAMP_FIELD = {
  received: "waReceivedSentAt",
  approved: "waApprovedSentAt",
  rejected: "waRejectedSentAt",
  review: "waReviewSentAt",
} as const;

const WA_KIND_BY_STATUS: Record<string, keyof typeof WA_STAMP_FIELD | undefined> = {
  PENDING: "received",
  CONFIRMED: "approved",
  REJECTED: "rejected",
  CANCELLED: "rejected",
  COMPLETED: "review",
};

const STATUS_OPTIONS = [
  { value: "ALL", label: "הכל" },
  { value: "PENDING", label: "ממתין" },
  { value: "CONFIRMED", label: "מאושר" },
  { value: "COMPLETED", label: "הושלם" },
  { value: "CANCELLED", label: "בוטל" },
  { value: "NO_SHOW", label: "לא הגיע" },
  { value: "REJECTED", label: "נדחה" },
];

const STATUS_CHANGE_OPTIONS = [
  { value: "PENDING", label: "ממתין" },
  { value: "CONFIRMED", label: "מאושר" },
  { value: "COMPLETED", label: "הושלם" },
  { value: "CANCELLED", label: "בוטל" },
  { value: "NO_SHOW", label: "לא הגיע" },
  { value: "REJECTED", label: "נדחה" },
];

interface BookingActionsProps {
  booking: BookingRow;
  /** Desktop table row sizing; default is the larger mobile-card sizing */
  compact?: boolean;
  /** Resolved Google review link (SiteContent setting or Maps fallback) */
  reviewLink: string;
  onUpdateStatus: (id: string, status: string) => void;
  onOpenMedicalForm: (booking: BookingRow) => void;
  onOpenNotes: (booking: BookingRow) => void;
  onDelete: (booking: BookingRow) => void;
  /** Called after the wa-stamp PATCH succeeds so the list refreshes the ✓ */
  onWaMarked: () => void;
}

// Approve/reject + status select + medical/notes/delete actions,
// shared by the mobile card and the desktop table row
function BookingActions({
  booking,
  compact = false,
  reviewLink,
  onUpdateStatus,
  onOpenMedicalForm,
  onOpenNotes,
  onDelete,
  onWaMarked,
}: BookingActionsProps) {
  const waKind = WA_KIND_BY_STATUS[booking.status];
  const waSentAt = waKind ? booking[WA_STAMP_FIELD[waKind]] : undefined;

  const openWhatsApp = async () => {
    if (!waKind) return;
    // Popup-blocker rule: open the tab SYNCHRONOUSLY, then point it at wa.me.
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("הדפדפן חסם את פתיחת וואטסאפ — יש לאפשר חלונות קופצים");
      return;
    }
    const text = waText(waKind, {
      firstName: booking.customerName.trim().split(/\s+/)[0] || booking.customerName,
      serviceName: booking.service.name,
      dateTimeStr: `${formatDateShort(booking.startAt)} בשעה ${formatTime(booking.startAt)}`,
      cancelUrl: booking.cancelToken
        ? `${window.location.origin}/cancel/${booking.cancelToken}`
        : undefined,
      reviewLink,
    });
    win.location.href = `${waMeLink(booking.customerPhone)}?text=${encodeURIComponent(text)}`;
    // Stamp the send via the waMark PATCH contract. A 400 means the server
    // doesn't support waMark yet — the message still opened, so stay silent.
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waMark: waKind }),
      });
      if (res.ok) onWaMarked();
    } catch {
      toast.error("ההודעה נפתחה, אך סימון השליחה נכשל");
    }
  };

  return (
    <>
      {booking.status === "PENDING" ? (
        <>
          <button
            onClick={() => onUpdateStatus(booking.id, "CONFIRMED")}
            className={
              compact
                ? "flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 text-xs font-medium transition-colors"
                : "flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-success/10 text-success hover:bg-success/20 text-sm font-medium transition-colors"
            }
          >
            <CheckCircle className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            אישור
          </button>
          <button
            onClick={() => onUpdateStatus(booking.id, "CANCELLED")}
            className={
              compact
                ? "flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 text-xs font-medium transition-colors"
                : "flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-error/10 text-error hover:bg-error/20 text-sm font-medium transition-colors"
            }
          >
            <XCircle className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            דחייה
          </button>
        </>
      ) : (
        <select
          value={booking.status}
          onChange={(e) => onUpdateStatus(booking.id, e.target.value)}
          className={
            compact
              ? "text-sm px-2.5 py-1.5 rounded border border-border bg-white"
              : "text-sm px-3 py-2.5 rounded-lg border border-border bg-white flex-1"
          }
        >
          {STATUS_CHANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
      {booking.medicalForm && (
        <button
          onClick={() => onOpenMedicalForm(booking)}
          className={
            compact
              ? "flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 text-xs font-medium transition-colors whitespace-nowrap"
              : "flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 text-sm font-medium transition-colors whitespace-nowrap"
          }
        >
          <Heart className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          הצהרת בריאות
        </button>
      )}
      <button
        onClick={() => onOpenNotes(booking)}
        className={
          compact
            ? "relative p-1 rounded text-text-muted hover:text-text hover:bg-surface"
            : "relative p-2.5 rounded-lg text-text-muted hover:text-text hover:bg-surface"
        }
        title={booking.adminNotes ? "יש הערות אדמין" : "הוסיפו הערה"}
      >
        <FileText className={compact ? "h-4 w-4" : "h-5 w-5"} />
        {booking.adminNotes && (
          <span
            className={
              compact
                ? "absolute -top-0.5 -right-0.5 w-2 h-2 bg-secondary rounded-full"
                : "absolute top-1 right-1 w-2 h-2 bg-secondary rounded-full"
            }
          />
        )}
      </button>
      {waKind && (
        <button
          onClick={openWhatsApp}
          className={
            compact
              ? "relative flex items-center justify-center min-w-[40px] min-h-[40px] rounded-lg text-success hover:bg-success/10 transition-colors"
              : "relative flex items-center justify-center min-w-[40px] min-h-[40px] p-2.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
          }
          title={waSentAt ? "הודעת וואטסאפ נשלחה" : "שליחת הודעת וואטסאפ ללקוח/ה"}
          aria-label={waSentAt ? "הודעת וואטסאפ נשלחה" : "שליחת הודעת וואטסאפ ללקוח/ה"}
        >
          <MessageCircle className={compact ? "h-4 w-4" : "h-5 w-5"} />
          {waSentAt && (
            <span className="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-success text-white flex items-center justify-center">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
          )}
        </button>
      )}
      <button
        onClick={() => onDelete(booking)}
        className={
          compact
            ? "p-1 rounded text-text-muted hover:text-error hover:bg-error/10"
            : "p-2.5 rounded-lg text-text-muted hover:text-error hover:bg-error/10"
        }
      >
        <Trash2 className={compact ? "h-4 w-4" : "h-5 w-5"} />
      </button>
    </>
  );
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [medicalFormBooking, setMedicalFormBooking] = useState<BookingRow | null>(null);
  const [medicalFormData, setMedicalFormData] = useState<MedicalFormData | null>(null);
  const [medicalFormLoading, setMedicalFormLoading] = useState(false);
  // Booking id whose medical form is currently open — guards against a slow
  // response for form A overwriting form B's data after switching modals
  const openMedicalFormId = useRef<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [deleteTarget, setDeleteTarget] = useState<BookingRow | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isDeleting, setIsDeleting] = useState(false);

  // ── New booking (admin-created) ──
  const [isNewOpen, setIsNewOpen] = useState(false);

  // ── iPhone calendar subscription ──
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);

  // ── Google review link for WhatsApp review messages ──
  // Fetched once on mount from SiteContent settings/google_review_link;
  // until Hila sets one, the Maps-search fallback is used.
  const [reviewLink, setReviewLink] = useState<string>(MAPS_REVIEW_FALLBACK);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/site-content");
        const json = await res.json();
        const row = (json.data || []).find(
          (item: { section: string; key: string; value: string }) =>
            item.section === "settings" && item.key === "google_review_link"
        );
        if (!cancelled && row?.value?.trim()) setReviewLink(row.value.trim());
      } catch {
        // Keep the Maps fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribeToCalendar = async () => {
    setIsSyncingCalendar(true);
    try {
      const res = await fetch("/api/admin/calendar-feed-url");
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "שגיאה בקבלת הקישור ליומן");
        return;
      }
      // Copy the https link as a fallback (desktop / if webcal doesn't open).
      try {
        await navigator.clipboard.writeText(data.httpsUrl);
        toast.info("אם היומן לא נפתח אוטומטית — הקישור הועתק, הדביקי אותו ביומן באייפון.");
      } catch {
        // Clipboard may be unavailable — ignore gracefully.
      }
      // On iOS Safari this opens Apple Calendar's subscription dialog.
      window.location.href = data.webcalUrl;
    } catch {
      toast.error("שגיאה בקבלת הקישור ליומן");
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // The list endpoint returns only medicalForm: { id } — fetch the full form on modal open
  const openMedicalForm = async (booking: BookingRow) => {
    openMedicalFormId.current = booking.id;
    setMedicalFormBooking(booking);
    setMedicalFormData(null);
    setMedicalFormLoading(true);
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/medical-form`);
      const result = await res.json();
      // Ignore stale responses (modal closed or another form opened meanwhile)
      if (openMedicalFormId.current !== booking.id) return;
      if (res.ok) {
        setMedicalFormData(result.data);
      } else {
        toast.error(result.error || "שגיאה בטעינת הטופס הרפואי");
      }
    } catch {
      if (openMedicalFormId.current === booking.id) {
        toast.error("שגיאה בטעינת הטופס הרפואי");
      }
    } finally {
      if (openMedicalFormId.current === booking.id) {
        setMedicalFormLoading(false);
      }
    }
  };

  const fetchBookings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/bookings?${params}`);
      const result = await res.json();
      setBookings(result.data || []);
    } catch {
      toast.error("שגיאה בטעינת הזמנות");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setIsLoading(true);
    fetchBookings();
  }, [fetchBookings]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const result = await res.json();
        const rejectedCount = result.rejectedIds?.length || 0;
        if (status === "CONFIRMED" && rejectedCount > 0) {
          toast.success(`ההזמנה אושרה | ${rejectedCount} הזמנות חופפות נדחו אוטומטית`);
        } else {
          toast.success("הסטטוס עודכן");
        }
        fetchBookings();
      }
    } catch {
      toast.error("שגיאה בעדכון");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/bookings/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("ההזמנה נמחקה");
        setDeleteTarget(null);
        fetchBookings();
      } else {
        toast.error("שגיאה במחיקה");
      }
    } catch {
      toast.error("שגיאה במחיקה");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !b.customerName.toLowerCase().includes(q) &&
          !b.customerPhone.includes(q) &&
          !b.service.name.toLowerCase().includes(q)
        )
          return false;
      }
      if (dateFrom) {
        const bookingDate = toIsraelDateKey(new Date(b.startAt));
        if (bookingDate < dateFrom) return false;
      }
      if (dateTo) {
        const bookingDate = toIsraelDateKey(new Date(b.startAt));
        if (bookingDate > dateTo) return false;
      }
      return true;
    });
  }, [bookings, searchQuery, dateFrom, dateTo]);

  const exportCSV = () => {
    const headers = ["תאריך", "שעה", "שירות", "לקוח", "טלפון", "אימייל", "סטטוס", "הערות"];
    const rows = filteredBookings.map((b) => [
      formatDateShort(b.startAt),
      formatTime(b.startAt),
      b.service.name,
      b.customerName,
      b.customerPhone,
      b.customerEmail || "",
      BOOKING_STATUS_LABELS[b.status] || b.status,
      b.notes || "",
    ]);
    downloadCsv(`bookings-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const openNotes = (booking: BookingRow) => {
    setSelectedBooking(booking);
    setAdminNotes(booking.adminNotes || "");
  };

  const saveAdminNotes = async () => {
    if (!selectedBooking) return;
    try {
      const res = await fetch(`/api/admin/bookings/${selectedBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes }),
      });
      if (res.ok) {
        toast.success("ההערה נשמרה");
        setSelectedBooking(null);
        fetchBookings();
      }
    } catch {
      toast.error("שגיאה בשמירה");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner label="טוען הזמנות..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">ניהול הזמנות</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setIsNewOpen(true)}>
            <Plus className="h-4 w-4 ml-1" />
            תיאום תור חדש
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={subscribeToCalendar}
            isLoading={isSyncingCalendar}
          >
            <CalendarPlus className="h-4 w-4 ml-1" />
            הוסף ליומן אייפון
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 ml-1" />
            CSV
          </Button>
          <div className="w-full sm:w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>
      </div>

      {/* Search & Date Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="חיפוש לפי שם, טלפון או שירות..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-2 text-base sm:text-sm rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-text-muted">מתאריך</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 text-base sm:text-sm rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              dir="ltr"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-text-muted">עד תאריך</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 text-base sm:text-sm rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title="אין הזמנות"
          description="כשלקוחות יקבעו תורים, הם יופיעו כאן"
        />
      ) : (
        <>
          {/* Mobile: Card Layout */}
          <div className="space-y-3 lg:hidden">
            {filteredBookings.map((booking) => (
              <Card key={booking.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {booking.customerPhotoUrl && (
                      <img
                        src={booking.customerPhotoUrl}
                        alt={booking.customerName}
                        className="w-10 h-10 rounded-full object-cover border border-border flex-shrink-0"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-text">{booking.customerName}</p>
                      <p className="text-sm text-text-muted">{booking.service.name}</p>
                    </div>
                  </div>
                  <Badge className={BOOKING_STATUS_COLORS[booking.status]}>
                    {BOOKING_STATUS_LABELS[booking.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-text-muted">
                  <span dir="ltr">{formatDateShort(booking.startAt)}</span>
                  <span dir="ltr">{formatTime(booking.startAt)}</span>
                </div>
                {booking.isHomeVisit && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary border border-secondary/20">
                    <Home className="h-3 w-3" />
                    ביקור בית
                    {(booking.homeVisitSurcharge || 0) > 0 && (
                      <span dir="ltr">+₪{booking.homeVisitSurcharge}</span>
                    )}
                  </span>
                )}
                <a
                  href={`tel:${booking.customerPhone}`}
                  className="text-sm text-secondary hover:underline flex items-center gap-1"
                  dir="ltr"
                >
                  <Phone className="h-3 w-3" />
                  {formatPhone(booking.customerPhone)}
                </a>
                {booking.notes && (
                  <p className="text-xs text-text-muted bg-surface rounded-lg p-2">
                    {booking.notes}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                  <BookingActions
                    booking={booking}
                    reviewLink={reviewLink}
                    onUpdateStatus={updateStatus}
                    onOpenMedicalForm={openMedicalForm}
                    onOpenNotes={openNotes}
                    onDelete={setDeleteTarget}
                    onWaMarked={fetchBookings}
                  />
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop: Table Layout */}
          <Card className="overflow-x-auto p-0 hidden lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="text-right p-3 font-medium text-text-muted">תאריך</th>
                  <th className="text-right p-3 font-medium text-text-muted">שעה</th>
                  <th className="text-right p-3 font-medium text-text-muted">שירות</th>
                  <th className="text-right p-3 font-medium text-text-muted">לקוח</th>
                  <th className="text-right p-3 font-medium text-text-muted">טלפון</th>
                  <th className="text-right p-3 font-medium text-text-muted">סטטוס</th>
                  <th className="text-right p-3 font-medium text-text-muted">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-border last:border-0 hover:bg-surface/30"
                  >
                    <td className="p-3 text-text">
                      <span dir="ltr" className="inline-block">{formatDateShort(booking.startAt)}</span>
                    </td>
                    <td className="p-3 text-text">
                      <span dir="ltr" className="inline-block">{formatTime(booking.startAt)}</span>
                    </td>
                    <td className="p-3 text-text">
                      {booking.service.name}
                      {booking.isHomeVisit && (
                        <span className="mr-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary border border-secondary/20">
                          <Home className="h-3 w-3" />
                          ביקור בית
                          {(booking.homeVisitSurcharge || 0) > 0 && (
                            <span dir="ltr">+₪{booking.homeVisitSurcharge}</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {booking.customerPhotoUrl && (
                          <img
                            src={booking.customerPhotoUrl}
                            alt={booking.customerName}
                            className="w-8 h-8 rounded-full object-cover border border-border flex-shrink-0"
                          />
                        )}
                        <div>
                          <p className="text-text font-medium">{booking.customerName}</p>
                          {booking.notes && (
                            <p className="text-xs text-text-muted mt-0.5 truncate max-w-[200px]" title={booking.notes}>
                              {booking.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <a
                        href={`tel:${booking.customerPhone}`}
                        className="text-secondary hover:underline flex items-center gap-1"
                        dir="ltr"
                      >
                        <Phone className="h-3 w-3" />
                        {formatPhone(booking.customerPhone)}
                      </a>
                    </td>
                    <td className="p-3">
                      <Badge className={BOOKING_STATUS_COLORS[booking.status]}>
                        {BOOKING_STATUS_LABELS[booking.status]}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <BookingActions
                          booking={booking}
                          compact
                          reviewLink={reviewLink}
                          onUpdateStatus={updateStatus}
                          onOpenMedicalForm={openMedicalForm}
                          onOpenNotes={openNotes}
                          onDelete={setDeleteTarget}
                          onWaMarked={fetchBookings}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* Admin Notes Modal */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title={`הערות — ${selectedBooking?.customerName || ""}`}
        size="sm"
      >
        <div className="space-y-4">
          {selectedBooking?.notes && (
            <div className="bg-surface rounded-lg p-3">
              <p className="text-xs text-text-muted mb-1">הערות הלקוח:</p>
              <p className="text-sm text-text">{selectedBooking.notes}</p>
            </div>
          )}
          <Textarea
            label="הערות אדמין"
            placeholder="הוסיפו הערות פנימיות..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
          />
          <Button fullWidth onClick={saveAdminNotes}>
            שמירה
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="מחיקת הזמנה"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text">
            למחוק את ההזמנה של{" "}
            <span className="font-semibold">{deleteTarget?.customerName}</span>
            {" "}לצמיתות? פעולה זו לא ניתנת לביטול.
          </p>
          <div className="flex gap-3">
            <Button
              variant="danger"
              size="sm"
              fullWidth
              onClick={confirmDelete}
              isLoading={isDeleting}
            >
              <Trash2 className="h-4 w-4 ml-1" />
              מחיקה
            </Button>
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => setDeleteTarget(null)}
            >
              ביטול
            </Button>
          </div>
        </div>
      </Modal>

      {/* Medical Form Modal */}
      <Modal
        isOpen={!!medicalFormBooking}
        onClose={() => {
          openMedicalFormId.current = null;
          setMedicalFormBooking(null);
          setMedicalFormData(null);
        }}
        title={`טופס רפואי — ${medicalFormBooking?.customerName || ""}`}
        size="lg"
      >
        {medicalFormLoading && (
          <div className="py-8">
            <Spinner label="טוען טופס רפואי..." />
          </div>
        )}
        {!medicalFormLoading && medicalFormData && (() => {
          const form = medicalFormData;
          let conditionsList: string[] = [];
          try {
            conditionsList = JSON.parse(form.conditions);
          } catch {
            conditionsList = [];
          }
          return (
            <div className="space-y-4">
              {/* ID Number */}
              {form.idNumber && (
                <div className="bg-surface rounded-lg p-3">
                  <p className="text-xs text-text-muted mb-1">תעודת זהות</p>
                  <p className="text-sm text-text font-medium" dir="ltr">{form.idNumber}</p>
                </div>
              )}

              {/* Medical Conditions */}
              {conditionsList.length > 0 && (
                <div className="bg-surface rounded-lg p-3">
                  <p className="text-xs text-text-muted mb-2">מצבים רפואיים</p>
                  <div className="flex flex-wrap gap-2">
                    {conditionsList.map((c: string, i: number) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Condition Details */}
              {form.conditionDetails && (
                <div className="bg-surface rounded-lg p-3">
                  <p className="text-xs text-text-muted mb-1">פירוט רפואי</p>
                  <p className="text-sm text-text whitespace-pre-wrap">{form.conditionDetails}</p>
                </div>
              )}

              {/* Signature */}
              {form.signatureUrl && (
                <div className="bg-surface rounded-lg p-3">
                  <p className="text-xs text-text-muted mb-2">חתימה דיגיטלית</p>
                  <img
                    src={form.signatureUrl}
                    alt="חתימה"
                    className="max-h-24 border border-border rounded bg-white p-1"
                  />
                </div>
              )}

              {/* Medical Document */}
              {form.medicalDocUrl && (
                <div className="bg-surface rounded-lg p-3">
                  <p className="text-xs text-text-muted mb-1">מסמך רפואי</p>
                  <a
                    href={form.medicalDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-secondary hover:underline flex items-center gap-1"
                  >
                    <FileText className="h-4 w-4" />
                    צפייה במסמך
                  </a>
                </div>
              )}

              {/* Agreement Date + terms version */}
              <p className="text-xs text-text-muted text-center">
                נחתם ב-{new Date(form.agreedAt).toLocaleDateString("he-IL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Jerusalem",
                })}
                {form.termsVersion && (
                  <>
                    {" "}· גרסת תקנון{" "}
                    <span dir="ltr">{form.termsVersion}</span>
                  </>
                )}
              </p>
            </div>
          );
        })()}
      </Modal>

      {/* New Booking Modal */}
      <ManualBookingModal
        open={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        onSuccess={fetchBookings}
      />
    </div>
  );
}
