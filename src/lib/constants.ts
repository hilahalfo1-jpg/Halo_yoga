import type { NavLink } from "@/types";

// ─── Site Info ───────────────────────────────────────
export const SITE_NAME = "HALO";
export const SITE_NAME_HE = "הילה";
export const SITE_TAGLINE = "Yoga & Massage";
export const SITE_TAGLINE_HE = "יוגה ועיסוי";
export const THERAPIST_NAME = "הילה";
export const THERAPIST_TITLE = "מעסה תאילנדי מוסמכת, מדריכת יוגה ופילאטיס";
export const LOGO_PATH = "/images/logo.png";

export const CONTACT_PHONE = "054-3135182";
export const CONTACT_WHATSAPP = "972502919918";
export const CONTACT_EMAIL = "hilahalfo1@gmail.com";
export const CONTACT_ADDRESS = "שכונת משולש, זבוטינסקי, ראשון לציון";
export const SOCIAL_INSTAGRAM = "";
export const SOCIAL_FACEBOOK = "";

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
  { label: "גיפט קארד", href: "/admin/gift-cards" },
];

// ─── Categories ──────────────────────────────────────
export const CATEGORY_LABELS: Record<string, string> = {
  MASSAGE: "עיסויים",
  YOGA: "יוגה",
  PILATES: "פילאטיס",
};

export const CATEGORY_OPTIONS = [
  { value: "ALL", label: "הכל" },
  { value: "MASSAGE", label: "עיסויים" },
  { value: "YOGA", label: "יוגה" },
  { value: "PILATES", label: "פילאטיס" },
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
  { value: "pilates", label: "פילאטיס" },
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

// ─── Service Icons ──────────────────────────────────
export const SERVICE_ICON_OPTIONS = [
  { value: "Hand", label: "יד (עיסוי)" },
  { value: "Flower2", label: "פרח לוטוס" },
  { value: "Leaf", label: "עלה" },
  { value: "TreePine", label: "עץ" },
  { value: "Sprout", label: "נבט" },
  { value: "Mountain", label: "הר" },
  { value: "Sun", label: "שמש" },
  { value: "Moon", label: "ירח" },
  { value: "Waves", label: "גלים" },
  { value: "Wind", label: "רוח" },
  { value: "Droplets", label: "טיפות" },
  { value: "Heart", label: "לב" },
  { value: "HeartHandshake", label: "לב ידיים" },
  { value: "Sparkles", label: "ניצוצות" },
  { value: "Star", label: "כוכב" },
  { value: "Gem", label: "אבן חן" },
  { value: "Feather", label: "נוצה" },
  { value: "Flame", label: "להבה" },
  { value: "Shell", label: "צדפה" },
  { value: "Activity", label: "דופק" },
  { value: "Dumbbell", label: "משקולת" },
  { value: "Footprints", label: "כפות רגליים" },
  { value: "Users", label: "קבוצה" },
  { value: "User", label: "אדם" },
  { value: "Baby", label: "תינוק" },
  { value: "CloudSun", label: "שמש וענן" },
  { value: "Sunrise", label: "זריחה" },
  { value: "Bird", label: "ציפור" },
  { value: "CircleDot", label: "עיגול" },
  { value: "Orbit", label: "מסלול" },
];

// ─── Slot Configuration ─────────────────────────────
export const SLOT_BUFFER_MINUTES = 15;

// ─── FAQ ─────────────────────────────────────────────
export const FAQ_ITEMS = [
  {
    question: "מה מדיניות הביטולים?",
    answer:
      "ביטול תור של פחות מ-24 שעות יהיה כרוך בתשלום מלא.",
  },
  {
    question: "האם אפשר לשלם בכרטיס אשראי?",
    answer:
      "כרגע אי אפשר לשלם בכרטיס אשראי. ניתן לשלם במזומן, העברה בנקאית, או אפליקציית תשלום (ביט או פייבוקס).",
  },
  {
    question: "האם השירותים מתאימים לנשים בהריון?",
    answer:
      "כל השירותים מותאמים לנשים בהריון למעט פוט מאסז'. מומלץ לציין זאת בעת קביעת התור.",
  },
  {
    question: "האם צריך הפניית רופא?",
    answer:
      "לא, אין צורך בהפניית רופא. עם זאת, לעיסוי רפואי (אקוספורה תאילנדית) יש ליצור קשר לבדיקת התאמה.",
  },
  {
    question: "האם יש אפשרות לטיפול בבית?",
    answer:
      "כן, חלק מהשירותים כוללים אפשרות להגעה לבית הלקוח, כולל ציוד מלא. פרטים נוספים בעמוד השירותים.",
  },
];

// ─── Working Hours Display ──────────────────────────
export const WORKING_HOURS = [
  { day: "ראשון", hours: "11:00 - 20:00" },
  { day: "שני", hours: "07:00 - 20:00" },
  { day: "שלישי", hours: "סגור" },
  { day: "רביעי", hours: "07:00 - 20:00" },
  { day: "חמישי", hours: "07:00 - 20:00" },
  { day: "שישי", hours: "09:00 - 17:00" },
  { day: "שבת", hours: "11:00 - 18:30" },
];
