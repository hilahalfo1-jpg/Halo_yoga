"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Star, Trash2, CheckCircle, XCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";

interface ReviewRow {
  id: string;
  customerName: string;
  rating: number;
  content: string;
  isApproved: boolean;
  createdAt: string;
}

const FILTER_OPTIONS = [
  { value: "ALL", label: "הכל" },
  { value: "pending", label: "ממתין לאישור" },
  { value: "approved", label: "מאושר" },
];

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [deleteTarget, setDeleteTarget] = useState<ReviewRow | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "ALL") params.set("filter", filter);
      const res = await fetch(`/api/admin/reviews?${params}`);
      const result = await res.json();
      setReviews(result.data || []);
    } catch {
      toast.error("שגיאה בטעינת המלצות");
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setIsLoading(true);
    fetchReviews();
  }, [fetchReviews]);

  const toggleApproval = async (id: string, currentlyApproved: boolean) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: !currentlyApproved }),
      });
      if (res.ok) {
        toast.success(currentlyApproved ? "ההמלצה הוסרה מהאתר" : "ההמלצה אושרה");
        fetchReviews();
      }
    } catch {
      toast.error("שגיאה בעדכון");
    }
  };

  const deleteReview = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/reviews/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("ההמלצה נמחקה");
        setDeleteTarget(null);
        fetchReviews();
      }
    } catch {
      toast.error("שגיאה במחיקה");
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5" dir="ltr">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner label="טוען המלצות..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">ניהול המלצות</h1>
        <div className="w-48">
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={FILTER_OPTIONS}
          />
        </div>
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          icon={<Star className="h-12 w-12" />}
          title="אין המלצות"
          description="כשלקוחות ישלחו המלצות, הן יופיעו כאן"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {reviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-text">
                      {review.customerName}
                    </h3>
                    <p className="text-xs text-text-muted">
                      {formatDate(review.createdAt)}
                    </p>
                  </div>
                  <Badge variant={review.isApproved ? "success" : "warning"}>
                    {review.isApproved ? "מאושר" : "ממתין"}
                  </Badge>
                </div>

                {renderStars(review.rating)}

                <p className="text-sm text-text leading-relaxed">
                  {review.content}
                </p>

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() =>
                      toggleApproval(review.id, review.isApproved)
                    }
                    className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                      review.isApproved
                        ? "text-warning hover:bg-warning/10"
                        : "text-success hover:bg-success/10"
                    }`}
                  >
                    {review.isApproved ? (
                      <>
                        <XCircle className="h-3.5 w-3.5" />
                        הסרת אישור
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-3.5 w-3.5" />
                        אישור
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(review)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-error hover:bg-error/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    מחיקה
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="מחיקת המלצה"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text">
            האם למחוק את ההמלצה של{" "}
            <strong>{deleteTarget?.customerName}</strong>? פעולה זו אינה הפיכה.
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
              onClick={deleteReview}
            >
              מחיקה
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
