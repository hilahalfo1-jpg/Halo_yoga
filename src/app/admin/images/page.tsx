"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Upload, Trash2, ImageIcon, Check } from "lucide-react";
import { toast } from "sonner";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface SiteImage {
  id: string;
  section: string;
  imagePath: string;
  alt: string;
}

const SECTIONS = [
  {
    key: "hero",
    label: "תמונת רקע ראשית (Hero)",
    description: "תמונת הרקע בחלק העליון של דף הבית",
    aspect: "landscape" as const,
  },
  {
    key: "about",
    label: "תמונת פרופיל - דף אודות",
    description: "התמונה שלך בדף האודות ובסקציית ׳קצת עליי׳ בדף הבית",
    aspect: "portrait" as const,
  },
  {
    key: "logo",
    label: "לוגו",
    description: "הלוגו שמופיע בתפריט העליון ובפוטר",
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

  const getImageForSection = (section: string) =>
    images.find((img) => img.section === section);

  const handleUpload = async (section: string, file: File) => {
    setUploading(section);
    try {
      // 1. Upload the file
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

      // 2. Save the section-image mapping
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

  const handleRemove = async (section: string) => {
    if (!confirm("למחוק את התמונה?")) return;

    try {
      await fetch("/api/admin/site-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, imagePath: "", alt: "" }),
      });
      toast.success("התמונה הוסרה");
      fetchImages();
    } catch {
      toast.error("שגיאה במחיקה");
    }
  };

  const handleAltChange = async (section: string, alt: string) => {
    const img = getImageForSection(section);
    if (!img) return;

    try {
      await fetch("/api/admin/site-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, imagePath: img.imagePath, alt }),
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {SECTIONS.map((section) => {
            const img = getImageForSection(section.key);
            const hasImage = img && img.imagePath;
            const isUploading = uploading === section.key;

            return (
              <Card key={section.key} className="p-0 overflow-hidden">
                {/* Preview area */}
                <div
                  className={`relative bg-gray-100 flex items-center justify-center ${
                    section.aspect === "portrait"
                      ? "aspect-[3/4] max-h-[300px]"
                      : "aspect-video"
                  }`}
                >
                  {hasImage ? (
                    <Image
                      src={img.imagePath}
                      alt={img.alt || section.label}
                      fill
                      className="object-cover"
                    />
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

                {/* Info & actions */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-text">
                      {section.label}
                    </h3>
                    <p className="text-sm text-text-muted">
                      {section.description}
                    </p>
                  </div>

                  {hasImage && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="טקסט חלופי (alt)"
                        defaultValue={img.alt}
                        onBlur={(e) =>
                          handleAltChange(section.key, e.target.value)
                        }
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 pointer-events-none"
                      >
                        <Upload className="h-4 w-4" />
                        {hasImage ? "החלף תמונה" : "העלה תמונה"}
                      </Button>
                    </label>

                    {hasImage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemove(section.key)}
                        className="text-error border-error/20 hover:bg-error/5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
