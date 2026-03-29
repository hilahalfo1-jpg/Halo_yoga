"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Calendar, Phone, FileText, CheckCircle, XCircle, Trash2, Search, Download, Heart, Image as ImageIcon } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Textarea from "@/components/ui/Textarea";
import { formatDateShort, formatTime, formatPhone } from "@/lib/utils";
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
  medicalForm: MedicalFormData | null;
  service: { name: string };
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "הכל" },
  { value: "PENDING", label: "ממתין" },
  { value: "CONFIRMED", label: "מאושר" },
  { value: "COMPLETED", label: "הושלם" },
  { value: "CANCELLED", label: "בוטל" },
  { value: "NO_SHOW", label: "לא הגיע" },
];

const STATUS_CHANGE_OPTIONS = [
  { value: "PENDING", label: "ממתין" },
  { value: "CONFIRMED", label: "מאושר" },
  { value: "COMPLETED", label: "הושלם" },
  { value: "CANCELLED", label: "בוטל" },
  { value: "NO_SHOW", label: "לא הגיע" },
];

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

  const deleteBooking = async (id: string) => {
    if (!confirm("למחוק את ההזמנה לצמיתות?")) return;
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("ההזמנה נמחקה");
        fetchBookings();
      } else {
        toast.error("שגיאה במחיקה");
      }
    } catch {
      toast.error("שגיאה במחיקה");
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
        const bookingDate = new Date(b.startAt).toISOString().slice(0, 10);
        if (bookingDate < dateFrom) return false;
      }
      if (dateTo) {
        const bookingDate = new Date(b.startAt).toISOString().slice(0, 10);
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
    const bom = "\uFEFF";
    const csv = bom + [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 ml-1" />
            CSV
          </Button>
          <div className="w-40">
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
            className="w-full pr-10 pl-3 py-2 text-sm rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            placeholder="מתאריך"
            dir="ltr"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            placeholder="עד תאריך"
            dir="ltr"
          />
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
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  {booking.status === "PENDING" ? (
                    <>
                      <button
                        onClick={() => updateStatus(booking.id, "CONFIRMED")}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-success/10 text-success hover:bg-success/20 text-sm font-medium transition-colors"
                      >
                        <CheckCircle className="h-4 w-4" />
                        אישור
                      </button>
                      <button
                        onClick={() => updateStatus(booking.id, "CANCELLED")}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-error/10 text-error hover:bg-error/20 text-sm font-medium transition-colors"
                      >
                        <XCircle className="h-4 w-4" />
                        דחייה
                      </button>
                    </>
                  ) : (
                    <select
                      value={booking.status}
                      onChange={(e) => updateStatus(booking.id, e.target.value)}
                      className="text-sm px-3 py-2.5 rounded-lg border border-border bg-white flex-1"
                    >
                      {STATUS_CHANGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                  {booking.medicalForm && (
                    <button
                      onClick={() => setMedicalFormBooking(booking)}
                      className="p-2 rounded-lg text-primary hover:text-primary hover:bg-primary/10"
                      title="טופס רפואי"
                    >
                      <Heart className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedBooking(booking);
                      setAdminNotes(booking.adminNotes || "");
                    }}
                    className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface"
                  >
                    <FileText className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => deleteBooking(booking.id)}
                    className="p-2 rounded-lg text-text-muted hover:text-error hover:bg-error/10"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
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
                    <td className="p-3 text-text" dir="ltr">
                      {formatDateShort(booking.startAt)}
                    </td>
                    <td className="p-3 text-text" dir="ltr">
                      {formatTime(booking.startAt)}
                    </td>
                    <td className="p-3 text-text">{booking.service.name}</td>
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
                        {booking.status === "PENDING" ? (
                          <>
                            <button
                              onClick={() => updateStatus(booking.id, "CONFIRMED")}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 text-xs font-medium transition-colors"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              אישור
                            </button>
                            <button
                              onClick={() => updateStatus(booking.id, "CANCELLED")}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 text-xs font-medium transition-colors"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              דחייה
                            </button>
                          </>
                        ) : (
                          <select
                            value={booking.status}
                            onChange={(e) => updateStatus(booking.id, e.target.value)}
                            className="text-sm px-2.5 py-1.5 rounded border border-border bg-white"
                          >
                            {STATUS_CHANGE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                        {booking.medicalForm && (
                          <button
                            onClick={() => setMedicalFormBooking(booking)}
                            className="p-1 rounded text-primary hover:bg-primary/10"
                            title="טופס רפואי"
                          >
                            <Heart className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setAdminNotes(booking.adminNotes || "");
                          }}
                          className="p-1 rounded text-text-muted hover:text-text hover:bg-surface"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteBooking(booking.id)}
                          className="p-1 rounded text-text-muted hover:text-error hover:bg-error/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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

      {/* Medical Form Modal */}
      <Modal
        isOpen={!!medicalFormBooking}
        onClose={() => setMedicalFormBooking(null)}
        title={`טופס רפואי — ${medicalFormBooking?.customerName || ""}`}
        size="lg"
      >
        {medicalFormBooking?.medicalForm && (() => {
          const form = medicalFormBooking.medicalForm;
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

              {/* Agreement Date */}
              <p className="text-xs text-text-muted text-center">
                נחתם בתאריך: {new Date(form.agreedAt).toLocaleDateString("he-IL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
