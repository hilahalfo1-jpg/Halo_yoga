import type { NavLink } from "@/types";

// ─── Site Info ───────────────────────────────────────
export const SITE_NAME = "HALO";
export const SITE_NAME_HE = "הילה";
export const SITE_TAGLINE = "Yoga & Massage";
export const SITE_TAGLINE_HE = "יוגה ועיסוי";
export const THERAPIST_NAME = "הילה";
export const THERAPIST_TITLE = "מעסה רפואי מוסמך ומורה ליוגה";
export const LOGO_PATH = "/images/logo.png";

export const CONTACT_PHONE = "050-1234567";
export const CONTACT_WHATSAPP = "972501234567";
export const CONTACT_EMAIL = "info@healing.co.il";
export const CONTACT_ADDRESS = "רחוב הרופא 15, תל אביב";

// ─── Navigation ──────────────────────────────────────
export const NAV_LINKS: NavLink[] = [
  { label: "דף הבית", href: "/" },
  { label: "אודות", href: "/about" },
  { label: "שירותים", href: "/services" },
  { label: "קביעת תור", href: "/booking" },
  { label: "המלצות", href: "/reviews" },
  { label: "צור קשר", href: "/contact" },
];

export const ADMIN_NAV_LINKS: NavLink[] = [
  { label: "לוח בקרה", href: "/admin" },
  { label: "הזמנות", href: "/admin/bookings" },
  { label: "שירותים", href: "/admin/services" },
  { label: "זמינות", href: "/admin/availability" },
  { label: "תמונות", href: "/admin/images" },
  { label: "פניות", href: "/admin/leads" },
  { label: "המלצות", href: "/admin/reviews" },
];

// ─── Categories ──────────────────────────────────────
export const CATEGORY_LABELS: Record<string, string> = {
  MASSAGE: "עיסויים",
  YOGA: "יוגה",
  REHABILITATION: "שיקום",
};

export const CATEGORY_OPTIONS = [
  { value: "ALL", label: "הכל" },
  { value: "MASSAGE", label: "עיסויים" },
  { value: "YOGA", label: "יוגה" },
  { value: "REHABILITATION", label: "שיקום" },
];

// ─── Booking Status ──────────────────────────────────
export const BOOKING_STATUS_LABELS: Record<string, string> = {
  PENDING: "ממתין",
  CONFIRMED: "מאושר",
  CANCELLED: "בוטל",
  COMPLETED: "הושלם",
  NO_SHOW: "לא הגיע",
};

export const BOOKING_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-warning/10 text-warning border-warning/20",
  CONFIRMED: "bg-success/10 text-success border-success/20",
  CANCELLED: "bg-error/10 text-error border-error/20",
  COMPLETED: "bg-info/10 text-info border-info/20",
  NO_SHOW: "bg-gray-100 text-gray-500 border-gray-200",
};

// ─── Lead Status ─────────────────────────────────────
export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "חדש",
  IN_PROGRESS: "בטיפול",
  CLOSED: "סגור",
};

export const LEAD_STATUS_COLORS: Record<string, string> = {
  NEW: "bg-info/10 text-info border-info/20",
  IN_PROGRESS: "bg-warning/10 text-warning border-warning/20",
  CLOSED: "bg-gray-100 text-gray-500 border-gray-200",
};

// ─── Contact Subjects ────────────────────────────────
export const CONTACT_SUBJECTS = [
  { value: "general", label: "שאלה כללית" },
  { value: "massage", label: "עיסויים" },
  { value: "yoga", label: "יוגה" },
  { value: "rehab", label: "שיקום" },
  { value: "other", label: "אחר" },
];

// ─── Days of Week (Hebrew, starting Sunday) ──────────
export const DAYS_OF_WEEK_HE = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
];

// ─── Slot Configuration ─────────────────────────────
export const SLOT_BUFFER_MINUTES = 15;

// ─── FAQ ─────────────────────────────────────────────
export const FAQ_ITEMS = [
  {
    question: "כמה זמן נמשך עיסוי?",
    answer:
      "משך הטיפול משתנה בהתאם לסוג העיסוי — בין 45 דקות לרפלקסולוגיה ועד 75 דקות לעיסוי רקמות עמוקות. בעת קביעת התור תוכלו לראות את משך הטיפול המדויק לכל שירות.",
  },
  {
    question: "האם צריך הפניית רופא?",
    answer:
      "לא, אין צורך בהפניית רופא לעיסוי רפואי או שיעורי יוגה. עם זאת, אם יש לכם בעיה רפואית ספציפית, מומלץ להתייעץ עם הרופא המטפל לפני תחילת הטיפולים.",
  },
  {
    question: "איך מבטלים תור?",
    answer:
      "ניתן לבטל תור דרך הקישור שנשלח אליכם בהודעת האישור, או ליצור קשר טלפוני. אנא בטלו לפחות 24 שעות מראש כדי לאפשר לאחרים לקבוע תור.",
  },
  {
    question: "האם אפשר לשלם בכרטיס אשראי?",
    answer:
      "כן, אנחנו מקבלים תשלום במזומן, בכרטיס אשראי, בביט ובהעברה בנקאית. התשלום מתבצע בסיום הטיפול.",
  },
  {
    question: "מה ללבוש לשיעור יוגה?",
    answer:
      "מומלץ ללבוש בגדים נוחים ואלסטיים שמאפשרים טווח תנועה מלא. אין צורך בנעליים — מתרגלים יחפים או עם גרביים. מזרן יוגה מסופק, אך מוזמנים להביא משלכם.",
  },
  {
    question: "האם מתאים לנשים בהריון?",
    answer:
      "חלק מהטיפולים מותאמים לנשים בהריון, כמו עיסוי שוודי בהתאמה מיוחדת ויוגה להריון. חשוב לציין זאת בעת קביעת התור כדי שנוכל להתאים את הטיפול. מומלץ להתייעץ עם רופא/ת הנשים.",
  },
];

// ─── Working Hours Display ──────────────────────────
export const WORKING_HOURS = [
  { day: "ראשון - חמישי", hours: "09:00 - 18:00" },
  { day: "שישי", hours: "סגור" },
  { day: "שבת", hours: "סגור" },
];
