"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { MessageSquare, Phone, Mail, Trash2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Textarea from "@/components/ui/Textarea";
import { formatDateTime, formatPhone } from "@/lib/utils";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from "@/lib/constants";

interface LeadRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  subject: string;
  message: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
}

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "הכל" },
  { value: "NEW", label: "חדש" },
  { value: "IN_PROGRESS", label: "בטיפול" },
  { value: "CLOSED", label: "סגור" },
];

const STATUS_CHANGE_OPTIONS = [
  { value: "NEW", label: "חדש" },
  { value: "IN_PROGRESS", label: "בטיפול" },
  { value: "CLOSED", label: "סגור" },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LeadRow | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/leads?${params}`);
      const result = await res.json();
      setLeads(result.data || []);
    } catch {
      toast.error("שגיאה בטעינת פניות");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setIsLoading(true);
    fetchLeads();
  }, [fetchLeads]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success("הסטטוס עודכן");
        fetchLeads();
      }
    } catch {
      toast.error("שגיאה בעדכון");
    }
  };

  const saveAdminNotes = async () => {
    if (!selectedLead) return;
    try {
      const res = await fetch(`/api/admin/leads/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes }),
      });
      if (res.ok) {
        toast.success("ההערה נשמרה");
        setSelectedLead(null);
        fetchLeads();
      }
    } catch {
      toast.error("שגיאה בשמירה");
    }
  };

  const deleteLead = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/leads/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("הפנייה נמחקה");
        setDeleteTarget(null);
        fetchLeads();
      }
    } catch {
      toast.error("שגיאה במחיקה");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner label="טוען פניות..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">ניהול פניות</h1>
        <div className="w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>
      </div>

      {leads.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-12 w-12" />}
          title="אין פניות"
          description="כשלקוחות ישלחו פניות, הן יופיעו כאן"
        />
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => (
            <Card key={lead.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-text">{lead.name}</h3>
                    <Badge className={LEAD_STATUS_COLORS[lead.status]}>
                      {LEAD_STATUS_LABELS[lead.status]}
                    </Badge>
                    <span className="text-xs text-text-muted">
                      {formatDateTime(lead.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-secondary hover:underline flex items-center gap-1"
                      dir="ltr"
                    >
                      <Phone className="h-3 w-3" />
                      {formatPhone(lead.phone)}
                    </a>
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-secondary hover:underline flex items-center gap-1"
                        dir="ltr"
                      >
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </a>
                    )}
                  </div>

                  {lead.subject && (
                    <p className="text-sm text-text-muted">
                      נושא: {lead.subject}
                    </p>
                  )}

                  <p className="text-sm text-text bg-surface rounded-lg p-3">
                    {lead.message}
                  </p>

                  {lead.adminNotes && (
                    <div className="bg-primary-light/30 rounded-lg p-3">
                      <p className="text-xs text-text-muted mb-1">
                        הערות אדמין:
                      </p>
                      <p className="text-sm text-text">{lead.adminNotes}</p>
                    </div>
                  )}
                </div>

                <div className="flex sm:flex-col items-center gap-2">
                  <select
                    value={lead.status}
                    onChange={(e) => updateStatus(lead.id, e.target.value)}
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
                      setSelectedLead(lead);
                      setAdminNotes(lead.adminNotes || "");
                    }}
                    className="p-1.5 rounded text-text-muted hover:text-text hover:bg-surface"
                    title="הערות אדמין"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(lead)}
                    className="p-1.5 rounded text-text-muted hover:text-error hover:bg-error/10"
                    title="מחק פנייה"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Admin Notes Modal */}
      <Modal
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        title={`הערות — ${selectedLead?.name || ""}`}
        size="sm"
      >
        <div className="space-y-4">
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
        title="מחיקת פנייה"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text">
            האם למחוק את הפנייה של{" "}
            <strong>{deleteTarget?.name}</strong>? פעולה זו אינה הפיכה.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setDeleteTarget(null)}
            >
              ביטול
            </Button>
            <Button
              fullWidth
              onClick={deleteLead}
              className="bg-error hover:bg-error/90 text-white"
            >
              מחיקה
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
