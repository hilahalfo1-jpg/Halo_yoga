"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import Textarea from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";

interface ManualBookingModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  prefill?: { name?: string; phone?: string; email?: string };
}

export default function ManualBookingModal({
  open,
  onClose,
  onSuccess,
  prefill,
}: ManualBookingModalProps) {
  const [services, setServices] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
  const [newServiceId, setNewServiceId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [slots, setSlots] = useState<{ startTime: string; endTime: string; isAvailable: boolean }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [newStartTime, setNewStartTime] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Initialize / reset form whenever the modal opens or closes.
  useEffect(() => {
    if (open) {
      setNewServiceId("");
      setNewDate("");
      setSlots([]);
      setNewStartTime("");
      setNewName(prefill?.name ?? "");
      setNewPhone(prefill?.phone ?? "");
      setNewEmail(prefill?.email ?? "");
      setNewNotes("");
      if (services.length === 0) {
        (async () => {
          try {
            const res = await fetch("/api/admin/services");
            const result = await res.json();
            setServices((result.data || []).filter((s: { isActive: boolean }) => s.isActive));
          } catch {
            toast.error("שגיאה בטעינת השירותים");
          }
        })();
      }
    } else {
      // Reset internal form state when it closes so the next open is clean.
      setNewServiceId("");
      setNewDate("");
      setSlots([]);
      setNewStartTime("");
      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewNotes("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Fetch available slots when service + date are chosen
  useEffect(() => {
    if (!newServiceId || !newDate) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    setNewStartTime("");
    fetch(`/api/bookings?date=${newDate}&serviceId=${newServiceId}`)
      .then((res) => res.json())
      .then((result) => {
        if (!cancelled) setSlots(result.data || []);
      })
      .catch(() => {
        if (!cancelled) {
          setSlots([]);
          toast.error("שגיאה בטעינת זמנים פנויים");
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [newServiceId, newDate]);

  const createBooking = async () => {
    if (!newServiceId || !newDate || !newStartTime || !newName.trim() || !newPhone.trim()) {
      toast.error("יש למלא שירות, תאריך, שעה, שם וטלפון");
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: newServiceId,
          date: newDate,
          startTime: newStartTime,
          customerName: newName.trim(),
          customerPhone: newPhone.trim(),
          customerEmail: newEmail.trim() || undefined,
          notes: newNotes.trim() || undefined,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success("התור נקבע בהצלחה");
        onSuccess?.();
        onClose();
      } else {
        toast.error(result.error || "שגיאה בקביעת התור");
      }
    } catch {
      toast.error("שגיאה בקביעת התור");
    } finally {
      setIsCreating(false);
    }
  };

  const availableSlots = slots.filter((s) => s.isAvailable);

  return (
    <Modal isOpen={open} onClose={onClose} title="תיאום תור חדש" size="md">
      <div className="space-y-4">
        <Select
          label="שירות"
          value={newServiceId}
          onChange={(e) => setNewServiceId(e.target.value)}
          placeholder="בחרו שירות"
          options={services.map((s) => ({ value: s.id, label: s.name }))}
        />

        <div>
          <label className="block text-sm font-medium text-text mb-1.5">תאריך</label>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            dir="ltr"
            className="w-full px-4 py-3 rounded-lg border border-border bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {newServiceId && newDate && (
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">שעה</label>
            {slotsLoading ? (
              <div className="py-4">
                <Spinner label="טוען זמנים פנויים..." />
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-text-muted bg-surface rounded-lg p-3">
                <Clock className="h-4 w-4" />
                אין זמנים פנויים בתאריך זה
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.startTime}
                    type="button"
                    onClick={() => setNewStartTime(slot.startTime)}
                    dir="ltr"
                    className={cn(
                      "py-2 px-2 rounded-lg text-sm font-medium transition-all border",
                      newStartTime === slot.startTime
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-text border-border hover:border-primary hover:text-primary"
                    )}
                  >
                    {slot.startTime}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <Input
          label="שם הלקוח"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="שם מלא"
        />
        <Input
          label="טלפון"
          type="tel"
          value={newPhone}
          onChange={(e) => setNewPhone(e.target.value)}
          placeholder="050-0000000"
        />
        <Input
          label="אימייל (אופציונלי)"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="name@example.com"
        />
        <Textarea
          label="הערות (אופציונלי)"
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          rows={2}
        />

        <Button
          fullWidth
          onClick={createBooking}
          isLoading={isCreating}
          disabled={!newStartTime}
        >
          קביעת תור
        </Button>
      </div>
    </Modal>
  );
}
