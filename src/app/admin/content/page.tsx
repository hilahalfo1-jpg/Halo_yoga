"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Spinner from "@/components/ui/Spinner";
import {
  CONTACT_PHONE,
  CONTACT_WHATSAPP,
  CONTACT_EMAIL,
  CONTACT_ADDRESS,
} from "@/lib/constants";
import { TERMS_TITLE, TERMS_BODY } from "@/lib/terms-content";

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
      { key: "title", label: "כותרת ראשית", type: "input" as const, default: "ריפוי הגוף, שקט הנפש" },
      { key: "subtitle", label: "תיאור", type: "textarea" as const, default: "עיסוי תאילנדי מקצועי ושיעורי יוגה מותאמים אישית. גישה הוליסטית המשלבת מגע מרפא, תנועה ונשימה נכונה לאיזון גוף ונפש." },
      { key: "buttonText", label: "טקסט כפתור ראשי", type: "input" as const, default: "קביעת תור" },
      { key: "buttonText2", label: "טקסט כפתור משני", type: "input" as const, default: "שיחת ייעוץ" },
    ],
  },
  {
    key: "about",
    label: "דף הבית - קצת עליי",
    fields: [
      { key: "title", label: "כותרת", type: "input" as const, default: "הילה חלפון" },
      { key: "credential1", label: "הסמכה 1", type: "input" as const, default: "מעסה תאילנדי מוסמכת" },
      { key: "credential2", label: "הסמכה 2", type: "input" as const, default: "מדריכת יוגה ופילאטיס" },
      { key: "credential3", label: "הסמכה 3", type: "input" as const, default: "גישה הוליסטית לגוף ונפש" },
      { key: "paragraph1", label: "פסקה 1", type: "textarea" as const, default: "בעיסוי אני שואפת לעזור לגוף לשחרר ולפרק אנרגיות שלא משרתות אותו, לפתוח חסימות ולהחזיר תחושת זרימה טבעית." },
      { key: "paragraph2", label: "פסקה 2", type: "textarea" as const, default: "ביוגה אני מתמקדת בהכנסת אנרגיה חדשה, דרך תנועה, נשימה ונוכחות." },
      { key: "paragraph3", label: "פסקה 3", type: "textarea" as const, default: "דרך פילאטיס נלמד לחזק את הגוף בלי לקצר אותו, לחבר אותנו לעבודה ממוקדת, פעולות שיסייעו לנו ביום יום וישמרו עלינו בריאים וחזקים." },
      { key: "buttonText", label: "טקסט כפתור", type: "input" as const, default: "קראו עוד" },
    ],
  },
  {
    key: "howItWorks",
    label: "דף הבית - איך זה עובד",
    fields: [
      { key: "title", label: "כותרת", type: "input" as const, default: "איך זה עובד?" },
      { key: "subtitle", label: "תת כותרת", type: "input" as const, default: "שלושה צעדים פשוטים לטיפול מושלם" },
      { key: "step1Title", label: "שלב 1 - כותרת", type: "input" as const, default: "בחרו שירות" },
      { key: "step1Desc", label: "שלב 1 - תיאור", type: "input" as const, default: "עיינו במגוון הטיפולים שלי ובחרו את המתאים לכם ביותר" },
      { key: "step2Title", label: "שלב 2 - כותרת", type: "input" as const, default: "קבעו תור" },
      { key: "step2Desc", label: "שלב 2 - תיאור", type: "input" as const, default: "בחרו תאריך ושעה נוחים מתוך הזמנים הפנויים ביומן" },
      { key: "step3Title", label: "שלב 3 - כותרת", type: "input" as const, default: "הגיעו ותהנו" },
      { key: "step3Desc", label: "שלב 3 - תיאור", type: "input" as const, default: "הגיעו לטיפול, תנו לגוף לנוח, וצאו מחודשים ורעננים" },
    ],
  },
  {
    key: "gift_promo",
    label: "דף הבית - גיפט קארד",
    fields: [
      { key: "title", label: "כותרת", type: "input" as const, default: "מתנה שמרגישים 🎁" },
      { key: "subtitle", label: "תת כותרת", type: "textarea" as const, default: "פנקו מישהו שאתם אוהבים בגיפט קארד לטיפול או שיעור — הילה תכין כרטיס מתנה מעוצב אישית" },
      { key: "buttonText", label: "טקסט כפתור", type: "input" as const, default: "להזמנת גיפט קארד" },
    ],
  },
  {
    key: "about_page",
    label: "עמוד אודות",
    fields: [
      { key: "heroTitle", label: "כותרת Hero", type: "input" as const, default: "אודות" },
      { key: "heroSubtitle", label: "תת כותרת Hero", type: "input" as const, default: "הסיפור שלי, הדרך שלי, הגישה שלי" },
      { key: "bioTitle", label: "כותרת ביוגרפיה", type: "input" as const, default: "שלום, אני הילה חלפון" },
      {
        key: "bio",
        label: "ביוגרפיה (פסקאות מופרדות בשורה ריקה)",
        type: "textarea" as const,
        default:
          "אני מטפלת בעיסוי תאילנדי ומדריכת יוגה ופילאטיס, מתוך חיבור עמוק לגוף ולאנרגיה שבו.\n\nבעיסוי אני שואפת לעזור לגוף לשחרר ולפרק אנרגיות שלא משרתות אותו, לפתוח חסימות ולהחזיר תחושת זרימה טבעית.\n\nביוגה אני מתמקדת בהכנסת אנרגיה חדשה, דרך תנועה, נשימה ונוכחות, שמחזקת ומאזנת את הגוף והנפש.\n\nדרך פילאטיס נלמד לחזק את הגוף בלי לקצר אותו, לחבר אותנו לעבודה ממוקדת, פעולות שיסייעו לנו ביום יום וישמרו עלינו בריאים וחזקים.",
      },
      { key: "quote", label: "ציטוט", type: "textarea" as const, default: "עבורי, האיזון של הגוף הוא אלמנט מרכזי וחשוב מאוד בדרך לבריאות ולהרגשה טובה." },
      { key: "approachTitle", label: "כותרת גישה", type: "input" as const, default: "הגישה שלי" },
      { key: "certTitle", label: "כותרת הכשרות והסמכות", type: "input" as const, default: "הכשרות והסמכות" },
      { key: "cert1", label: "הסמכה 1", type: "input" as const, default: "עיסוי תאילנדי מוסמך" },
      { key: "cert2", label: "הסמכה 2", type: "input" as const, default: "הדרכת יוגה" },
      { key: "cert3", label: "הסמכה 3", type: "input" as const, default: "חיבור לגוף ולאנרגיה" },
      { key: "cert4", label: "הסמכה 4", type: "input" as const, default: "איזון גוף ונפש" },
      { key: "ctaTitle", label: "כותרת CTA", type: "input" as const, default: "מוכנים להתחיל?" },
      { key: "ctaText", label: "טקסט CTA", type: "input" as const, default: "קבעו את הטיפול הראשון שלכם ותרגישו את ההבדל" },
      { key: "ctaButton", label: "טקסט כפתור CTA", type: "input" as const, default: "קביעת תור ראשון" },
    ],
  },
  {
    key: "services",
    label: "שירותים",
    fields: [
      { key: "heroTitle", label: "כותרת Hero", type: "input" as const, default: "השירותים שלי" },
      { key: "heroSubtitle", label: "תת כותרת Hero", type: "input" as const, default: "מגוון טיפולים מקצועיים המותאמים לצרכים שלכם" },
      { key: "gridTitle", label: "כותרת רשימה", type: "input" as const, default: "השירותים שלי" },
      { key: "gridSubtitle", label: "תת כותרת רשימה", type: "input" as const, default: "מגוון טיפולים מקצועיים המותאמים לצרכים האישיים שלכם" },
    ],
  },
  {
    key: "reviews",
    label: "המלצות",
    fields: [
      { key: "title", label: "כותרת בדף הבית", type: "input" as const, default: "מה אומרים עליי" },
      { key: "heroTitle", label: "כותרת עמוד המלצות", type: "input" as const, default: "המלצות" },
      { key: "heroSubtitle", label: "תת כותרת עמוד המלצות", type: "input" as const, default: "מה הלקוחות שלנו אומרים" },
    ],
  },
  {
    key: "blog",
    label: "בלוג",
    fields: [
      { key: "heroTitle", label: "כותרת Hero", type: "input" as const, default: "הבלוג שלנו" },
      { key: "heroSubtitle", label: "תת כותרת Hero", type: "input" as const, default: "מאמרים, טיפים ותובנות מעולם היוגה והעיסוי" },
    ],
  },
  {
    key: "footer",
    label: "פוטר",
    fields: [
      { key: "description", label: "תיאור קצר", type: "textarea" as const, default: "טיפולי עיסוי מקצועיים, שיעורי יוגה פרטיים וקבוצתיים, ושיקום פציעות." },
    ],
  },
  {
    key: "contact",
    label: "צור קשר",
    fields: [
      { key: "heroTitle", label: "כותרת Hero", type: "input" as const, default: "צור קשר" },
      { key: "heroSubtitle", label: "תת כותרת Hero", type: "input" as const, default: "נשמח לשמוע מכם ולענות על כל שאלה" },
    ],
  },
  {
    key: "terms",
    label: "תקנון טיפולים",
    fields: [
      { key: "title", label: "כותרת", type: "input" as const, default: TERMS_TITLE },
      {
        key: "body",
        label: "נוסח התקנון (פסקאות מופרדות בשורה ריקה)",
        type: "textarea" as const,
        rows: 16,
        default: TERMS_BODY,
        help: "מומלץ שעורך דין יאשר שינויים בנוסח. שינוי מהותי מחייב עדכון גרסה אצל המפתח.",
      },
    ],
  },
  {
    key: "contact_info",
    label: "פרטי התקשרות",
    fields: [
      { key: "phone", label: "טלפון", type: "input" as const, inputType: "tel", default: CONTACT_PHONE, help: "המספר כפי שיוצג באתר, למשל 054-3135182" },
      { key: "whatsapp", label: "וואטסאפ", type: "input" as const, inputType: "tel", default: CONTACT_WHATSAPP, help: "מספר בפורמט בינלאומי, למשל 972501234567" },
      { key: "email", label: "אימייל", type: "input" as const, inputType: "email", default: CONTACT_EMAIL, help: "כתובת האימייל ליצירת קשר" },
      { key: "address", label: "כתובת", type: "input" as const, default: CONTACT_ADDRESS, help: "הכתובת מוצגת בפוטר ובעמוד צור קשר (כולל המפה)" },
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

  const getValue = (section: string, key: string, fallback = "") => {
    return localValues[`${section}::${key}`] ?? fallback;
  };

  const setValue = (section: string, key: string, value: string) => {
    setLocalValues((prev) => ({ ...prev, [`${section}::${key}`]: value }));
  };

  const saveField = async (section: string, key: string) => {
    const fieldKey = `${section}::${key}`;
    // Untouched field (focus-then-blur without typing) — skip so we don't
    // persist "" over the display fallback; mirrors saveSection's guard.
    if (localValues[fieldKey] === undefined) return;
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
        const value = localValues[`${sectionKey}::${field.key}`];
        // Only save fields the user actually typed into; skip untouched
        // fields so we don't blank them out (they fall back to defaults).
        if (value === undefined) continue;
        await fetch("/api/admin/site-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: sectionKey,
            key: field.key,
            value,
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
      try {
        for (const target of [qItem, aItem]) {
          if (!target) continue;
          const res = await fetch(`/api/admin/site-content?id=${target.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error();
        }
      } catch {
        toast.error("שגיאה במחיקת השאלה");
        return;
      }
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
          <Spinner label="טוען תוכן..." />
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
                          type={"inputType" in field ? field.inputType : undefined}
                          helperText={"help" in field ? field.help : undefined}
                          value={getValue(section.key, field.key, "default" in field ? field.default : "")}
                          onChange={(e) =>
                            setValue(section.key, field.key, e.target.value)
                          }
                          onBlur={() => saveField(section.key, field.key)}
                        />
                      ) : (
                        <Textarea
                          label={field.label}
                          helperText={"help" in field ? field.help : undefined}
                          value={getValue(section.key, field.key, "default" in field ? field.default : "")}
                          onChange={(e) =>
                            setValue(section.key, field.key, e.target.value)
                          }
                          onBlur={() => saveField(section.key, field.key)}
                          rows={"rows" in field ? field.rows : 4}
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

          {/* Google review link (used by the WhatsApp review-request messages) */}
          <Card className="p-0 overflow-hidden">
            <button
              onClick={() => toggleSection("settings")}
              className="w-full flex items-center justify-between px-4 py-3 bg-surface/50 border-b border-border hover:bg-surface transition-colors text-right"
            >
              <h3 className="font-semibold text-text">קישור ביקורת בגוגל</h3>
              {openSections["settings"] ? (
                <ChevronUp className="h-5 w-5 text-text-muted" />
              ) : (
                <ChevronDown className="h-5 w-5 text-text-muted" />
              )}
            </button>

            {openSections["settings"] && (
              <div className="p-4 space-y-4">
                <Input
                  label="קישור לכתיבת ביקורת בגוגל"
                  type="url"
                  dir="ltr"
                  placeholder="https://g.page/r/..."
                  value={getValue("settings", "google_review_link")}
                  onChange={(e) =>
                    setValue("settings", "google_review_link", e.target.value)
                  }
                  onBlur={() => saveField("settings", "google_review_link")}
                />
                {!getValue("settings", "google_review_link").trim() && (
                  <p className="text-sm text-text-secondary bg-warning/10 border border-warning/20 rounded-lg px-3 py-2">
                    עד שיוגדר קישור — הודעות בקשת הביקורת ישתמשו בקישור חיפוש
                    של העסק במפות גוגל.
                  </p>
                )}
                <div className="bg-surface rounded-lg p-3 text-sm text-text-secondary leading-relaxed">
                  <p className="font-medium text-text mb-1">איך משיגים את הקישור?</p>
                  <ol className="space-y-1 pr-4 list-decimal">
                    <li>
                      פתחי את אפליקציית Google Business Profile (או חפשי בגוגל את
                      שם העסק כשאת מחוברת לחשבון העסק).
                    </li>
                    <li>לחצי על &quot;בקש ביקורות&quot; (Ask for reviews).</li>
                    <li>העתיקי את הקישור הקצר והדביקי אותו כאן.</li>
                  </ol>
                </div>
              </div>
            )}
          </Card>

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

                <div className="flex flex-wrap gap-3">
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
