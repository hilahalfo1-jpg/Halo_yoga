"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ShieldBan, Trash2, Plus, Phone, Mail } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

interface BlacklistItem {
  id: string;
  identifier: string;
  type: string;
  reason: string | null;
  createdAt: string;
}

export default function BlacklistPage() {
  const [items, setItems] = useState<BlacklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BlacklistItem | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/blacklist");
      const data = await res.json();
      setItems(data.data || []);
    } catch {
      toast.error("שגיאה בטעינה");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = async () => {
    if (!identifier.trim()) {
      toast.error("יש להזין טלפון או אימייל");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), reason: reason.trim() || null }),
      });
      if (res.ok) {
        toast.success("נוסף לרשימה");
        setIdentifier("");
        setReason("");
        setShowForm(false);
        fetchItems();
      } else {
        const err = await res.json();
        toast.error(err.error || "שגיאה");
      }
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch("/api/admin/blacklist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (res.ok) {
        toast.success("הוסר מהרשימה");
        setDeleteTarget(null);
        fetchItems();
      }
    } catch {
      toast.error("שגיאה במחיקה");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner label="טוען רשימת חסומים..." />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">ניהול חסומים</h1>
          <p className="text-sm text-text-muted mt-1">
            משתמשים חסומים יוכלו &quot;לקבוע תור&quot; אבל ההזמנה לא תישמר בפועל
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant="primary" size="sm">
          <Plus className="h-4 w-4" />
          הוסף חסימה
        </Button>
      </div>

      {showForm && (
        <Card className="p-4 space-y-3 border-2 border-primary/30">
          <Input
            label="טלפון או אימייל"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="050-1234567 או example@email.com"
            dir="ltr"
          />
          <Input
            label="סיבה (אופציונלי)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="סיבת החסימה..."
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
              ביטול
            </Button>
            <Button variant="primary" size="sm" onClick={addItem} isLoading={saving}>
              הוסף
            </Button>
          </div>
        </Card>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={<ShieldBan className="h-12 w-12 text-text-muted" />}
          title="אין חסומים"
          description="הרשימה ריקה. ניתן להוסיף טלפון או אימייל לחסימה שקטה."
        />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {item.type === "EMAIL" ? (
                  <Mail className="h-5 w-5 text-primary" />
                ) : (
                  <Phone className="h-5 w-5 text-primary" />
                )}
                <div>
                  <p className="font-medium text-text" dir="ltr">{item.identifier}</p>
                  {item.reason && (
                    <p className="text-xs text-text-muted">{item.reason}</p>
                  )}
                  <p className="text-xs text-text-muted">
                    {new Date(item.createdAt).toLocaleDateString("he-IL")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteTarget(item)}
                className="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                title="הסרת חסימה"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="הסרת חסימה"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text">
            האם להסיר את החסימה על{" "}
            <strong dir="ltr">{deleteTarget?.identifier}</strong>?
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
              onClick={removeItem}
            >
              הסרת חסימה
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
