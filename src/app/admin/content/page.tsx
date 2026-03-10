"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";

interface ContentItem {
  id: string;
  section: string;
  key: string;
  value: string;
  sortOrder: number;
}

// Define which fields each section has
const SECTIONS = [
  {
    key: "hero",
    label: "דף הבית - Hero",
    fields: [
      { key: "title", label: "כותרת ראשית", type: "input" as const },
      { key: "subtitle", label: "תיאור", type: "textarea" as const },
      { key: "buttonText", label: "טקסט כפתור ראשי", type: "input" as const },
      { key: "buttonText2", label: "טקסט כפתור משני", type: "input" as const },
    ],
  },
  {
    key: "about",
    label: "דף הבית - קצת עליי",
    fields: [
      { key: "title", label: "כותרת", type: "input" as const },
      { key: "credential1", label: "הסמכה 1", type: "input" as const },
      { key: "credential2", label: "הסמכה 2", type: "input" as const },
      { key: "credential3", label: "הסמכה 3", type: "input" as const },
      { key: "paragraph1", label: "פסקה 1", type: "textarea" as const },
      { key: "paragraph2", label: "פסקה 2", type: "textarea" as const },
      { key: "paragraph3", label: "פסקה 3", type: "textarea" as const },
      { key: "buttonText", label: "טקסט כפתור", type: "input" as const },
    ],
  },
  {
    key: "howItWorks",
    label: "דף הבית - איך זה עובד",
    fields: [
      { key: "title", label: "כותרת", type: "input" as const },
      { key: "subtitle", label: "תת כותרת", type: "input" as const },
      { key: "step1Title", label: "שלב 1 - כותרת", type: "input" as const },
      { key: "step1Desc", label: "שלב 1 - תיאור", type: "input" as const },
      { key: "step2Title", label: "שלב 2 - כותרת", type: "input" as const },
      { key: "step2Desc", label: "שלב 2 - תיאור", type: "input" as const },
      { key: "step3Title", label: "שלב 3 - כותרת", type: "input" as const },
      { key: "step3Desc", label: "שלב 3 - תיאור", type: "input" as const },
    ],
  },
  {
    key: "about_page",
    label: "עמוד אודות",
    fields: [
      { key: "heroTitle", label: "כותרת Hero", type: "input" as const },
      { key: "heroSubtitle", label: "תת כותרת Hero", type: "input" as const },
      { key: "bioTitle", label: "כותרת ביוגרפיה", type: "input" as const },
      { key: "bio", label: "ביוגרפיה (פסקאות מופרדות בשורה ריקה)", type: "textarea" as const },
      { key: "quote", label: "ציטוט", type: "textarea" as const },
      { key: "approachTitle", label: "כותרת גישה", type: "input" as const },
      { key: "approach", label: "גישה (פסקאות מופרדות בשורה ריקה)", type: "textarea" as const },
      { key: "ctaTitle", label: "כותרת CTA", type: "input" as const },
      { key: "ctaText", label: "טקסט CTA", type: "input" as const },
      { key: "ctaButton", label: "טקסט כפתור CTA", type: "input" as const },
    ],
  },
  {
    key: "services",
    label: "שירותים",
    fields: [
      { key: "heroTitle", label: "כותרת Hero", type: "input" as const },
      { key: "heroSubtitle", label: "תת כותרת Hero", type: "input" as const },
      { key: "gridTitle", label: "כותרת רשימה", type: "input" as const },
      { key: "gridSubtitle", label: "תת כותרת רשימה", type: "input" as const },
    ],
  },
  {
    key: "reviews",
    label: "המלצות",
    fields: [
      { key: "title", label: "כותרת בדף הבית", type: "input" as const },
      { key: "heroTitle", label: "כותרת עמוד המלצות", type: "input" as const },
      { key: "heroSubtitle", label: "תת כותרת עמוד המלצות", type: "input" as const },
    ],
  },
  {
    key: "footer",
    label: "פוטר",
    fields: [
      { key: "description", label: "תיאור קצר", type: "textarea" as const },
    ],
  },
  {
    key: "contact",
    label: "צור קשר",
    fields: [
      { key: "heroTitle", label: "כותרת Hero", type: "input" as const },
      { key: "heroSubtitle", label: "תת כותרת Hero", type: "input" as const },
    ],
  },
];

export default function AdminContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ hero: true });

  // FAQ state
  const [faqItems, setFaqItems] = useState<{ id?: string; question: string; answer: string; sortOrder: number }[]>([]);

  const fetchContent = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/site-content");
      const json = await res.json();
      const data: ContentItem[] = json.data || [];
      setItems(data);

      // Initialize local values
      const vals: Record<string, string> = {};
      for (const item of data) {
        vals[`${item.section}::${item.key}`] = item.value;
      }
      setLocalValues(vals);

      // Initialize FAQ
      const faqs = data
        .filter((d) => d.section === "faq")
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const faqPairs: { id?: string; question: string; answer: string; sortOrder: number }[] = [];
      const faqQuestions = faqs.filter((f) => f.key.startsWith("q_"));
      for (const q of faqQuestions) {
        const idx = q.key.replace("q_", "");
        const a = faqs.find((f) => f.key === `a_${idx}`);
        faqPairs.push({
          id: idx,
          question: q.value,
          answer: a?.value || "",
          sortOrder: q.sortOrder,
        });
      }
      setFaqItems(faqPairs.length > 0 ? faqPairs : []);
    } catch {
      toast.error("שגיאה בטעינת תוכן");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const getValue = (section: string, key: string) => {
    return localValues[`${section}::${key}`] ?? "";
  };

  const setValue = (section: string, key: string, value: string) => {
    setLocalValues((prev) => ({ ...prev, [`${section}::${key}`]: value }));
  };

  const saveField = async (section: string, key: string) => {
    const fieldKey = `${section}::${key}`;
    setSaving(fieldKey);
    try {
      const res = await fetch("/api/admin/site-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          key,
          value: localValues[fieldKey] || "",
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("נשמר בהצלחה");
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setSaving(null);
    }
  };

  const saveSection = async (sectionKey: string) => {
    const section = SECTIONS.find((s) => s.key === sectionKey);
    if (!section) return;

    setSaving(sectionKey);
    try {
      for (const field of section.fields) {
        await fetch("/api/admin/site-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: sectionKey,
            key: field.key,
            value: localValues[`${sectionKey}::${field.key}`] || "",
          }),
        });
      }
      toast.success("הסקציה נשמרה בהצלחה");
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setSaving(null);
    }
  };

  // FAQ functions
  const addFaqItem = () => {
    setFaqItems((prev) => [
      ...prev,
      { question: "", answer: "", sortOrder: prev.length },
    ]);
  };

  const removeFaqItem = async (index: number) => {
    const item = faqItems[index];
    if (item.id) {
      // Delete from DB
      const qItem = items.find((i) => i.section === "faq" && i.key === `q_${item.id}`);
      const aItem = items.find((i) => i.section === "faq" && i.key === `a_${item.id}`);
      if (qItem) await fetch(`/api/admin/site-content?id=${qItem.id}`, { method: "DELETE" });
      if (aItem) await fetch(`/api/admin/site-content?id=${aItem.id}`, { method: "DELETE" });
    }
    setFaqItems((prev) => prev.filter((_, i) => i !== index));
    toast.success("השאלה נמחקה");
  };

  const saveFaq = async () => {
    setSaving("faq");
    try {
      // Delete all existing FAQ items first
      const existingFaq = items.filter((i) => i.section === "faq");
      for (const item of existingFaq) {
        await fetch(`/api/admin/site-content?id=${item.id}`, { method: "DELETE" });
      }

      // Save all FAQ items
      for (let i = 0; i < faqItems.length; i++) {
        const faq = faqItems[i];
        if (!faq.question.trim()) continue;

        await fetch("/api/admin/site-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "faq",
            key: `q_${i}`,
            value: faq.question,
            sortOrder: i,
          }),
        });
        await fetch("/api/admin/site-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "faq",
            key: `a_${i}`,
            value: faq.answer,
            sortOrder: i,
          }),
        });
      }

      toast.success("שאלות ותשובות נשמרו בהצלחה");
      fetchContent();
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setSaving(null);
    }
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">תוכן האתר</h1>
        <p className="text-text-muted text-sm mt-1">
          ערכו את הטקסטים המופיעים באתר
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Regular sections */}
          {SECTIONS.map((section) => (
            <Card key={section.key} className="p-0 overflow-hidden">
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full flex items-center justify-between px-4 py-3 bg-surface/50 border-b border-border hover:bg-surface transition-colors text-right"
              >
                <h3 className="font-semibold text-text">{section.label}</h3>
                {openSections[section.key] ? (
                  <ChevronUp className="h-5 w-5 text-text-muted" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-text-muted" />
                )}
              </button>

              {openSections[section.key] && (
                <div className="p-4 space-y-4">
                  {section.fields.map((field) => (
                    <div key={field.key}>
                      {field.type === "input" ? (
                        <Input
                          label={field.label}
                          value={getValue(section.key, field.key)}
                          onChange={(e) =>
                            setValue(section.key, field.key, e.target.value)
                          }
                          onBlur={() => saveField(section.key, field.key)}
                        />
                      ) : (
                        <Textarea
                          label={field.label}
                          value={getValue(section.key, field.key)}
                          onChange={(e) =>
                            setValue(section.key, field.key, e.target.value)
                          }
                          onBlur={() => saveField(section.key, field.key)}
                          rows={4}
                        />
                      )}
                    </div>
                  ))}
                  <div className="pt-2">
                    <Button
                      size="sm"
                      onClick={() => saveSection(section.key)}
                      isLoading={saving === section.key}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      שמירת סקציה
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}

          {/* FAQ Section */}
          <Card className="p-0 overflow-hidden">
            <button
              onClick={() => toggleSection("faq")}
              className="w-full flex items-center justify-between px-4 py-3 bg-surface/50 border-b border-border hover:bg-surface transition-colors text-right"
            >
              <h3 className="font-semibold text-text">שאלות ותשובות (FAQ)</h3>
              {openSections["faq"] ? (
                <ChevronUp className="h-5 w-5 text-text-muted" />
              ) : (
                <ChevronDown className="h-5 w-5 text-text-muted" />
              )}
            </button>

            {openSections["faq"] && (
              <div className="p-4 space-y-4">
                {faqItems.map((faq, index) => (
                  <div
                    key={index}
                    className="border border-border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-muted">
                        שאלה {index + 1}
                      </span>
                      <button
                        onClick={() => removeFaqItem(index)}
                        className="p-1 text-error hover:bg-error/5 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <Input
                      label="שאלה"
                      value={faq.question}
                      onChange={(e) => {
                        const updated = [...faqItems];
                        updated[index] = { ...updated[index], question: e.target.value };
                        setFaqItems(updated);
                      }}
                    />
                    <Textarea
                      label="תשובה"
                      value={faq.answer}
                      onChange={(e) => {
                        const updated = [...faqItems];
                        updated[index] = { ...updated[index], answer: e.target.value };
                        setFaqItems(updated);
                      }}
                      rows={3}
                    />
                  </div>
                ))}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addFaqItem}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    הוסף שאלה
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveFaq}
                    isLoading={saving === "faq"}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    שמירת שאלות ותשובות
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
