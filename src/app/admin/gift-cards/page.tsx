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
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

interface GiftCardItem {
  id: string;
  recipientName: string;
  senderName: string | null;
  serviceName: string;
  message: string;
  code: string;
  isRedeemed: boolean;
  redeemedAt: string | null;
  createdAt: string;
}

export default function AdminGiftCardsPage() {
  const [giftCards, setGiftCards] = useState<GiftCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GiftCardItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [message, setMessage] = useState("");

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
        body: JSON.stringify({ recipientName, senderName, serviceName, message }),
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || "שגיאה ביצירת הגיפט קארד");
        return;
      }

      toast.success("הגיפט קארד נוצר בהצלחה!");
      setIsModalOpen(false);
      fetchGiftCards();
    } catch {
      toast.error("שגיאת שרת");
    } finally {
      setIsSubmitting(false);
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

  const copyLink = async (card: GiftCardItem) => {
    const url = `${window.location.origin}/gift-card/${card.code}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(card.id);
    toast.success("הקישור הועתק!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("he-IL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

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
          {giftCards.map((card) => (
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
                <Badge variant={card.isRedeemed ? "error" : "success"}>
                  {card.isRedeemed ? "מומש" : "פעיל"}
                </Badge>
              </div>

              <div className="bg-surface rounded-lg px-3 py-2 mb-3">
                <p className="text-sm font-medium text-primary-dark">
                  {card.serviceName}
                </p>
              </div>

              <p className="text-sm text-text-secondary line-clamp-2 mb-3 italic">
                &ldquo;{card.message}&rdquo;
              </p>

              <p className="text-xs text-text-muted mb-4">
                נוצר: {formatDate(card.createdAt)}
                {card.redeemedAt && ` | מומש: ${formatDate(card.redeemedAt)}`}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2 border-t border-border pt-3">
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
                <button
                  onClick={() => setDeleteTarget(card)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors mr-auto"
                >
                  <Trash2 className="h-4 w-4" />
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
        <div className="space-y-4">
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
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              ביטול
            </Button>
            <Button size="sm" isLoading={isSubmitting} onClick={handleCreate}>
              <Gift className="h-4 w-4" />
              יצירת גיפט קארד
            </Button>
          </div>
        </div>
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
