"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Phone, Mail, Search, Calendar, MessageCircle, Users, Download, ExternalLink, CalendarPlus, Pencil, Trash2, UserPlus, StickyNote } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ManualBookingModal from "@/components/admin/ManualBookingModal";
import { formatDateShort, formatPhone } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
import { waMeLink } from "@/lib/phone";
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from "@/lib/constants";

interface Contact {
  identifier: string;
  name: string;
  phone: string;
  email: string | null;
  sources: ("booking" | "attempt")[];
  bookingCount: number;
  attemptCount: number;
  lastInteraction: string;
  lastBookingStatus: string | null;
  lastBookingId: string | null;
  lastAttemptReason: string | null;
  notes: string[];
  contactId: string | null;
  contactNotes: string | null;
}

interface ContactForm {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

const EMPTY_FORM: ContactForm = { name: "", phone: "", email: "", notes: "" };

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bookingContact, setBookingContact] = useState<Contact | null>(null);
  const [editTarget, setEditTarget] = useState<Contact | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/contacts");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setContacts(json.data);
    } catch {
      toast.error("שגיאה בטעינת אנשי קשר");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.trim().toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email || "").toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const exportCSV = () => {
    const headers = ["שם", "טלפון", "אימייל", "הזמנות", "ניסיונות", "אינטראקציה אחרונה", "סטטוס הזמנה אחרונה"];
    const rows = contacts.map((c) => [
      c.name,
      c.phone,
      c.email || "",
      c.bookingCount,
      c.attemptCount,
      formatDateShort(c.lastInteraction),
      c.lastBookingStatus ? BOOKING_STATUS_LABELS[c.lastBookingStatus] || c.lastBookingStatus : "",
    ]);
    downloadCsv(`contacts-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  // ─── Add / Edit ──────────────────────────────────────
  const openAdd = () => {
    setForm(EMPTY_FORM);
    setIsAddOpen(true);
  };

  const openEdit = (c: Contact) => {
    setForm({
      name: c.name,
      phone: c.phone,
      email: c.email || "",
      notes: c.contactNotes || "",
    });
    setEditTarget(c);
  };

  const closeEditModal = () => {
    setEditTarget(null);
    setIsAddOpen(false);
  };

  // Email-only derived cards have no phone — allow an empty phone field so
  // they can still be edited (the key then derives from the email server-side)
  const isEmailOnlyCard =
    !!editTarget && !editTarget.phone.trim() && !!editTarget.email;

  const saveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        notes: form.notes.trim(),
      };
      // Editing a derived-only card (no Contact row yet) creates the overlay row via POST
      const isPatch = !!editTarget?.contactId;
      const res = await fetch("/api/admin/contacts", {
        method: isPatch ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isPatch ? { id: editTarget?.contactId, ...payload } : payload
        ),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "שגיאה בשמירת איש הקשר");
        return;
      }
      toast.success(editTarget ? "איש הקשר עודכן" : "איש הקשר נוסף");
      closeEditModal();
      fetchContacts();
    } catch {
      toast.error("שגיאת שרת");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Delete (hide) ───────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      let contactId = deleteTarget.contactId;
      if (!contactId) {
        // Derived-only contact: create the overlay row first, then hide it
        const createRes = await fetch("/api/admin/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: deleteTarget.name,
            phone: deleteTarget.phone,
            email: deleteTarget.email || "",
          }),
        });
        const createJson = await createRes.json();
        if (!createRes.ok) {
          toast.error(createJson.error || "שגיאה בהסתרת איש הקשר");
          return;
        }
        contactId = createJson.data.id as string;
      }
      const res = await fetch(
        `/api/admin/contacts?id=${encodeURIComponent(contactId)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "שגיאה בהסתרת איש הקשר");
        return;
      }
      toast.success("איש הקשר הוסר מהרשימה");
      setDeleteTarget(null);
      fetchContacts();
    } catch {
      toast.error("שגיאת שרת");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner label="טוען אנשי קשר..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text">אנשי קשר</h1>
          <p className="text-text-muted text-sm mt-1">
            כל מי שקבע תור או ניסה לקבוע — רשימת הלקוחות שלך. ({contacts.length} אנשים)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" className="min-h-[40px]" onClick={openAdd}>
            <UserPlus className="h-4 w-4" />
            הוסף איש קשר
          </Button>
          {contacts.length > 0 && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-3 py-2 min-h-[40px] text-sm rounded-lg border border-border hover:bg-surface text-text"
            >
              <Download className="h-4 w-4" />
              ייצוא ל-CSV
            </button>
          )}
        </div>
      </div>

      {contacts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="h-12 w-12" strokeWidth={1.5} />}
            title="אין אנשי קשר"
            description="ברגע שמישהו יקבע תור או ישלח פנייה הוא יופיע כאן"
          />
        </Card>
      ) : (
        <>
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <Input
              type="search"
              placeholder="חיפוש לפי שם, טלפון, אימייל"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>

          {filtered.length === 0 ? (
            <Card>
              <EmptyState title="לא נמצאו תוצאות" description="נסו חיפוש אחר" />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((c) => (
                <Card key={c.identifier} className="flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text truncate">{c.name}</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {formatDateShort(c.lastInteraction)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {c.bookingCount > 0 && (
                        <Badge variant="default">
                          {c.bookingCount} {c.bookingCount === 1 ? "הזמנה" : "הזמנות"}
                        </Badge>
                      )}
                      {c.attemptCount > 0 && (
                        <Badge variant="warning">
                          {c.attemptCount} {c.attemptCount === 1 ? "ניסיון" : "ניסיונות"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Last booking status */}
                  {c.lastBookingStatus && (
                    <div className="mb-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs border ${
                          BOOKING_STATUS_COLORS[c.lastBookingStatus] || ""
                        }`}
                      >
                        {BOOKING_STATUS_LABELS[c.lastBookingStatus] || c.lastBookingStatus}
                      </span>
                    </div>
                  )}

                  {/* Failed attempt reason */}
                  {!c.lastBookingStatus && c.lastAttemptReason && (
                    <div className="mb-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs border bg-warning/10 text-warning border-warning/20">
                        ניסה לקבוע — {c.lastAttemptReason}
                      </span>
                    </div>
                  )}

                  {/* Contact actions */}
                  <div className="space-y-2 mb-3">
                    <a
                      href={`tel:${c.phone.replace(/-/g, "")}`}
                      className="flex items-center gap-2 text-sm text-text hover:text-primary transition-colors"
                    >
                      <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                      <span dir="ltr">{formatPhone(c.phone)}</span>
                    </a>
                    <a
                      href={waMeLink(c.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-text hover:text-success transition-colors"
                    >
                      <MessageCircle className="h-4 w-4 text-success flex-shrink-0" />
                      <span>WhatsApp</span>
                      <ExternalLink className="h-3 w-3 text-text-muted" />
                    </a>
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="flex items-center gap-2 text-sm text-text hover:text-info transition-colors"
                      >
                        <Mail className="h-4 w-4 text-info flex-shrink-0" />
                        <span dir="ltr" className="truncate">{c.email}</span>
                      </a>
                    )}
                  </div>

                  {/* Contact card notes (editable overlay) */}
                  {c.contactNotes && (
                    <div className="flex items-start gap-2 mb-3 text-xs text-text-muted">
                      <StickyNote className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <p className="whitespace-pre-line line-clamp-3">{c.contactNotes}</p>
                    </div>
                  )}

                  {/* Quick links to source records */}
                  <div className="mt-auto pt-3 border-t border-border flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setBookingContact(c)}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium transition-colors"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      קבע תור
                    </button>
                    {c.lastBookingId && (
                      <Link
                        href="/admin/bookings"
                        className="inline-flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface transition-colors"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        להזמנות
                      </Link>
                    )}
                    <div className="ms-auto flex items-center">
                      <button
                        onClick={() => openEdit(c)}
                        aria-label="עריכת איש קשר"
                        className="p-2.5 rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        aria-label="הסתרת איש קשר"
                        className="p-2.5 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <ManualBookingModal
        open={!!bookingContact}
        onClose={() => setBookingContact(null)}
        prefill={{
          name: bookingContact?.name,
          phone: bookingContact?.phone,
          email: bookingContact?.email ?? undefined,
        }}
        onSuccess={fetchContacts}
      />

      {/* Add / Edit contact modal */}
      <Modal
        isOpen={isAddOpen || !!editTarget}
        onClose={closeEditModal}
        title={editTarget ? "עריכת איש קשר" : "הוספת איש קשר"}
      >
        <form onSubmit={saveContact} className="space-y-4">
          <Input
            label="שם"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            minLength={2}
          />
          <Input
            label="טלפון"
            type="tel"
            inputMode="tel"
            placeholder="05X-XXXXXXX"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            helperText={
              editTarget
                ? "שינוי טלפון מנתק את ההיסטוריה הקיימת ומקשר את הכרטיס להיסטוריה של המספר החדש"
                : undefined
            }
            required={!isEmailOnlyCard}
          />
          <Input
            label="אימייל"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Textarea
            label="הערות"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            maxLength={500}
          />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-[40px]"
              onClick={closeEditModal}
            >
              ביטול
            </Button>
            <Button type="submit" size="sm" className="min-h-[40px]" isLoading={isSaving}>
              שמירה
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete (hide) confirmation modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="הסתרת איש קשר"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text">
            האם להסיר את{" "}
            <span className="font-semibold">&quot;{deleteTarget?.name}&quot;</span>{" "}
            מהרשימה?
          </p>
          <p className="text-sm text-text-muted">
            איש הקשר יוסתר מהרשימה; היסטוריית ההזמנות נשמרת.
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-[40px]"
              onClick={() => setDeleteTarget(null)}
            >
              ביטול
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="min-h-[40px]"
              isLoading={isDeleting}
              onClick={confirmDelete}
            >
              הסתרה
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
