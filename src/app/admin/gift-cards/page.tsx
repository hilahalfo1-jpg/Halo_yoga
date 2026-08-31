"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Gift,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { formatDate, formatDateTime } from "@/lib/utils";
import { waMeLink } from "@/lib/phone";
import { waText } from "@/lib/wa-messages";

interface GiftCardItem {
  id: string;
  recipientName: string;
  senderName: string | null;
  serviceName: string;
  message: string;
  code: string;
  template: string;
  isRedeemed: boolean;
  redeemedAt: string | null;
  status: string;
  expiresAt: string | null;
  purchaserName: string | null;
  purchaserPhone: string | null;
  purchaserEmail: string | null;
  bookingId: string | null;
  booking: { id: string; startAt: string; status: string } | null;
  createdAt: string;
  // WhatsApp send stamp — undefined until WA-A's schema lands
  waApprovedSentAt?: string | null;
}

const TEMPLATE_OPTIONS = [
  { value: "botanical", label: "בוטני (ברירת מחדל)", swatch: "#dfe6d6" },
  { value: "minimal", label: "מינימליסטי", swatch: "#f0efec" },
  { value: "festive", label: "חגיגי / יום הולדת", swatch: "#ffd7e3" },
  { value: "gold", label: "זהב / יוקרתי", swatch: "#1c1812" },
  { value: "romantic", label: "רומנטי", swatch: "#f7d2db" },
] as const;

const TEMPLATE_LABELS: Record<string, string> = Object.fromEntries(
  TEMPLATE_OPTIONS.map((t) => [t.value, t.label])
);

export default function AdminGiftCardsPage() {
  const [giftCards, setGiftCards] = useState<GiftCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GiftCardItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareCard, setShareCard] = useState<GiftCardItem | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareContext, setShareContext] = useState<"created" | "approved">("created");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Form state
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [message, setMessage] = useState("");
  const [template, setTemplate] = useState("botanical");

  const fetchGiftCards = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/gift-cards");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setGiftCards(json.data);
    } catch {
      toast.error("שגיאה בטעינת הגיפט קארדים");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGiftCards();
  }, [fetchGiftCards]);

  const openCreateModal = () => {
    setRecipientName("");
    setSenderName("");
    setServiceName("");
    setMessage("");
    setTemplate("botanical");
    setIsModalOpen(true);
  };

  const handleCreate = async () => {
    if (!recipientName || !serviceName || !message) {
      toast.error("יש למלא את כל השדות הנדרשים");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientName, senderName, serviceName, message, template }),
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || "שגיאה ביצירת הגיפט קארד");
        return;
      }

      const json = await res.json();
      toast.success("הגיפט קארד נוצר בהצלחה!");
      setIsModalOpen(false);
      await fetchGiftCards();
      // Show share popup with the new card
      if (json.data) {
        setShareCard(json.data);
        setShareCopied(false);
        setShareContext("created");
      }
    } catch {
      toast.error("שגיאת שרת");
    } finally {
      setIsSubmitting(false);
    }
  };

  const approveCard = async (card: GiftCardItem) => {
    setApprovingId(card.id);
    try {
      const res = await fetch(`/api/admin/gift-cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      toast.success("הגיפט קארד אושר!");
      await fetchGiftCards();
      // Auto-open the share modal so Hila can send the link right away
      if (json.data) {
        setShareCard(json.data);
        setShareCopied(false);
        setShareContext("approved");
      }
    } catch {
      toast.error("שגיאה באישור הגיפט קארד");
    } finally {
      setApprovingId(null);
    }
  };

  const toggleRedeemed = async (card: GiftCardItem) => {
    try {
      const res = await fetch(`/api/admin/gift-cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRedeemed: !card.isRedeemed }),
      });
      if (!res.ok) throw new Error();
      toast.success(card.isRedeemed ? "סומן כלא מומש" : "סומן כמומש");
      fetchGiftCards();
    } catch {
      toast.error("שגיאה בעדכון");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/gift-cards/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("הגיפט קארד נמחק");
      setDeleteTarget(null);
      fetchGiftCards();
    } catch {
      toast.error("שגיאה במחיקה");
    } finally {
      setIsDeleting(false);
    }
  };

  const openWhatsApp = async (card: GiftCardItem) => {
    if (!card.purchaserPhone) return;
    // Popup-blocker rule: open the tab SYNCHRONOUSLY, then point it at wa.me.
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("הדפדפן חסם את פתיחת וואטסאפ — יש לאפשר חלונות קופצים");
      return;
    }
    const text = waText("giftApproved", {
      firstName: (card.purchaserName || "").trim().split(/\s+/)[0] || "",
      cardUrl: `${window.location.origin}/gift-card/${card.code}`,
    });
    win.location.href = `${waMeLink(card.purchaserPhone)}?text=${encodeURIComponent(text)}`;
    // Stamp the send via the waMark PATCH contract. A 400 means the server
    // doesn't support waMark yet — the message still opened, so stay silent.
    try {
      const res = await fetch(`/api/admin/gift-cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waMark: "giftApproved" }),
      });
      if (res.ok) fetchGiftCards();
    } catch {
      toast.error("ההודעה נפתחה, אך סימון השליחה נכשל");
    }
  };

  const copyLink = async (card: GiftCardItem) => {
    const url = `${window.location.origin}/gift-card/${card.code}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(card.id);
    toast.success("הקישור הועתק!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isExpired = (card: GiftCardItem) =>
    card.status !== "PENDING" &&
    !card.isRedeemed &&
    !!card.expiresAt &&
    new Date(card.expiresAt) < new Date();

  // PENDING orders first (stable sort keeps newest-first within each group)
  const sortedCards = [...giftCards].sort(
    (a, b) =>
      (a.status === "PENDING" ? 0 : 1) - (b.status === "PENDING" ? 0 : 1)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner label="טוען גיפט קארדים..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">גיפט קארדים</h1>
        <Button size="sm" onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          גיפט קארד חדש
        </Button>
      </div>

      {/* List */}
      {giftCards.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Gift className="h-12 w-12" strokeWidth={1.5} />}
            title="אין גיפט קארדים"
            description="צרו את הגיפט קארד הראשון כדי להתחיל"
            action={
              <Button size="sm" onClick={openCreateModal}>
                <Plus className="h-4 w-4" />
                גיפט קארד חדש
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedCards.map((card) => (
            <Card key={card.id} className="relative">
              {/* Status badge */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-text text-lg">
                    {card.recipientName}
                  </h3>
                  {card.senderName && (
                    <p className="text-sm text-text-muted">
                      מאת: {card.senderName}
                    </p>
                  )}
                </div>
                {card.status === "PENDING" ? (
                  <Badge variant="warning">ממתין לאישור</Badge>
                ) : card.isRedeemed ? (
                  <Badge variant="error">מומש</Badge>
                ) : isExpired(card) ? (
                  <Badge variant="error">פג תוקף</Badge>
                ) : (
                  <Badge variant="success">פעיל</Badge>
                )}
              </div>

              <div className="bg-surface rounded-lg px-3 py-2 mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-primary-dark">
                  {card.serviceName}
                </p>
                <span className="text-xs text-text-muted whitespace-nowrap">
                  עיצוב: {TEMPLATE_LABELS[card.template] ?? card.template}
                </span>
              </div>

              <p className="text-sm text-text-muted line-clamp-2 mb-3 italic">
                &ldquo;{card.message}&rdquo;
              </p>

              {card.status === "PENDING" && (
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mb-3 space-y-1 text-sm text-right">
                  <p className="font-medium text-text">פרטי הרוכש/ת:</p>
                  {card.purchaserName && (
                    <p className="text-text">{card.purchaserName}</p>
                  )}
                  {card.purchaserPhone && (
                    <a
                      href={`tel:${card.purchaserPhone}`}
                      dir="ltr"
                      className="inline-flex items-center min-h-[40px] text-primary font-medium underline underline-offset-2"
                    >
                      {card.purchaserPhone}
                    </a>
                  )}
                  {card.purchaserEmail && (
                    <p className="text-text-muted break-all">
                      {card.purchaserEmail}
                    </p>
                  )}
                  {card.booking && (
                    <p className="text-text">
                      מועד מבוקש: {formatDateTime(card.booking.startAt)}
                    </p>
                  )}
                  {card.bookingId && (
                    <p className="text-xs text-text-muted">
                      💡 יש גם הזמנה מקושרת בטאב ההזמנות — אשרי אותה בנפרד
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-text-muted mb-4">
                נוצר: {formatDate(card.createdAt)}
                {card.status === "PENDING"
                  ? " | תוקף: שנה מיום האישור"
                  : card.expiresAt &&
                    ` | בתוקף עד: ${formatDate(card.expiresAt)}`}
                {card.redeemedAt && ` | מומש: ${formatDate(card.redeemedAt)}`}
              </p>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                {card.status === "PENDING" ? (
                  <Button
                    size="sm"
                    onClick={() => approveCard(card)}
                    isLoading={approvingId === card.id}
                    className="flex-1 min-h-[44px]"
                  >
                    <Gift className="h-4 w-4" />
                    אשר גיפט קארד
                  </Button>
                ) : (
                  <>
                    <button
                      onClick={() => copyLink(card)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      {copiedId === card.id ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copiedId === card.id ? "הועתק!" : "העתק קישור"}
                    </button>
                    {card.status === "ACTIVE" && card.purchaserPhone && !card.isRedeemed && !isExpired(card) && (
                      <button
                        onClick={() => openWhatsApp(card)}
                        className="relative flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-lg text-sm font-medium bg-success/10 text-success hover:bg-success/20 transition-colors"
                        title={
                          card.waApprovedSentAt
                            ? "הודעת וואטסאפ נשלחה"
                            : "שליחת הגיפט קארד לרוכש/ת בוואטסאפ"
                        }
                      >
                        <MessageCircle className="h-4 w-4" />
                        וואטסאפ
                        {card.waApprovedSentAt && (
                          <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-success text-white flex items-center justify-center">
                            <Check className="h-2.5 w-2.5" strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    )}
                    <a
                      href={`/gift-card/${card.code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-muted hover:bg-surface transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      צפייה
                    </a>
                    <button
                      onClick={() => toggleRedeemed(card)}
                      className="px-3 py-1.5 rounded-lg text-sm text-text-muted hover:bg-surface transition-colors"
                    >
                      {card.isRedeemed ? "סמן כפעיל" : "סמן כמומש"}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setDeleteTarget(card)}
                  className="p-2.5 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors ms-auto"
                  aria-label="מחיקת גיפט קארד"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="גיפט קארד חדש"
        size="md"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-4">
          <Input
            label="שם המקבל/ת *"
            placeholder="למי מיועד הגיפט קארד?"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
          />
          <Input
            label="שם השולח/ת"
            placeholder="מי שולח את הגיפט קארד? (אופציונלי)"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
          />
          <Input
            label="סוג השירות / טיפול *"
            placeholder="למשל: עיסוי שוודי, שיעור יוגה פרטי"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
          />
          <Textarea
            label="הודעת ברכה *"
            placeholder="כתבו הודעה אישית שתופיע על הגיפט קארד..."
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          {/* Template picker */}
          <div>
            <label className="block text-sm font-medium text-text mb-2 text-right">
              עיצוב הגיפט קארד
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TEMPLATE_OPTIONS.map((opt) => {
                const selected = template === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTemplate(opt.value)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-right transition-colors ${
                      selected
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border hover:bg-surface"
                    }`}
                  >
                    <span
                      className="h-6 w-6 flex-shrink-0 rounded-md border border-black/10"
                      style={{ backgroundColor: opt.swatch }}
                      aria-hidden="true"
                    />
                    <span className="text-sm text-text leading-tight">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsModalOpen(false)}
            >
              ביטול
            </Button>
            <Button size="sm" isLoading={isSubmitting} type="submit">
              <Gift className="h-4 w-4" />
              יצירת גיפט קארד
            </Button>
          </div>
        </form>
      </Modal>

      {/* Share Modal (shown after creation) */}
      <Modal
        isOpen={!!shareCard}
        onClose={() => setShareCard(null)}
        title={
          shareContext === "approved"
            ? "הגיפט קארד אושר!"
            : "הגיפט קארד נוצר בהצלחה!"
        }
        size="sm"
      >
        {shareCard && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-3">
                <Gift className="h-8 w-8 text-success" />
              </div>
              <p className="text-text-secondary text-sm">
                גיפט קארד עבור <strong>{shareCard.recipientName}</strong>
              </p>
            </div>

            <div className="bg-surface rounded-lg p-3">
              <p className="text-xs text-text-muted mb-1">קישור לשיתוף:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/gift-card/${shareCard.code}`}
                  className="flex-1 text-base sm:text-sm bg-white border border-border rounded-lg px-3 py-2 text-left"
                  dir="ltr"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  size="sm"
                  variant={shareCopied ? "outline" : "primary"}
                  onClick={async () => {
                    const url = `${window.location.origin}/gift-card/${shareCard.code}`;
                    await navigator.clipboard.writeText(url);
                    setShareCopied(true);
                    toast.success("הקישור הועתק!");
                    setTimeout(() => setShareCopied(false), 3000);
                  }}
                  className="flex-shrink-0"
                >
                  {shareCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {shareCopied ? "הועתק!" : "העתק"}
                </Button>
              </div>
            </div>

            <p className="text-xs text-text-muted text-center">
              שלחו את הקישור ללקוח/ה כדי שיוכלו לצפות בגיפט קארד
            </p>

            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShareCard(null)}
              >
                סגור
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="מחיקת גיפט קארד"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text">
            האם למחוק את הגיפט קארד עבור{" "}
            <span className="font-semibold">
              &quot;{deleteTarget?.recipientName}&quot;
            </span>
            ?
          </p>
          {deleteTarget?.bookingId &&
            deleteTarget.booking?.status === "PENDING" && (
              <p className="text-sm text-text-muted">
                ההזמנה המקושרת תידחה והמועד יתפנה.
              </p>
            )}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              ביטול
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              onClick={confirmDelete}
            >
              מחיקה
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
