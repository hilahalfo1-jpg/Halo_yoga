"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Upload, Trash2, ImageIcon, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface SiteImage {
  id: string;
  section: string;
  imagePath: string;
  alt: string;
  sortOrder: number;
}

const SINGLE_SECTIONS = [
  {
    key: "about",
    label: "תמונת פרופיל - דף אודות",
    description: "התמונה שלך בדף האודות ובסקציית ׳קצת עליי׳ בדף הבית",
    aspect: "portrait" as const,
  },
  {
    key: "logo",
    label: "לוגו (בהיר)",
    description: "הלוגו שמופיע על רקע שקוף בהירו (בדף הבית לפני גלילה)",
    aspect: "landscape" as const,
  },
  {
    key: "logo_dark",
    label: "לוגו (כהה)",
    description: "הלוגו שמופיע על האדר הלבן (לאחר גלילה ובשאר העמודים)",
    aspect: "landscape" as const,
  },
  {
    key: "services_bg",
    label: "רקע עמוד שירותים",
    description: "תמונת רקע בראש עמוד השירותים",
    aspect: "landscape" as const,
  },
];

export default function AdminImagesPage() {
  const [images, setImages] = useState<SiteImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/site-images");
      const json = await res.json();
      setImages(json.data || []);
    } catch {
      toast.error("שגיאה בטעינת תמונות");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const heroImages = images
    .filter((img) => img.section === "hero" && img.imagePath)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const getImageForSection = (section: string) =>
    images.find((img) => img.section === section && img.imagePath);

  const handleUpload = async (section: string, file: File) => {
    setUploading(section);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "שגיאה בהעלאה");
      }
      const { path: imagePath } = await uploadRes.json();
      const saveRes = await fetch("/api/admin/site-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, imagePath, alt: "" }),
      });
      if (!saveRes.ok) throw new Error("שגיאה בשמירה");
      toast.success("התמונה הועלתה בהצלחה");
      fetchImages();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שגיאה בהעלאה");
    } finally {
      setUploading(null);
    }
  };

  const handleHeroUpload = async (file: File) => {
    setUploading("hero");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "שגיאה בהעלאה");
      }
      const { path: imagePath } = await uploadRes.json();
      const saveRes = await fetch("/api/admin/site-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "hero", imagePath, alt: "" }),
      });
      if (!saveRes.ok) throw new Error("שגיאה בשמירה");
      toast.success("התמונה נוספה לקרוסלה");
      fetchImages();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "שגיאה בהעלאה");
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק את התמונה?")) return;
    try {
      await fetch(`/api/admin/site-images?id=${id}`, { method: "DELETE" });
      toast.success("התמונה נמחקה");
      fetchImages();
    } catch {
      toast.error("שגיאה במחיקה");
    }
  };

  const handleRemove = async (section: string) => {
    const img = getImageForSection(section);
    if (!img) return;
    await handleDelete(img.id);
  };

  const handleAltChange = async (id: string, imagePath: string, alt: string) => {
    try {
      await fetch("/api/admin/site-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, section: "any", imagePath, alt }),
      });
      fetchImages();
    } catch {
      toast.error("שגיאה בעדכון");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">ניהול תמונות</h1>
        <p className="text-text-muted text-sm mt-1">העלו ונהלו את התמונות באתר</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Hero Carousel */}
          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3 bg-surface/50 border-b border-border">
              <h3 className="font-semibold text-text">קרוסלת תמונות ראשית (Hero)</h3>
              <p className="text-sm text-text-muted">
                התמונות מתחלפות אוטומטית בחלק העליון של דף הבית
              </p>
            </div>

            <div className="p-4">
              {heroImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                  {heroImages.map((img, index) => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border">
                      <div className="aspect-video relative">
                        <Image src={img.imagePath} alt={img.alt || `תמונה ${index + 1}`} fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button onClick={() => handleDelete(img.id)} className="p-2 bg-white rounded-full text-error shadow-lg">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <input
                        type="text"
                        placeholder={`כיתוב תמונה ${index + 1}`}
                        defaultValue={img.alt}
                        onBlur={(e) => handleAltChange(img.id, img.imagePath, e.target.value)}
                        className="w-full text-xs border-t border-border px-2 py-1.5 focus:outline-none focus:bg-primary/5"
                      />
                    </div>
                  ))}

                  {/* Add more */}
                  <label className="aspect-video rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleHeroUpload(file);
                        e.target.value = "";
                      }}
                      disabled={uploading === "hero"}
                    />
                    {uploading === "hero" ? (
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-6 w-6 text-text-muted mb-1" />
                        <span className="text-xs text-text-muted">הוסף תמונה</span>
                      </>
                    )}
                  </label>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ImageIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-text-muted mb-4">אין תמונות בקרוסלה</p>
                  <label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleHeroUpload(file);
                        e.target.value = "";
                      }}
                      disabled={uploading === "hero"}
                    />
                    <Button variant="outline" size="sm" className="gap-2 pointer-events-none">
                      <Upload className="h-4 w-4" />
                      העלה תמונה
                    </Button>
                  </label>
                </div>
              )}
            </div>
          </Card>

          {/* Single Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {SINGLE_SECTIONS.map((section) => {
              const img = getImageForSection(section.key);
              const hasImage = img && img.imagePath;
              const isUploading = uploading === section.key;

              return (
                <Card key={section.key} className="p-0 overflow-hidden">
                  <div className={`relative bg-gray-100 flex items-center justify-center ${section.aspect === "portrait" ? "aspect-[3/4] max-h-[300px]" : "aspect-video"}`}>
                    {hasImage ? (
                      <Image src={img.imagePath} alt={img.alt || section.label} fill className="object-cover" />
                    ) : (
                      <div className="text-center text-gray-400">
                        <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                        <p className="text-sm">לא הועלתה תמונה</p>
                      </div>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-text">{section.label}</h3>
                      <p className="text-sm text-text-muted">{section.description}</p>
                    </div>

                    {hasImage && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="טקסט חלופי (alt)"
                          defaultValue={img.alt}
                          onBlur={(e) => handleAltChange(img.id, img.imagePath, e.target.value)}
                          className="flex-1 text-sm border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <Check className="h-4 w-4 text-success" />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <label className="flex-1">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/svg+xml"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(section.key, file);
                            e.target.value = "";
                          }}
                          disabled={isUploading}
                        />
                        <Button variant="outline" size="sm" className="w-full gap-2 pointer-events-none">
                          <Upload className="h-4 w-4" />
                          {hasImage ? "החלף תמונה" : "העלה תמונה"}
                        </Button>
                      </label>
                      {hasImage && (
                        <Button variant="outline" size="sm" onClick={() => handleRemove(section.key)} className="text-error border-error/20 hover:bg-error/5">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
