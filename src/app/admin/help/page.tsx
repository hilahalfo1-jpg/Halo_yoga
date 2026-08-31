import {
  FileText,
  BookOpen,
  Settings2,
  Calendar,
  MessageSquare,
  MessageCircle,
  Gift,
  PlusSquare,
  Megaphone,
  Lightbulb,
} from "lucide-react";
import Card from "@/components/ui/Card";

interface Section {
  icon: React.ElementType;
  title: string;
  steps: string[];
  note?: string;
}

const SECTIONS: Section[] = [
  {
    icon: FileText,
    title: "עריכת תוכן בעמודים (אודות, שירותים, דף הבית)",
    steps: [
      'בתפריט הצדדי לחצי על "תוכן האתר".',
      "הטקסט שמופיע באתר מוצג בתיבות עריכה. שני או מחקי כרצונך.",
      "השינוי נשמר אוטומטית כשלוחצים מחוץ לתיבה — ומתעדכן באתר מיד.",
    ],
    note: 'חלקים עם עיצוב מורכב (כמו רשימת היתרונות ב"הגישה שלי") קבועים — לשינוי בהם פני למפתח.',
  },
  {
    icon: BookOpen,
    title: "הוספת פוסט לבלוג",
    steps: [
      'תפריט ← "בלוג" ← "פוסט חדש".',
      "מלאי כותרת, תוכן, תקציר, קטגוריה ותמונה (אופציונלי). אפשר גם להיעזר בכפתור יצירת תוכן עם AI לטיוטה.",
      'סמני "פרסם" כדי שהפוסט יופיע באתר (טיוטה לא מתפרסמת).',
    ],
  },
  {
    icon: Megaphone,
    title: "לשתף את הפוסט גם בגוגל לעסק (Google Business)",
    steps: [
      'כתבי ופרסמי את הפוסט כאן באתר (תפריט ← "בלוג").',
      "היכנסי לפרופיל העסק שלך בגוגל — חפשי בגוגל את שם העסק כשאת מחוברת לחשבון, או היכנסי ל-business.google.com.",
      'לחצי על "קדם" / "הוסף עדכון" (Add update / Post).',
      "העתיקי את כותרת הפוסט והתקציר מהאתר, הוסיפי תמונה, והדביקי קישור לפוסט המלא באתר (הכתובת שמופיעה בדפדפן כשפותחים את הפוסט, למשל haloyogamassage.com/blog/...).",
      "פרסמי. זהו — הפוסט מופיע גם בגוגל.",
    ],
    note: "💡 הזכרה: בלוח הבקרה מופיע באנר שמזכיר לך פעם בשבוע להעלות פוסט חדש.",
  },
  {
    icon: Settings2,
    title: "ניהול שירותים",
    steps: [
      'תפריט ← "שירותים": הוספה/עריכה של שירות, מחיר, משך זמן ותמונה.',
    ],
  },
  {
    icon: Calendar,
    title: "הזמנות וזמינות",
    steps: [
      '"הזמנות" — כל התורים, סינון, ייצוא ל-CSV, ו"תיאום תור חדש" ללקוח חוזר.',
      '"זמינות" — שעות הפעילות וחסימת ימים/תאריכים ספציפיים.',
      'סנכרון יומן לאייפון — בעמוד "הזמנות" כפתור "הוסף ליומן אייפון" (לחיצה מהאייפון מוסיפה את כל ההזמנות ליומן).',
    ],
  },
  {
    icon: MessageSquare,
    title: "פניות מול אנשי קשר",
    steps: [
      '"פניות" = הודעות שאנשים שלחו דרך טופס "צור קשר" באתר.',
      '"אנשי קשר" = כל מי שקבע תור או ניסה לקבוע — רשימת הלקוחות שלך.',
    ],
    note: "זה מבלבל הרבה — שימי לב להבדל בין השניים.",
  },
  {
    icon: Gift,
    title: "גיפט קארד",
    steps: [
      'תפריט ← "גיפט קארד": יצירת שובר מתנה ובחירת תבנית עיצוב.',
    ],
  },
  {
    icon: MessageCircle,
    title: "הודעות וואטסאפ ללקוחות (ידני + אוטומטי)",
    steps: [
      'ידני — עובד תמיד: בעמוד "הזמנות" יש ליד כל תור כפתור וואטסאפ שפותח הודעה מוכנה לפי הסטטוס (התקבל / אושר / נדחה / בקשת ביקורת). כפתור דומה יש בעמוד "גיפט קארד" לשליחת הכרטיס לרוכש/ת. סימן ✓ על הכפתור מציין שההודעה כבר נשלחה.',
      'כדי שבקשת הביקורת תוביל לעמוד הביקורות שלך בגוגל — הדביקי את הקישור בעמוד "תוכן האתר" ← "קישור ביקורת בגוגל".',
      "אוטומטי — הקמה חד-פעמית ב-ManyChat: חשבון מחובר לוואטסאפ העסקי + API Token שמוזן ב-Vercel (MANYCHAT_API_TOKEN).",
      "ב-ManyChat: שדה wa_phone עם חוק (Rule) שמעתיק אליו את wa_id, הרשאת יצירת מנויים לפי טלפון (phone import), ושדות פרסונליזציה: booking_service, booking_datetime, review_link, cancel_link, card_url (שם פרטי הוא שדה מערכת).",
      "מגישים ל-Meta את שש תבניות ההודעה (קטגוריית Utility) — כבר ביום הראשון! האישור יכול לקחת עד יומיים.",
      "מעתיקים את מזהה ה-Flow (flow_ns) של כל תבנית למשתני MANYCHAT_FLOW_* ב-Vercel (הפירוט המלא במסמך ההקמה אצל המפתח).",
    ],
    note: "עד שההקמה האוטומטית מושלמת — הכפתורים הידניים עושים את אותה עבודה, והם נשארים כגיבוי גם אחרי.",
  },
  {
    icon: PlusSquare,
    title: "הוספת עמוד חדש לגמרי לאתר",
    steps: [
      'הוספת עמוד חדש (למשל "תקנון" או "שאלות נפוצות" כעמוד נפרד) דורשת עבודת פיתוח. רכזי את התוכן הרצוי ופני למפתח — הוא יוסיף את העמוד תוך זמן קצר.',
    ],
  },
];

export default function AdminHelpPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">מדריך ניהול האתר</h1>
        <p className="text-text-muted text-sm mt-1">
          כל מה שצריך כדי לנהל את האתר לבד
        </p>
      </div>

      <div className="space-y-5">
        {SECTIONS.map((section, idx) => {
          const Icon = section.icon;
          return (
            <Card key={idx} className="p-5">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-secondary" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-text text-lg leading-snug">
                    <span className="text-text-muted font-bold">{idx + 1}.</span>{" "}
                    {section.title}
                  </h2>

                  <ol className="mt-3 space-y-2 text-sm text-text-secondary leading-relaxed">
                    {section.steps.map((step, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="shrink-0 text-secondary font-medium">
                          {section.steps.length > 1 ? `${i + 1}.` : "•"}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>

                  {section.note && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/20 px-3 py-2">
                      <Lightbulb
                        className="h-4 w-4 text-warning shrink-0 mt-0.5"
                        strokeWidth={1.5}
                      />
                      <p className="text-xs text-text-secondary leading-relaxed">
                        <span className="font-semibold text-text">הערה: </span>
                        {section.note}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 p-5 bg-primary/5 border-primary/20">
        <p className="text-sm text-text-secondary leading-relaxed text-center">
          נתקעת? כל שינוי שאי אפשר לעשות לבד מהמערכת — פני למפתח ונוסיף אותו.
        </p>
      </Card>
    </div>
  );
}
