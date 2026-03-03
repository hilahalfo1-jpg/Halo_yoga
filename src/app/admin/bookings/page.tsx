"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Calendar, Phone, FileText } from "lucide-react";
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
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

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
        toast.success("הסטטוס עודכן");
        fetchBookings();
      }
    } catch {
      toast.error("שגיאה בעדכון");
    }
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
        <div className="w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_OPTIONS}
          />
        </div>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title="אין הזמנות"
          description="כשלקוחות יקבעו תורים, הם יופיעו כאן"
        />
      ) : (
        <Card className="overflow-x-auto p-0">
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
              {bookings.map((booking) => (
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
                  <td className="p-3 text-text font-medium">
                    {booking.customerName}
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
                      <select
                        value={booking.status}
                        onChange={(e) =>
                          updateStatus(booking.id, e.target.value)
                        }
                        className="text-xs px-2 py-1 rounded border border-border bg-white"
                      >
                        {STATUS_CHANGE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setAdminNotes(booking.adminNotes || "");
                        }}
                        className="p-1 rounded text-text-muted hover:text-text hover:bg-surface"
                        title="הערות אדמין"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
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
    </div>
  );
}
