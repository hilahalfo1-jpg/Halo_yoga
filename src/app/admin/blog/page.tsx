"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  X,
  Eye,
  EyeOff,
  FileText,
  ArrowRight,
  Crop,
  ImagePlus,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import ImageCropModal from "@/components/admin/ImageCropModal";
import BlogReminder from "@/components/admin/BlogReminder";
import { formatDateShort } from "@/lib/utils";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category: string;
  coverImage: string | null;
  author: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const BLOG_CATEGORIES = [
  { value: "MASSAGE", label: "עיסוי" },
  { value: "YOGA", label: "יוגה" },
  { value: "PILATES", label: "פילאטיס" },
  { value: "HEALTH", label: "בריאות" },
  { value: "TIPS", label: "טיפים" },
];

const CATEGORY_LABELS: Record<string, string> = {
  MASSAGE: "עיסוי",
  YOGA: "יוגה",
  PILATES: "פילאטיס",
  HEALTH: "בריאות",
  TIPS: "טיפים",
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cover crop + inline image state
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [isInlineUploading, setIsInlineUploading] = useState(false);
  const inlineFileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("HEALTH");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);

  // AI draft state
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiCategory, setAiCategory] = useState("HEALTH");
  const [isGenerating, setIsGenerating] = useState(false);
  // Set when the AI modal is dismissed — an in-flight generation result is then dropped
  const aiDismissedRef = useRef(false);

  // ─── Fetch Posts ──────────────────────────────────
  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/blog");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setPosts(json.data);
    } catch {
      toast.error("שגיאה בטעינת המאמרים");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // ─── Reset Form ───────────────────────────────────
  const resetForm = () => {
    setTitle("");
    setContent("");
    setExcerpt("");
    setCategory("HEALTH");
    setCoverImage(null);
    setIsPublished(false);
    setEditingPost(null);
  };

  // ─── Open Create ──────────────────────────────────
  const openCreate = () => {
    resetForm();
    setIsEditing(true);
  };

  // ─── Open Edit ────────────────────────────────────
  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setTitle(post.title);
    setContent(post.content);
    setExcerpt(post.excerpt);
    setCategory(post.category);
    setCoverImage(post.coverImage);
    setIsPublished(post.isPublished);
    setIsEditing(true);
  };

  // ─── Close Editor ─────────────────────────────────
  const closeEditor = () => {
    setIsEditing(false);
    resetForm();
  };

  // ─── AI Draft ─────────────────────────────────────
  const closeAiModal = () => {
    if (isGenerating) return; // don't allow Escape/overlay-close mid-generation
    aiDismissedRef.current = true;
    setIsAiOpen(false);
  };

  const generateAiDraft = async () => {
    if (!aiTopic.trim()) {
      toast.error("נא להזין נושא למאמר");
      return;
    }
    aiDismissedRef.current = false;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/admin/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: aiTopic.trim(), category: aiCategory }),
      });
      const json = await res.json();
      // Modal dismissed meanwhile — drop the result instead of overwriting the editor
      if (aiDismissedRef.current) return;
      if (!res.ok) {
        toast.error(json.error || "שגיאה ביצירת תוכן עם AI");
        return;
      }
      // Fill the editor with the generated draft (kept as draft, not published)
      resetForm();
      setTitle(json.data.title || "");
      setContent(json.data.content || "");
      setExcerpt(json.data.excerpt || "");
      setCategory(aiCategory);
      setIsPublished(false);
      setIsAiOpen(false);
      setAiTopic("");
      setIsEditing(true);
      toast.success("הטיוטה נוצרה — עברו עליה ושמרו");
    } catch {
      toast.error("שגיאת שרת, אנא נסו שוב");
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Cover Image (pick → crop → upload) ───────────
  const handleCoverFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeCropModal = () => {
    if (cropSrc?.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const handleCropped = (url: string) => {
    setCoverImage(url);
    closeCropModal();
  };

  // ─── Inline Article Images (upload without crop) ──
  // Downscale to max 1600px wide client-side; fall back to the original file
  const capImageWidth = async (file: File): Promise<Blob> => {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("image load failed"));
        i.src = url;
      });
      if (!img.naturalWidth || img.naturalWidth <= 1600) return file;
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = Math.round((img.naturalHeight / img.naturalWidth) * 1600);
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      // Flatten transparency onto white — JPEG has no alpha channel
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.85)
      );
      return blob ?? file;
    } catch {
      return file;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const handleInlineImagePick = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsInlineUploading(true);
    try {
      const blob = await capImageWidth(file);
      const formData = new FormData();
      // Always upload under a unique name — Vercel Blob rejects duplicate
      // pathnames (e.g. every iPhone photo arriving as "image.jpeg")
      formData.append(
        "file",
        blob,
        blob === file
          ? `inline-${Date.now()}-${file.name}`
          : `inline-${Date.now()}.jpg`
      );
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "שגיאה בהעלאת התמונה");
        return;
      }
      // Blank lines around the token are mandatory — the renderer splits
      // paragraphs on blank lines and the token must be its own paragraph
      const token = `\n\n[תמונה: ${json.path}]\n\n`;
      const pos = contentRef.current?.selectionStart ?? content.length;
      setContent((prev) => prev.slice(0, pos) + token + prev.slice(pos));
      toast.success("התמונה נוספה לכתבה");
    } catch {
      toast.error("שגיאה בהעלאת התמונה");
    } finally {
      setIsInlineUploading(false);
      if (inlineFileInputRef.current) inlineFileInputRef.current.value = "";
    }
  };

  // ─── Submit (Create / Update) ─────────────────────
  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !excerpt.trim()) {
      toast.error("נא למלא כותרת, תוכן ותקציר");
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingPost
        ? `/api/admin/blog/${editingPost.id}`
        : "/api/admin/blog";
      const method = editingPost ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          excerpt,
          category,
          coverImage,
          isPublished,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "שגיאה בשמירת המאמר");
        return;
      }

      toast.success(editingPost ? "המאמר עודכן בהצלחה" : "המאמר נוצר בהצלחה");
      closeEditor();
      fetchPosts();
    } catch {
      toast.error("שגיאת שרת, אנא נסו שוב");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Delete ───────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/blog/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || "שגיאה במחיקת המאמר");
        return;
      }
      toast.success("המאמר נמחק בהצלחה");
      setDeleteTarget(null);
      fetchPosts();
    } catch {
      toast.error("שגיאת שרת");
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Loading ──────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner label="טוען מאמרים..." />
      </div>
    );
  }

  // ─── Editor View ──────────────────────────────────
  if (isEditing) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text">
            {editingPost ? "עריכת מאמר" : "מאמר חדש"}
          </h1>
          <button
            onClick={closeEditor}
            className="flex items-center gap-2 text-text-muted hover:text-text transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            חזרה לרשימה
          </button>
        </div>

        <Card className="space-y-5">
          {/* Title */}
          <Input
            label="כותרת"
            placeholder="כותרת המאמר"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Category */}
          <Select
            label="קטגוריה"
            options={BLOG_CATEGORIES}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          {/* Excerpt */}
          <Textarea
            label="תקציר"
            placeholder="תיאור קצר של המאמר (1-2 משפטים)"
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />

          {/* Content */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="blog-content"
                className="block text-sm font-medium text-text"
              >
                תוכן המאמר
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={isInlineUploading}
                onClick={() => inlineFileInputRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4" />
                הוסף תמונה לכתבה
              </Button>
            </div>
            <Textarea
              ref={contentRef}
              id="blog-content"
              placeholder="כתבו כאן את תוכן המאמר... פסקאות מופרדות בשורה ריקה"
              rows={14}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <p className="text-xs text-text-muted mt-1.5">
              התמונה תתווסף במיקום הסמן בטקסט. אפשר להוסיף כיתוב מתחת לתמונה
              כך: ‎[תמונה: כתובת | כיתוב]
            </p>
            <input
              ref={inlineFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleInlineImagePick}
              className="hidden"
            />
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              תמונת נושא
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverFilePick}
              className="hidden"
            />
            {coverImage ? (
              <div>
                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border">
                  <img
                    src={coverImage}
                    alt="תצוגה מקדימה"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setCoverImage(null)}
                    className="absolute top-2 left-2 p-1 bg-white/80 rounded-full hover:bg-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCropSrc(coverImage)}
                  >
                    <Crop className="h-4 w-4" />
                    ערוך חיתוך
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    החלף תמונה
                  </Button>
                </div>
                <p className="text-xs text-text-muted mt-1.5">
                  עריכת החיתוך פועלת על התמונה החתוכה — להתחלה מחדש מהתמונה
                  המקורית השתמשו ב&quot;החלף תמונה&quot;.
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-text-muted hover:text-primary transition-colors"
              >
                <Upload className="h-8 w-8" />
                <span className="text-sm">העלאת תמונת נושא</span>
              </button>
            )}
          </div>

          {/* Publish Toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success" />
            </label>
            <span className="text-sm font-medium text-text">
              {isPublished ? "מפורסם" : "טיוטה"}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" size="sm" onClick={closeEditor}>
              ביטול
            </Button>
            <Button size="sm" isLoading={isSubmitting} onClick={handleSubmit}>
              {editingPost ? "עדכון" : "שמירה"}
            </Button>
          </div>
        </Card>

        {/* Cover Crop Modal */}
        <ImageCropModal
          isOpen={!!cropSrc}
          imageSrc={cropSrc}
          onClose={closeCropModal}
          onCropped={handleCropped}
        />
      </div>
    );
  }

  // ─── Posts List ────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Weekly blog reminder */}
      <BlogReminder />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text">ניהול בלוג</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsAiOpen(true)}>
            ✨ צור טיוטה עם AI
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            מאמר חדש
          </Button>
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="h-12 w-12" strokeWidth={1.5} />}
            title="אין מאמרים"
            description="צרו את המאמר הראשון כדי להתחיל"
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                מאמר חדש
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Mobile: Card Layout */}
          <div className="space-y-3 lg:hidden">
            {posts.map((post) => (
              <Card key={post.id} className="p-4 space-y-3">
                <div>
                  <p className="font-semibold text-text">{post.title}</p>
                  {post.excerpt && (
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                      {post.excerpt}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                  <Badge>
                    {CATEGORY_LABELS[post.category] || post.category}
                  </Badge>
                  <Badge variant={post.isPublished ? "success" : "warning"}>
                    {post.isPublished ? (
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        מפורסם
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <EyeOff className="h-3 w-3" />
                        טיוטה
                      </span>
                    )}
                  </Badge>
                  <span>{formatDateShort(post.createdAt)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => openEdit(post)}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 text-sm font-medium transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                    עריכה
                  </button>
                  <button
                    onClick={() => setDeleteTarget(post)}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-error/10 text-error hover:bg-error/20 text-sm font-medium transition-colors ms-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                    מחיקה
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop: Table Layout */}
          <Card className="overflow-hidden p-0 hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-right px-4 py-3 font-medium text-text-muted">
                    כותרת
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted">
                    קטגוריה
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted">
                    סטטוס
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted">
                    תאריך
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-text-muted">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr
                    key={post.id}
                    className="border-b border-border last:border-0 hover:bg-surface/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-text">{post.title}</p>
                        <p
                          className="text-xs text-text-muted mt-0.5 truncate max-w-[300px]"
                        >
                          {post.excerpt}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge>
                        {CATEGORY_LABELS[post.category] || post.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={post.isPublished ? "success" : "warning"}>
                        {post.isPublished ? (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            מפורסם
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <EyeOff className="h-3 w-3" />
                            טיוטה
                          </span>
                        )}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs">
                      {formatDateShort(post.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(post)}
                          className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors"
                          title="עריכת מאמר"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(post)}
                          className="p-2 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                          title="מחיקת מאמר"
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
        </>
      )}

      {/* AI Draft Modal */}
      <Modal
        isOpen={isAiOpen}
        onClose={closeAiModal}
        title="✨ צור טיוטה עם AI"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="נושא המאמר"
            placeholder="למשל: יתרונות עיסוי תאילנדי לספורטאים"
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
          />
          <Select
            label="קטגוריה"
            options={BLOG_CATEGORIES}
            value={aiCategory}
            onChange={(e) => setAiCategory(e.target.value)}
          />
          <p className="text-xs text-text-muted">
            הטיוטה תיפתח בעורך לבדיקה ועריכה — היא לא תפורסם אוטומטית.
          </p>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={closeAiModal}
              disabled={isGenerating}
            >
              ביטול
            </Button>
            <Button size="sm" isLoading={isGenerating} onClick={generateAiDraft}>
              יצירת טיוטה
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="מחיקת מאמר"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text">
            האם למחוק את המאמר{" "}
            <span className="font-semibold">
              &quot;{deleteTarget?.title}&quot;
            </span>
            ?
          </p>
          <p className="text-sm text-text-muted">
            פעולה זו אינה ניתנת לביטול.
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
