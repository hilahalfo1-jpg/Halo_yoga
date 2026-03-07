"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Layers,
  Upload,
  X,
} from "lucide-react";
import type { ServiceItem } from "@/types";
import { serviceSchema, type ServiceFormData } from "@/lib/validations";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatPrice, formatDuration } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

const categoryOptions = [
  { value: "MASSAGE", label: "עיסויים" },
  { value: "YOGA", label: "יוגה" },
  { value: "PILATES", label: "פילאטיס" },
];

export default function AdminServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      slug: "",
      shortDesc: "",
      description: "",
      category: "MASSAGE",
      duration: 60,
      price: 0,
      image: "",
      suitableFor: "",
      isActive: true,
      sortOrder: 0,
    },
  });

  // ─── Fetch Services ──────────────────────────────────
  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/services");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setServices(json.data);
    } catch {
      toast.error("שגיאה בטעינת השירותים");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // ─── Open Create Modal ───────────────────────────────
  const openCreateModal = () => {
    setEditingService(null);
    reset({
      name: "",
      slug: "",
      shortDesc: "",
      description: "",
      category: "MASSAGE",
      duration: 60,
      price: 0,
      image: "",
      suitableFor: "",
      isActive: true,
      sortOrder: 0,
      homeVisitSurcharge: null,
    });
    setImagePreview(null);
    setIsModalOpen(true);
  };

  // ─── Open Edit Modal ─────────────────────────────────
  const openEditModal = (service: ServiceItem) => {
    setEditingService(service);
    setImagePreview(service.image || null);
    reset({
      name: service.name,
      slug: service.slug,
      shortDesc: service.shortDesc,
      description: service.description,
      category: service.category,
      duration: service.duration,
      price: service.price,
      image: service.image || "",
      suitableFor: service.suitableFor || "",
      isActive: service.isActive,
      sortOrder: service.sortOrder,
      homeVisitSurcharge: service.homeVisitSurcharge ?? null,
    });
    setIsModalOpen(true);
  };

  // ─── Upload Image ───────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "שגיאה בהעלאת התמונה");
        return;
      }
      setImagePreview(json.path);
      // Update form value
      const event = { target: { name: "image", value: json.path } };
      register("image").onChange(event as never);
    } catch {
      toast.error("שגיאה בהעלאת התמונה");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── Close Modal ─────────────────────────────────────
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
    setImagePreview(null);
    reset();
  };

  // ─── Submit (Create / Update) ────────────────────────
  const onSubmit = async (data: ServiceFormData) => {
    setIsSubmitting(true);
    try {
      const url = editingService
        ? `/api/admin/services/${editingService.id}`
        : "/api/admin/services";
      const method = editingService ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "שגיאה בשמירת השירות");
        return;
      }

      toast.success(editingService ? "השירות עודכן בהצלחה" : "השירות נוצר בהצלחה");
      closeModal();
      fetchServices();
    } catch {
      toast.error("שגיאת שרת, אנא נסו שוב");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Toggle Active ───────────────────────────────────
  const toggleActive = async (service: ServiceItem) => {
    setIsToggling(service.id);
    try {
      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !service.isActive }),
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || "שגיאה בעדכון הסטטוס");
        return;
      }

      toast.success(
        service.isActive ? "השירות הושבת" : "השירות הופעל"
      );
      fetchServices();
    } catch {
      toast.error("שגיאת שרת");
    } finally {
      setIsToggling(null);
    }
  };

  // ─── Delete ──────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/services/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "שגיאה במחיקת השירות");
        return;
      }

      toast.success("השירות נמחק בהצלחה");
      setDeleteTarget(null);
      fetchServices();
    } catch {
      toast.error("שגיאת שרת");
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Loading ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner label="טוען שירותים..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">ניהול שירותים</h1>
        <Button size="sm" onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          שירות חדש
        </Button>
      </div>

      {/* Services Table */}
      {services.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Layers className="h-12 w-12" strokeWidth={1.5} />}
            title="אין שירותים"
            description="צרו את השירות הראשון כדי להתחיל"
            action={
              <Button size="sm" onClick={openCreateModal}>
                <Plus className="h-4 w-4" />
                שירות חדש
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-right px-4 py-3 font-medium text-text-muted">
                    שם השירות
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted">
                    קטגוריה
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted">
                    משך
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted">
                    מחיר
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted">
                    סטטוס
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr
                    key={service.id}
                    className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-text">{service.name}</p>
                        <p className="text-xs text-text-muted mt-0.5" dir="ltr">
                          /{service.slug}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge>
                        {CATEGORY_LABELS[service.category] || service.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {formatDuration(service.duration)}
                    </td>
                    <td className="px-4 py-3 font-medium text-text" dir="ltr">
                      <span>{formatPrice(service.price)}</span>
                      {service.homeVisitSurcharge != null && (
                        <span className="block text-xs text-text-muted font-normal">
                          +{formatPrice(service.homeVisitSurcharge)} ביקור בית
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={service.isActive ? "success" : "error"}>
                        {service.isActive ? "פעיל" : "מושבת"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleActive(service)}
                          disabled={isToggling === service.id}
                          className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors disabled:opacity-50"
                          title={service.isActive ? "השבת שירות" : "הפעל שירות"}
                        >
                          {service.isActive ? (
                            <ToggleRight className="h-4 w-4 text-success" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => openEditModal(service)}
                          className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors"
                          title="עריכת שירות"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(service)}
                          className="p-2 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                          title="מחיקת שירות"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingService ? "עריכת שירות" : "שירות חדש"}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="שם השירות"
              placeholder="עיסוי שוודי"
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              label="Slug (כתובת URL)"
              placeholder="swedish-massage"
              dir="ltr"
              error={errors.slug?.message}
              {...register("slug")}
            />
          </div>

          <Input
            label="תיאור קצר"
            placeholder="תיאור קצר של השירות"
            error={errors.shortDesc?.message}
            {...register("shortDesc")}
          />

          <Textarea
            label="תיאור מלא"
            placeholder="תיאור מפורט של השירות..."
            rows={4}
            error={errors.description?.message}
            {...register("description")}
          />

          <Textarea
            label="למי מתאים?"
            placeholder="כל פריט בשורה חדשה, לדוגמה:&#10;סובלים מכאבי גב&#10;ספורטאים&#10;נשים בהריון"
            rows={4}
            helperText="כל שורה תוצג כפריט נפרד בעמוד השירות"
            error={errors.suitableFor?.message}
            {...register("suitableFor")}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="קטגוריה"
              options={categoryOptions}
              error={errors.category?.message}
              {...register("category")}
            />
            <Input
              label="משך (דקות)"
              type="number"
              placeholder="60"
              error={errors.duration?.message}
              {...register("duration", { valueAsNumber: true })}
            />
            <Input
              label="מחיר (₪)"
              type="number"
              placeholder="250"
              error={errors.price?.message}
              {...register("price", { valueAsNumber: true })}
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">תמונת שירות</label>
            <input type="hidden" {...register("image")} />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border">
                <img src={imagePreview} alt="תצוגה מקדימה" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    const event = { target: { name: "image", value: "" } };
                    register("image").onChange(event as never);
                  }}
                  className="absolute top-2 left-2 p-1 bg-white/80 rounded-full hover:bg-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full h-40 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-text-muted hover:text-primary transition-colors disabled:opacity-50"
              >
                <Upload className="h-8 w-8" />
                <span className="text-sm">{isUploading ? "מעלה..." : "העלאת תמונה"}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="סדר מיון"
              type="number"
              placeholder="0"
              error={errors.sortOrder?.message}
              {...register("sortOrder", { valueAsNumber: true })}
            />
            <Input
              label="תוספת ביקור בית (₪)"
              type="number"
              placeholder="השאירו ריק אם לא רלוונטי"
              helperText="אם מוגדר, הלקוח יוכל לבחור ביקור בית"
              error={errors.homeVisitSurcharge?.message}
              {...register("homeVisitSurcharge", {
                setValueAs: (v: string) => (v === "" || v === undefined ? null : parseInt(v, 10)),
              })}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                {...register("isActive")}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success" />
            </label>
            <span className="text-sm font-medium text-text">שירות פעיל</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={closeModal}
            >
              ביטול
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              {editingService ? "עדכון" : "יצירה"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="מחיקת שירות"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text">
            האם למחוק את השירות{" "}
            <span className="font-semibold">&quot;{deleteTarget?.name}&quot;</span>?
          </p>
          <p className="text-sm text-text-muted">
            פעולה זו אינה ניתנת לביטול. אם לשירות יש הזמנות, לא ניתן יהיה
            למחוק אותו.
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
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
