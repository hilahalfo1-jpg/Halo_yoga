# Halo Yoga — Admin System Full Code Export

Generated: Tue Mar 10 11:02:30 IST 2026

---

# 1. DATABASE SCHEMA

## `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── AUTH ────────────────────────────────
model User {
  id             String   @id @default(cuid())
  email          String   @unique
  hashedPassword String
  name           String
  role           String   @default("ADMIN")
  createdAt      DateTime @default(now())
}

// ─── SERVICES ────────────────────────────
model Service {
  id                  String    @id @default(cuid())
  slug                String    @unique
  name                String
  shortDesc           String
  description         String
  category            String    @default("MASSAGE")
  duration            Int
  price               Int
  image               String?
  icon                String?
  suitableFor         String?
  sortOrder           Int       @default(0)
  isActive            Boolean   @default(true)
  homeVisitSurcharge  Int?
  bookings            Booking[]
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
}

// ─── AVAILABILITY ────────────────────────
model AvailabilityRule {
  id        String   @id @default(cuid())
  dayOfWeek Int
  startTime String
  endTime   String
  isActive  Boolean  @default(true)
  category  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model AvailabilityException {
  id        String   @id @default(cuid())
  date      DateTime
  type      String   @default("BLOCKED")
  startTime String?
  endTime   String?
  reason    String?
  category  String?
  createdAt DateTime @default(now())
}

// ─── BOOKINGS ────────────────────────────
model Booking {
  id                 String    @id @default(cuid())
  service            Service   @relation(fields: [serviceId], references: [id])
  serviceId          String
  startAt            DateTime
  endAt              DateTime
  status             String    @default("PENDING")
  customerName       String
  customerPhone      String
  customerEmail      String?
  notes              String?
  adminNotes         String?
  isHomeVisit        Boolean   @default(false)
  homeVisitSurcharge Int?
  cancelToken        String    @unique @default(cuid())
  cancelledAt        DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@unique([startAt, endAt])
  @@index([status])
  @@index([startAt])
}

// ─── LEADS ───────────────────────────────
model Lead {
  id        String   @id @default(cuid())
  name      String
  phone     String
  email     String?
  subject   String?
  message   String
  status    String   @default("NEW")
  adminNotes String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ─── SITE IMAGES ────────────────────────
model SiteImage {
  id        String   @id @default(cuid())
  section   String
  imagePath String
  alt       String   @default("")
  sortOrder Int      @default(0)
  updatedAt DateTime @updatedAt

  @@index([section])
}

// ─── SITE CONTENT ──────────────────────────
model SiteContent {
  id        String   @id @default(cuid())
  section   String
  key       String
  value     String
  sortOrder Int      @default(0)
  updatedAt DateTime @updatedAt

  @@unique([section, key])
  @@index([section])
}

// ─── GIFT CARDS ─────────────────────────
model GiftCard {
  id           String   @id @default(cuid())
  recipientName String
  senderName    String?
  serviceName   String
  message       String
  code          String   @unique @default(cuid())
  isRedeemed    Boolean  @default(false)
  redeemedAt    DateTime?
  createdAt     DateTime @default(now())
}

// ─── REVIEWS ─────────────────────────────
model Review {
  id         String   @id @default(cuid())
  name       String
  rating     Int
  content    String
  service    String?
  isApproved Boolean  @default(false)
  createdAt  DateTime @default(now())
}

```

---

# 2. CORE LIBRARIES

## `src/lib/prisma.ts`

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

```

---

## `src/lib/auth.ts`

```ts
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const ALLOWED_EMAIL = "hilahalfo1@gmail.com";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        return profile?.email === ALLOWED_EMAIL;
      }
      return false;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = "ADMIN";
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

```

---

## `src/lib/validations.ts`

```ts
import { z } from "zod";

// Israeli phone: 05X-XXXXXXX or 05XXXXXXXX
const phoneRegex = /^05\d[-]?\d{7}$/;

export const bookingSchema = z.object({
  serviceId: z.string().min(1, "יש לבחור שירות"),
  startAt: z.string().min(1, "יש לבחור מועד"),
  customerName: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  customerPhone: z
    .string()
    .regex(phoneRegex, "מספר טלפון לא תקין (05X-XXXXXXX)"),
  customerEmail: z
    .string()
    .email("כתובת אימייל לא תקינה")
    .optional()
    .or(z.literal("")),
  notes: z.string().max(500, "ההערה ארוכה מדי").optional(),
  isHomeVisit: z.boolean().optional(),
});

export type BookingFormData = z.infer<typeof bookingSchema>;

export const contactSchema = z.object({
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  phone: z.string().regex(phoneRegex, "מספר טלפון לא תקין"),
  email: z
    .string()
    .email("אימייל לא תקין")
    .optional()
    .or(z.literal("")),
  subject: z.string().optional(),
  message: z
    .string()
    .min(10, "ההודעה קצרה מדי")
    .max(2000, "ההודעה ארוכה מדי"),
});

export type ContactFormData = z.infer<typeof contactSchema>;

export const reviewSchema = z.object({
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  rating: z.number().min(1, "יש לבחור דירוג").max(5),
  content: z
    .string()
    .min(10, "ההמלצה קצרה מדי")
    .max(1000, "ההמלצה ארוכה מדי"),
  service: z.string().optional(),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;

export const serviceSchema = z.object({
  name: z.string().min(2, "שם השירות חייב להכיל לפחות 2 תווים"),
  slug: z
    .string()
    .regex(
      /^[a-z0-9-]+$/,
      "slug חייב להכיל אותיות אנגליות קטנות ומקפים בלבד"
    ),
  shortDesc: z
    .string()
    .min(10, "תיאור קצר חייב להכיל לפחות 10 תווים")
    .max(200, "תיאור קצר ארוך מדי"),
  description: z
    .string()
    .min(20, "תיאור חייב להכיל לפחות 20 תווים"),
  category: z.enum(["MASSAGE", "YOGA", "PILATES"], {
    message: "יש לבחור קטגוריה",
  }),
  duration: z
    .number()
    .int()
    .min(15, "משך מינימלי 15 דקות")
    .max(240, "משך מקסימלי 240 דקות"),
  price: z.number().int().min(0, "מחיר חייב להיות חיובי"),
  image: z.string().url("כתובת URL לא תקינה").optional().or(z.literal("")),
  icon: z.string().optional().or(z.literal("")),
  suitableFor: z.string().max(1000, "הטקסט ארוך מדי").optional().or(z.literal("")),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  homeVisitSurcharge: z.number().int().min(0, "תוספת חייבת להיות חיובית").nullable().optional(),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;

export const availabilityRuleSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "פורמט שעה לא תקין"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "פורמט שעה לא תקין"),
    isActive: z.boolean(),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: "שעת סיום חייבת להיות אחרי שעת התחלה",
    path: ["endTime"],
  });

export type AvailabilityRuleFormData = z.infer<typeof availabilityRuleSchema>;

export const availabilityExceptionSchema = z.object({
  date: z.string().min(1, "יש לבחור תאריך"),
  type: z.enum(["BLOCKED", "OVERRIDE"], {
    message: "יש לבחור סוג",
  }),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "פורמט שעה לא תקין")
    .optional(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "פורמט שעה לא תקין")
    .optional(),
  reason: z.string().max(200, "הסיבה ארוכה מדי").optional(),
});

export type AvailabilityExceptionFormData = z.infer<
  typeof availabilityExceptionSchema
>;

export const loginSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  password: z.string().min(1, "יש להזין סיסמה"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

```

---

## `src/lib/slots.ts`

```ts
import { prisma } from "./prisma";
import { SLOT_BUFFER_MINUTES } from "./constants";
import type { TimeSlot } from "@/types";

/**
 * Parse "HH:mm" string to { hours, minutes }
 */
function parseTime(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

/**
 * Create a Date object at a specific time on a given date
 */
function setTime(date: Date, timeStr: string): Date {
  const { hours, minutes } = parseTime(timeStr);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Format Date to "HH:mm"
 */
function formatTimeStr(date: Date): string {
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

/**
 * Generate slots for a single time window
 */
function generateSlotsForWindow(
  targetDate: Date,
  startTime: string,
  endTime: string,
  slotDuration: number,
  buffer: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const windowStart = setTime(targetDate, startTime);
  const windowEnd = setTime(targetDate, endTime);

  let current = new Date(windowStart);

  while (true) {
    const slotEnd = new Date(current.getTime() + slotDuration * 60 * 1000);
    if (slotEnd > windowEnd) break;

    slots.push({
      startTime: formatTimeStr(current),
      endTime: formatTimeStr(slotEnd),
      isAvailable: true,
    });

    current = new Date(slotEnd.getTime() + buffer * 60 * 1000);
  }

  return slots;
}

/**
 * Get available time slots for a given date and service.
 *
 * Supports multiple time windows per day (e.g., 8:00-16:00 and 19:00-21:00).
 */
export async function getAvailableSlots(
  date: Date,
  serviceId: string
): Promise<TimeSlot[]> {
  // 1. Get the service duration and category
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { duration: true, category: true },
  });

  if (!service) return [];

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  const dayOfWeek = targetDate.getDay();

  // 2. Check exceptions for this date (category-specific first, then global)
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const exceptions = await prisma.availabilityException.findMany({
    where: {
      date: {
        gte: targetDate,
        lt: nextDay,
      },
      OR: [
        { category: service.category },
        { category: null },
      ],
    },
  });

  const exception =
    exceptions.find((e) => e.category === service.category) ||
    exceptions.find((e) => !e.category) ||
    null;

  // Build list of time windows
  type TimeWindow = { start: string; end: string };
  let windows: TimeWindow[] = [];

  if (exception) {
    if (exception.type === "BLOCKED") {
      return [];
    }
    if (!exception.startTime || !exception.endTime) return [];
    windows = [{ start: exception.startTime, end: exception.endTime }];
  } else {
    // 3. Get ALL active rules for this day (category-specific first, then global)
    const catRules = await prisma.availabilityRule.findMany({
      where: {
        dayOfWeek,
        isActive: true,
        category: service.category,
      },
      orderBy: { startTime: "asc" },
    });

    const globalRules = await prisma.availabilityRule.findMany({
      where: {
        dayOfWeek,
        isActive: true,
        category: null,
      },
      orderBy: { startTime: "asc" },
    });

    // Use category-specific rules if any exist, otherwise fall back to global
    const activeRules = catRules.length > 0 ? catRules : globalRules;

    if (activeRules.length === 0) return [];

    windows = activeRules.map((r) => ({ start: r.startTime, end: r.endTime }));
  }

  // 4. Generate slots for all windows
  const slotDuration = service.duration;
  const buffer = SLOT_BUFFER_MINUTES;

  let allSlots: TimeSlot[] = [];
  for (const win of windows) {
    const windowSlots = generateSlotsForWindow(
      targetDate,
      win.start,
      win.end,
      slotDuration,
      buffer
    );
    allSlots = allSlots.concat(windowSlots);
  }

  if (allSlots.length === 0) return [];

  // 5. Get existing bookings for this date (non-cancelled)
  const earliestStart = windows.reduce(
    (min, w) => (w.start < min ? w.start : min),
    windows[0].start
  );
  const latestEnd = windows.reduce(
    (max, w) => (w.end > max ? w.end : max),
    windows[0].end
  );

  const dayStart = setTime(targetDate, earliestStart);
  const dayEnd = setTime(targetDate, latestEnd);

  const bookings = await prisma.booking.findMany({
    where: {
      startAt: { gte: dayStart },
      endAt: { lte: dayEnd },
      status: { not: "CANCELLED" },
    },
    select: { startAt: true, endAt: true },
  });

  // 6. Filter out occupied and past slots
  const now = new Date();

  return allSlots.map((slot) => {
    const slotStart = setTime(targetDate, slot.startTime);
    const slotEnd = setTime(targetDate, slot.endTime);

    if (slotStart <= now) {
      return { ...slot, isAvailable: false };
    }

    const hasConflict = bookings.some((booking) => {
      return slotStart < booking.endAt && slotEnd > booking.startAt;
    });

    return { ...slot, isAvailable: !hasConflict };
  });
}

/**
 * Check if a specific slot is still available (for booking creation).
 */
export async function isSlotAvailable(
  startAt: Date,
  endAt: Date
): Promise<boolean> {
  const conflicting = await prisma.booking.findFirst({
    where: {
      status: { not: "CANCELLED" },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });

  return !conflicting;
}

```

---

## `src/lib/constants.ts`

```ts
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
export const SOCIAL_INSTAGRAM = "https://www.instagram.com/halo.yoga.massage/";
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

```

---

## `src/lib/utils.ts`

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { he } from "date-fns/locale";

// ─── Class Name Utility ─────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Price Formatting ───────────────────────────────
export function formatPrice(price: number): string {
  return `₪${price}`;
}

// ─── Phone Formatting ───────────────────────────────
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  return phone;
}

// ─── Date Formatting ────────────────────────────────
export function formatDate(date: string | Date): string {
  return format(new Date(date), "d בMMMM yyyy", { locale: he });
}

export function formatDateShort(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy", { locale: he });
}

export function formatTime(date: string | Date): string {
  return format(new Date(date), "HH:mm");
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: he });
}

export function formatDayName(date: string | Date): string {
  return format(new Date(date), "EEEE", { locale: he });
}

// ─── Duration Formatting ────────────────────────────
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} דקות`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) {
    return hours === 1 ? "שעה" : `${hours} שעות`;
  }
  return `${hours === 1 ? "שעה" : `${hours} שעות`} ו-${remaining} דקות`;
}

// ─── Slug Generation ────────────────────────────────
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

```

---

## `src/lib/email.ts`

```ts
import { Resend } from "resend";

const FROM_EMAIL = "Halo Yoga <noreply@haloyogamassage.com>";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  startAt: Date;
  cancelToken?: string;
}

export async function sendBookingApprovedEmail(data: BookingEmailData) {
  if (!data.customerEmail || !process.env.RESEND_API_KEY) return;

  const date = formatDate(new Date(data.startAt));
  const time = formatTime(new Date(data.startAt));
  const siteUrl = process.env.NEXTAUTH_URL || "https://haloyogamassage.com";

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `ההזמנה שלך אושרה - ${data.serviceName}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #5C7C5A;">ההזמנה שלך אושרה!</h2>
          <p>שלום ${data.customerName},</p>
          <p>שמחים לעדכן שההזמנה שלך אושרה:</p>
          <div style="background: #f5f5f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>שירות:</strong> ${data.serviceName}</p>
            <p style="margin: 4px 0;"><strong>תאריך:</strong> ${date}</p>
            <p style="margin: 4px 0;"><strong>שעה:</strong> ${time}</p>
          </div>
          ${data.cancelToken ? `<p style="font-size: 14px; color: #666;">לביטול ההזמנה: <a href="${siteUrl}/cancel/${data.cancelToken}">לחצו כאן</a></p>` : ""}
          <p>נתראה!</p>
          <p style="color: #5C7C5A; font-weight: bold;">Halo Yoga & Massage</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("[EMAIL_APPROVED]", error);
  }
}

export async function sendBookingRejectedEmail(data: BookingEmailData) {
  if (!data.customerEmail || !process.env.RESEND_API_KEY) return;

  const date = formatDate(new Date(data.startAt));
  const time = formatTime(new Date(data.startAt));

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `עדכון לגבי ההזמנה - ${data.serviceName}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #5C7C5A;">עדכון לגבי ההזמנה</h2>
          <p>שלום ${data.customerName},</p>
          <p>לצערנו לא ניתן לאשר את ההזמנה הבאה:</p>
          <div style="background: #f5f5f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>שירות:</strong> ${data.serviceName}</p>
            <p style="margin: 4px 0;"><strong>תאריך:</strong> ${date}</p>
            <p style="margin: 4px 0;"><strong>שעה:</strong> ${time}</p>
          </div>
          <p>ניתן ליצור קשר לתיאום מועד חלופי.</p>
          <p>בברכה,</p>
          <p style="color: #5C7C5A; font-weight: bold;">Halo Yoga & Massage</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("[EMAIL_REJECTED]", error);
  }
}

```

---

# 3. TYPES

## `src/types/index.ts`

```ts
// ─── Enums (mirroring Prisma, usable on client) ─────
export type Category = "MASSAGE" | "YOGA" | "PILATES";
export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";
export type LeadStatus = "NEW" | "IN_PROGRESS" | "CLOSED";
export type ExceptionType = "BLOCKED" | "OVERRIDE";

// ─── Service ─────────────────────────────────────────
export interface ServiceItem {
  id: string;
  slug: string;
  name: string;
  shortDesc: string;
  description: string;
  category: Category;
  duration: number;
  price: number;
  image: string | null;
  icon: string | null;
  suitableFor: string | null;
  sortOrder: number;
  isActive: boolean;
  homeVisitSurcharge: number | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Booking ─────────────────────────────────────────
export interface BookingItem {
  id: string;
  serviceId: string;
  service?: ServiceItem;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  notes: string | null;
  adminNotes: string | null;
  isHomeVisit: boolean;
  homeVisitSurcharge: number | null;
  cancelToken: string;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Time Slot ───────────────────────────────────────
export interface TimeSlot {
  startTime: string; // "09:00"
  endTime: string; // "10:00"
  isAvailable: boolean;
}

// ─── Lead ────────────────────────────────────────────
export interface LeadItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  subject: string | null;
  message: string;
  status: LeadStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Review ──────────────────────────────────────────
export interface ReviewItem {
  id: string;
  name: string;
  rating: number;
  content: string;
  service: string | null;
  isApproved: boolean;
  createdAt: string;
}

// ─── Availability ────────────────────────────────────
export interface AvailabilityRuleItem {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface AvailabilityExceptionItem {
  id: string;
  date: string;
  type: ExceptionType;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

// ─── Dashboard Stats ─────────────────────────────────
export interface DashboardStats {
  todayBookings: number;
  weekBookings: number;
  newLeads: number;
  pendingReviews: number;
}

// ─── Nav ─────────────────────────────────────────────
export interface NavLink {
  label: string;
  href: string;
}

```

---

## `src/types/next-auth.d.ts`

```ts
import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: string;
  }
}

```

---

# 4. HOOKS

## `src/lib/hooks/useMediaQuery.ts`

```ts
"use client";

import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

```

---

## `src/lib/hooks/useScrollDirection.ts`

```ts
"use client";

import { useState, useEffect } from "react";

export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("up");
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY;
      const direction = currentScrollY > lastScrollY ? "down" : "up";

      if (
        direction !== scrollDirection &&
        Math.abs(currentScrollY - lastScrollY) > 10
      ) {
        setScrollDirection(direction);
      }

      setScrollY(currentScrollY);
      lastScrollY = currentScrollY > 0 ? currentScrollY : 0;
    };

    window.addEventListener("scroll", updateScrollDirection, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollDirection);
  }, [scrollDirection]);

  return { scrollDirection, scrollY };
}

```

---

## `src/lib/hooks/useSiteContent.ts`

```ts
"use client";

import { useState, useEffect } from "react";

type SiteContent = Record<string, Record<string, string>>;

let cachedContent: SiteContent | null = null;
let fetchPromise: Promise<SiteContent> | null = null;

function fetchSiteContent(): Promise<SiteContent> {
  if (cachedContent) return Promise.resolve(cachedContent);
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/site-content", { cache: "no-store" })
    .then((r) => r.json())
    .then((json) => {
      cachedContent = json.data || {};
      fetchPromise = null;
      return cachedContent!;
    })
    .catch(() => {
      fetchPromise = null;
      return {} as SiteContent;
    });

  return fetchPromise;
}

export function useSiteContent() {
  const [content, setContent] = useState<SiteContent>(cachedContent || {});
  const [loaded, setLoaded] = useState(!!cachedContent);

  useEffect(() => {
    fetchSiteContent().then((data) => {
      setContent(data);
      setLoaded(true);
    });
  }, []);

  /** Get a value for section.key with a fallback default */
  const t = (section: string, key: string, fallback: string): string => {
    return content[section]?.[key] ?? fallback;
  };

  return { content, loaded, t };
}

```

---

## `src/lib/hooks/useSiteImages.ts`

```ts
"use client";

import { useState, useEffect } from "react";

interface SiteImageData {
  imagePath: string;
  alt: string;
}

interface SiteImages {
  logo?: SiteImageData;
  logo_dark?: SiteImageData;
  about?: SiteImageData;
  services_bg?: SiteImageData;
  hero?: SiteImageData[];
  [key: string]: SiteImageData | SiteImageData[] | undefined;
}

let cachedImages: SiteImages | null = null;
let fetchPromise: Promise<SiteImages> | null = null;

function fetchSiteImages(): Promise<SiteImages> {
  if (cachedImages) return Promise.resolve(cachedImages);
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/site-images", { cache: "no-store" })
    .then((r) => r.json())
    .then((json) => {
      cachedImages = json.data || {};
      fetchPromise = null;
      return cachedImages!;
    })
    .catch(() => {
      fetchPromise = null;
      return {} as SiteImages;
    });

  return fetchPromise;
}

export function useSiteImages() {
  const [images, setImages] = useState<SiteImages>(cachedImages || {});
  const [loaded, setLoaded] = useState(!!cachedImages);

  useEffect(() => {
    fetchSiteImages().then((data) => {
      setImages(data);
      setLoaded(true);
    });
  }, []);

  return { images, loaded };
}

```

---

# 5. MIDDLEWARE & AUTH

## `src/middleware.ts`

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page and NextAuth API routes
  if (pathname === "/admin/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Protect admin pages and admin API routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const token = await getToken({ req: request });

    if (!token) {
      // API routes return 401
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
      }
      // Admin pages redirect to login
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

```

---

## `src/app/api/auth/[...nextauth]/route.ts`

```ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

```

---

# 6. ADMIN PAGES

## `src/app/admin/layout.tsx`

```tsx
"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { Menu } from "lucide-react";
import AdminSidebar from "@/components/layout/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SessionProvider>
      <meta name="robots" content="noindex, nofollow" />
      <div className="min-h-screen bg-surface flex">
        <AdminSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col min-h-screen">
          {/* Top bar */}
          <header className="sticky top-0 z-30 bg-white border-b border-border px-4 py-3 flex items-center gap-4 lg:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-sm font-medium text-text-muted">
              פאנל ניהול
            </h2>
          </header>

          {/* Page content */}
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}

```

---

## `src/app/admin/page.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  TrendingUp,
  MessageSquare,
  Star,
  Clock,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { formatTime } from "@/lib/utils";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_COLORS,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
} from "@/lib/constants";

interface DashboardData {
  stats: {
    todayBookings: number;
    weekBookings: number;
    newLeads: number;
    pendingReviews: number;
    pendingBookings: number;
  };
  todayBookingsList: Array<{
    id: string;
    startAt: string;
    endAt: string;
    status: string;
    customerName: string;
    service: { name: string };
  }>;
  recentLeads: Array<{
    id: string;
    name: string;
    phone: string;
    subject: string | null;
    status: string;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((r) => setData(r.data))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner label="טוען לוח בקרה..." />
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    {
      label: "הזמנות היום",
      value: data.stats.todayBookings,
      icon: Calendar,
      color: "text-secondary",
      bg: "bg-primary/20",
    },
    {
      label: "הזמנות השבוע",
      value: data.stats.weekBookings,
      icon: TrendingUp,
      color: "text-info",
      bg: "bg-info/10",
    },
    {
      label: "פניות חדשות",
      value: data.stats.newLeads,
      icon: MessageSquare,
      color: "text-warning",
      bg: "bg-warning/10",
      href: "/admin/leads",
    },
    {
      label: "המלצות ממתינות",
      value: data.stats.pendingReviews,
      icon: Star,
      color: "text-secondary",
      bg: "bg-secondary/10",
      href: "/admin/reviews",
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-text">לוח בקרה</h1>

      {/* Pending bookings alert */}
      {data.stats.pendingBookings > 0 && (
        <Link href="/admin/bookings?status=PENDING">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20 hover:bg-warning/15 transition-colors">
            <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
            <p className="text-sm font-medium text-text">
              יש {data.stats.pendingBookings} הזמנות שממתינות לאישור
            </p>
            <ArrowLeft className="h-4 w-4 text-warning mr-auto" />
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const content = (
            <Card key={stat.label} className="flex items-center gap-3 sm:gap-4">
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}
              >
                <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-text">{stat.value}</p>
                <p className="text-sm text-text-muted">{stat.label}</p>
              </div>
            </Card>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href}>
              {content}
            </Link>
          ) : (
            <div key={stat.label}>{content}</div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's bookings */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text flex items-center gap-2">
              <Clock className="h-5 w-5 text-text-muted" />
              הזמנות היום
            </h2>
            <Link
              href="/admin/bookings"
              className="text-sm text-secondary hover:underline flex items-center gap-1"
            >
              הכל
              <ArrowLeft className="h-3 w-3" />
            </Link>
          </div>
          {data.todayBookingsList.length === 0 ? (
            <p className="text-text-muted text-sm py-4 text-center">
              אין הזמנות להיום
            </p>
          ) : (
            <div className="space-y-3">
              {data.todayBookingsList.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-text-muted" dir="ltr">
                      {formatTime(booking.startAt)}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-text">
                        {booking.customerName}
                      </p>
                      <p className="text-xs text-text-muted">
                        {booking.service.name}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={BOOKING_STATUS_COLORS[booking.status]}
                  >
                    {BOOKING_STATUS_LABELS[booking.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent leads */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-text-muted" />
              פניות אחרונות
            </h2>
            <Link
              href="/admin/leads"
              className="text-sm text-secondary hover:underline flex items-center gap-1"
            >
              הכל
              <ArrowLeft className="h-3 w-3" />
            </Link>
          </div>
          {data.recentLeads.length === 0 ? (
            <p className="text-text-muted text-sm py-4 text-center">
              אין פניות
            </p>
          ) : (
            <div className="space-y-3">
              {data.recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-text">
                      {lead.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {lead.subject || "כללי"} · {lead.phone}
                    </p>
                  </div>
                  <Badge className={LEAD_STATUS_COLORS[lead.status]}>
                    {LEAD_STATUS_LABELS[lead.status]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

```

---

## `src/app/admin/login/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    signIn("google", { callbackUrl: "/admin" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">ניהול האתר</h1>
          <p className="text-text-secondary">התחברו כדי לגשת לפאנל הניהול</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
            {error === "AccessDenied"
              ? "אין לך הרשאה לגשת למערכת הניהול"
              : "שגיאה בהתחברות, נסו שוב"}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4
                     bg-white border-2 border-border rounded-lg font-medium text-text
                     hover:bg-gray-50 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed
                     focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {isLoading ? "מתחבר..." : "התחברות עם Google"}
        </button>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-surface">
          <div className="text-text-secondary">טוען...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

```

---

## `src/app/admin/availability/page.tsx`

```tsx
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Clock, Plus, Trash2 } from "lucide-react";
import CalendarGrid, { type DayInfo, type DayStatus } from "@/components/admin/CalendarGrid";
import DayDetailPanel from "@/components/admin/DayDetailPanel";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { DAYS_OF_WEEK_HE, CATEGORY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Rule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  category: string | null;
}

interface ExceptionItem {
  id: string;
  date: string;
  type: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  category: string | null;
}

const CATEGORY_TABS = [
  { value: null, label: "כללי" },
  { value: "MASSAGE", label: "עיסויים" },
  { value: "YOGA", label: "יוגה" },
  { value: "PILATES", label: "פילאטיס" },
];

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Inline time input that saves on blur only
function TimeInput({
  value,
  onSave,
}: {
  value: string;
  onSave: (val: string) => void;
}) {
  const [local, setLocal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <input
      ref={ref}
      type="time"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local && local !== value) {
          onSave(local);
        }
      }}
      className="px-2 py-1.5 text-sm rounded-lg border border-border bg-white cursor-pointer w-[100px] text-center"
      dir="ltr"
    />
  );
}

export default function AvailabilityPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [exceptions, setExceptions] = useState<ExceptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showWeeklyRules, setShowWeeklyRules] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/availability");
      const result = await res.json();
      setRules(result.data.rules);
      setExceptions(result.data.exceptions);
    } catch {
      toast.error("שגיאה בטעינת נתונים");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute day status map for the calendar
  const dayInfoMap = useMemo(() => {
    const map = new Map<string, DayInfo>();
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const start = new Date(year, month, -6);
    const end = new Date(year, month + 1, 7);

    const d = new Date(start);
    while (d <= end) {
      const key = toKey(d);
      const dow = d.getDay();

      // Find ALL applicable rules for this day
      const catRules = selectedCategory
        ? rules.filter((r) => r.dayOfWeek === dow && r.category === selectedCategory && r.isActive)
        : [];
      const genRules = rules.filter(
        (r) => r.dayOfWeek === dow && r.category === null && r.isActive
      );
      const activeRules = catRules.length > 0 ? catRules : genRules;

      // Find exceptions for this date
      const dayExceptions = exceptions.filter((e) => {
        const excDate = new Date(e.date);
        return toKey(excDate) === key;
      });

      const catException = dayExceptions.find(
        (e) => e.category === selectedCategory
      );
      const genException = dayExceptions.find((e) => e.category === null);
      const exception = catException || genException;

      let status: DayStatus;
      let effectiveStart: string | undefined;
      let effectiveEnd: string | undefined;

      if (exception) {
        if (exception.type === "BLOCKED") {
          status = "blocked";
        } else {
          status = "override";
          effectiveStart = exception.startTime || undefined;
          effectiveEnd = exception.endTime || undefined;
        }
      } else if (activeRules.length > 0) {
        status = "available";
        // Show earliest start and latest end
        const sorted = [...activeRules].sort((a, b) => a.startTime.localeCompare(b.startTime));
        effectiveStart = sorted[0].startTime;
        effectiveEnd = sorted[sorted.length - 1].endTime;
      } else {
        status = "dayoff";
      }

      map.set(key, {
        date: new Date(d),
        status,
        effectiveStart,
        effectiveEnd,
        hasException: dayExceptions.length > 0,
      });

      d.setDate(d.getDate() + 1);
    }

    return map;
  }, [currentMonth, rules, exceptions, selectedCategory]);

  // ─── Actions ─────────────────────────
  const saveRule = async (data: {
    id?: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
    category: string | null;
  }) => {
    try {
      const res = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "rule", data }),
      });
      if (res.ok) {
        toast.success("עודכן בהצלחה");
        fetchData();
      } else {
        const result = await res.json();
        toast.error(result.error || "שגיאה");
      }
    } catch {
      toast.error("שגיאת שרת");
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/availability/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("נמחק בהצלחה");
        fetchData();
      }
    } catch {
      toast.error("שגיאת שרת");
    }
  };

  // Legacy updateRule for DayDetailPanel compatibility
  const updateRule = async (dayOfWeek: number, updates: Partial<Rule>) => {
    const dayRules = rules.filter((r) =>
      r.dayOfWeek === dayOfWeek &&
      (selectedCategory === null ? r.category === null : r.category === selectedCategory)
    );

    if (dayRules.length === 0) {
      // No rules exist yet — create one
      await saveRule({
        dayOfWeek,
        startTime: updates.startTime ?? "09:00",
        endTime: updates.endTime ?? "18:00",
        isActive: updates.isActive ?? true,
        category: selectedCategory,
      });
    } else if (updates.isActive !== undefined) {
      // Toggle active state on ALL rules for this day
      for (const rule of dayRules) {
        await saveRule({
          id: rule.id,
          dayOfWeek,
          startTime: rule.startTime,
          endTime: rule.endTime,
          isActive: updates.isActive,
          category: selectedCategory,
        });
      }
    } else {
      // Update the first rule with the provided changes
      const existing = dayRules[0];
      await saveRule({
        id: existing.id,
        dayOfWeek,
        startTime: updates.startTime ?? existing.startTime,
        endTime: updates.endTime ?? existing.endTime,
        isActive: updates.isActive ?? existing.isActive,
        category: selectedCategory,
      });
    }
  };

  const addException = async (excData: {
    date: string;
    type: "BLOCKED" | "OVERRIDE";
    startTime?: string;
    endTime?: string;
    reason?: string;
    category: string | null;
  }) => {
    try {
      const res = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "exception",
          data: { ...excData, category: excData.category },
        }),
      });
      if (res.ok) {
        toast.success("נשמר בהצלחה");
        fetchData();
      } else {
        const result = await res.json();
        toast.error(result.error || "שגיאה");
      }
    } catch {
      toast.error("שגיאת שרת");
    }
  };

  const deleteException = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/availability/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("נמחק בהצלחה");
        fetchData();
      }
    } catch {
      toast.error("שגיאת שרת");
    }
  };

  // ─── Render ─────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner label="טוען זמינות..." />
      </div>
    );
  }

  const detailPanel = selectedDate ? (
    <DayDetailPanel
      date={selectedDate}
      rules={rules}
      exceptions={exceptions}
      selectedCategory={selectedCategory}
      onClose={() => setSelectedDate(null)}
      onAddException={addException}
      onDeleteException={deleteException}
      onUpdateRule={updateRule}
    />
  ) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">ניהול זמינות</h1>
        <p className="text-text-muted text-sm mt-1">
          לחצו על תאריך ביומן כדי לנהל את הזמינות שלו
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-surface rounded-lg">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value ?? "general"}
            onClick={() => setSelectedCategory(tab.value)}
            className={cn(
              "px-4 py-2 text-sm rounded-md transition-colors",
              selectedCategory === tab.value
                ? "bg-white text-text font-medium shadow-sm"
                : "text-text-muted hover:text-text"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Calendar + Detail Panel */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <CalendarGrid
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            dayInfoMap={dayInfoMap}
          />
        </div>

        <div className="hidden lg:block lg:w-[380px] flex-shrink-0">
          {detailPanel || (
            <div className="bg-white rounded-xl border border-border p-8 text-center text-text-muted">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">בחרו תאריך מהיומן</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Detail Modal */}
      {isMobile && (
        <Modal
          isOpen={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          title=""
          size="sm"
        >
          {detailPanel}
        </Modal>
      )}

      {/* Collapsible Weekly Defaults */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setShowWeeklyRules(!showWeeklyRules)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-text-muted" />
            <span className="font-medium text-text text-sm">
              הגדרות ברירת מחדל שבועיות
            </span>
            {selectedCategory && (
              <span className="text-xs text-text-muted">
                ({CATEGORY_LABELS[selectedCategory]})
              </span>
            )}
          </div>
          {showWeeklyRules ? (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
        </button>

        {showWeeklyRules && (
          <div className="border-t border-border p-4 space-y-3">
            <p className="text-xs text-text-muted mb-3">
              {selectedCategory
                ? `שעות קבועות עבור ${CATEGORY_LABELS[selectedCategory]}. גוברות על הכללי.`
                : "שעות קבועות לכל ימות השבוע — חלות על כל סוגי השירותים. ניתן להוסיף כמה טווחי שעות ליום."}
            </p>
            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
              // Get ALL rules for this day + category
              const dayRules = rules
                .filter((r) =>
                  selectedCategory === null
                    ? r.category === null && r.dayOfWeek === day
                    : r.category === selectedCategory && r.dayOfWeek === day
                )
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              const hasActiveSlots = dayRules.some((r) => r.isActive);

              const globalRules = selectedCategory
                ? rules.filter(
                    (r) => r.dayOfWeek === day && r.category === null && r.isActive
                  )
                : [];

              return (
                <div
                  key={day}
                  className={cn(
                    "p-3 rounded-lg border",
                    hasActiveSlots
                      ? "border-border bg-white"
                      : "border-transparent bg-surface/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-text text-sm">
                      {DAYS_OF_WEEK_HE[day]}
                    </span>
                    <button
                      onClick={() =>
                        saveRule({
                          dayOfWeek: day,
                          startTime: "09:00",
                          endTime: "18:00",
                          isActive: true,
                          category: selectedCategory,
                        })
                      }
                      className="flex items-center gap-1 text-xs text-secondary hover:text-secondary-dark transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      הוסף טווח
                    </button>
                  </div>

                  {dayRules.length === 0 ? (
                    <div className="text-xs text-text-muted">
                      {selectedCategory && globalRules.length > 0 ? (
                        <span>
                          כללי:{" "}
                          {globalRules
                            .map((r) => `${r.startTime}-${r.endTime}`)
                            .join(", ")}
                        </span>
                      ) : (
                        "יום חופש — לחצו \'הוסף טווח\' להגדרת שעות"
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayRules.map((rule) => (
                        <div
                          key={rule.id}
                          className={cn(
                            "flex items-center gap-2 flex-wrap",
                            !rule.isActive && "opacity-50"
                          )}
                        >
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={rule.isActive}
                              onChange={(e) =>
                                saveRule({
                                  id: rule.id,
                                  dayOfWeek: day,
                                  startTime: rule.startTime,
                                  endTime: rule.endTime,
                                  isActive: e.target.checked,
                                  category: selectedCategory,
                                })
                              }
                              className="w-4 h-4 rounded border-border text-secondary focus:ring-secondary"
                            />
                            <span className="text-xs text-text-secondary">
                              {rule.isActive ? "פעיל" : "מושבת"}
                            </span>
                          </label>

                          <div className="flex items-center gap-1.5" dir="ltr">
                            <TimeInput
                              value={rule.startTime}
                              onSave={(v) =>
                                saveRule({
                                  id: rule.id,
                                  dayOfWeek: day,
                                  startTime: v,
                                  endTime: rule.endTime,
                                  isActive: rule.isActive,
                                  category: selectedCategory,
                                })
                              }
                            />
                            <span className="text-text-muted text-sm">—</span>
                            <TimeInput
                              value={rule.endTime}
                              onSave={(v) =>
                                saveRule({
                                  id: rule.id,
                                  dayOfWeek: day,
                                  startTime: rule.startTime,
                                  endTime: v,
                                  isActive: rule.isActive,
                                  category: selectedCategory,
                                })
                              }
                            />
                          </div>

                          <button
                            onClick={() => deleteRule(rule.id)}
                            className="p-1 rounded text-text-muted hover:text-error hover:bg-error/10 transition-colors mr-auto"
                            title="מחק טווח"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

```

---

## `src/app/admin/bookings/page.tsx`

```tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Calendar, Phone, FileText, CheckCircle, XCircle, Trash2, Search, Download } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Textarea from "@/components/ui/Textarea";
import { formatDateShort, formatTime, formatPhone } from "@/lib/utils";
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_COLORS,
} from "@/lib/constants";

interface BookingRow {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  notes: string | null;
  adminNotes: string | null;
  service: { name: string };
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "הכל" },
  { value: "PENDING", label: "ממתין" },
  { value: "CONFIRMED", label: "מאושר" },
  { value: "COMPLETED", label: "הושלם" },
  { value: "CANCELLED", label: "בוטל" },
  { value: "NO_SHOW", label: "לא הגיע" },
];

const STATUS_CHANGE_OPTIONS = [
  { value: "PENDING", label: "ממתין" },
  { value: "CONFIRMED", label: "מאושר" },
  { value: "COMPLETED", label: "הושלם" },
  { value: "CANCELLED", label: "בוטל" },
  { value: "NO_SHOW", label: "לא הגיע" },
];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const fetchBookings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/bookings?${params}`);
      const result = await res.json();
      setBookings(result.data || []);
    } catch {
      toast.error("שגיאה בטעינת הזמנות");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setIsLoading(true);
    fetchBookings();
  }, [fetchBookings]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success("הסטטוס עודכן");
        fetchBookings();
      }
    } catch {
      toast.error("שגיאה בעדכון");
    }
  };

  const deleteBooking = async (id: string) => {
    if (!confirm("למחוק את ההזמנה לצמיתות?")) return;
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("ההזמנה נמחקה");
        fetchBookings();
      } else {
        toast.error("שגיאה במחיקה");
      }
    } catch {
      toast.error("שגיאה במחיקה");
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !b.customerName.toLowerCase().includes(q) &&
          !b.customerPhone.includes(q) &&
          !b.service.name.toLowerCase().includes(q)
        )
          return false;
      }
      if (dateFrom) {
        const bookingDate = new Date(b.startAt).toISOString().slice(0, 10);
        if (bookingDate < dateFrom) return false;
      }
      if (dateTo) {
        const bookingDate = new Date(b.startAt).toISOString().slice(0, 10);
        if (bookingDate > dateTo) return false;
      }
      return true;
    });
  }, [bookings, searchQuery, dateFrom, dateTo]);

  const exportCSV = () => {
    const headers = ["תאריך", "שעה", "שירות", "לקוח", "טלפון", "אימייל", "סטטוס", "הערות"];
    const rows = filteredBookings.map((b) => [
      formatDateShort(b.startAt),
      formatTime(b.startAt),
      b.service.name,
      b.customerName,
      b.customerPhone,
      b.customerEmail || "",
      BOOKING_STATUS_LABELS[b.status] || b.status,
      b.notes || "",
    ]);
    const bom = "\uFEFF";
    const csv = bom + [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveAdminNotes = async () => {
    if (!selectedBooking) return;
    try {
      const res = await fetch(`/api/admin/bookings/${selectedBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes }),
      });
      if (res.ok) {
        toast.success("ההערה נשמרה");
        setSelectedBooking(null);
        fetchBookings();
      }
    } catch {
      toast.error("שגיאה בשמירה");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner label="טוען הזמנות..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">ניהול הזמנות</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 ml-1" />
            CSV
          </Button>
          <div className="w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={STATUS_OPTIONS}
            />
          </div>
        </div>
      </div>

      {/* Search & Date Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="חיפוש לפי שם, טלפון או שירות..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-3 py-2 text-sm rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            placeholder="מתאריך"
            dir="ltr"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            placeholder="עד תאריך"
            dir="ltr"
          />
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title="אין הזמנות"
          description="כשלקוחות יקבעו תורים, הם יופיעו כאן"
        />
      ) : (
        <>
          {/* Mobile: Card Layout */}
          <div className="space-y-3 lg:hidden">
            {filteredBookings.map((booking) => (
              <Card key={booking.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-text">{booking.customerName}</p>
                    <p className="text-sm text-text-muted">{booking.service.name}</p>
                  </div>
                  <Badge className={BOOKING_STATUS_COLORS[booking.status]}>
                    {BOOKING_STATUS_LABELS[booking.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-text-muted">
                  <span dir="ltr">{formatDateShort(booking.startAt)}</span>
                  <span dir="ltr">{formatTime(booking.startAt)}</span>
                </div>
                <a
                  href={`tel:${booking.customerPhone}`}
                  className="text-sm text-secondary hover:underline flex items-center gap-1"
                  dir="ltr"
                >
                  <Phone className="h-3 w-3" />
                  {formatPhone(booking.customerPhone)}
                </a>
                {booking.notes && (
                  <p className="text-xs text-text-muted bg-surface rounded-lg p-2">
                    {booking.notes}
                  </p>
                )}
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  {booking.status === "PENDING" ? (
                    <>
                      <button
                        onClick={() => updateStatus(booking.id, "CONFIRMED")}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-success/10 text-success hover:bg-success/20 text-sm font-medium transition-colors"
                      >
                        <CheckCircle className="h-4 w-4" />
                        אישור
                      </button>
                      <button
                        onClick={() => updateStatus(booking.id, "CANCELLED")}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-error/10 text-error hover:bg-error/20 text-sm font-medium transition-colors"
                      >
                        <XCircle className="h-4 w-4" />
                        דחייה
                      </button>
                    </>
                  ) : (
                    <select
                      value={booking.status}
                      onChange={(e) => updateStatus(booking.id, e.target.value)}
                      className="text-sm px-3 py-2.5 rounded-lg border border-border bg-white flex-1"
                    >
                      {STATUS_CHANGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => {
                      setSelectedBooking(booking);
                      setAdminNotes(booking.adminNotes || "");
                    }}
                    className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface"
                  >
                    <FileText className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => deleteBooking(booking.id)}
                    className="p-2 rounded-lg text-text-muted hover:text-error hover:bg-error/10"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop: Table Layout */}
          <Card className="overflow-x-auto p-0 hidden lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="text-right p-3 font-medium text-text-muted">תאריך</th>
                  <th className="text-right p-3 font-medium text-text-muted">שעה</th>
                  <th className="text-right p-3 font-medium text-text-muted">שירות</th>
                  <th className="text-right p-3 font-medium text-text-muted">לקוח</th>
                  <th className="text-right p-3 font-medium text-text-muted">טלפון</th>
                  <th className="text-right p-3 font-medium text-text-muted">סטטוס</th>
                  <th className="text-right p-3 font-medium text-text-muted">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-border last:border-0 hover:bg-surface/30"
                  >
                    <td className="p-3 text-text" dir="ltr">
                      {formatDateShort(booking.startAt)}
                    </td>
                    <td className="p-3 text-text" dir="ltr">
                      {formatTime(booking.startAt)}
                    </td>
                    <td className="p-3 text-text">{booking.service.name}</td>
                    <td className="p-3">
                      <p className="text-text font-medium">{booking.customerName}</p>
                      {booking.notes && (
                        <p className="text-xs text-text-muted mt-0.5 truncate max-w-[200px]" title={booking.notes}>
                          {booking.notes}
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      <a
                        href={`tel:${booking.customerPhone}`}
                        className="text-secondary hover:underline flex items-center gap-1"
                        dir="ltr"
                      >
                        <Phone className="h-3 w-3" />
                        {formatPhone(booking.customerPhone)}
                      </a>
                    </td>
                    <td className="p-3">
                      <Badge className={BOOKING_STATUS_COLORS[booking.status]}>
                        {BOOKING_STATUS_LABELS[booking.status]}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {booking.status === "PENDING" ? (
                          <>
                            <button
                              onClick={() => updateStatus(booking.id, "CONFIRMED")}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 text-xs font-medium transition-colors"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              אישור
                            </button>
                            <button
                              onClick={() => updateStatus(booking.id, "CANCELLED")}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 text-xs font-medium transition-colors"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              דחייה
                            </button>
                          </>
                        ) : (
                          <select
                            value={booking.status}
                            onChange={(e) => updateStatus(booking.id, e.target.value)}
                            className="text-sm px-2.5 py-1.5 rounded border border-border bg-white"
                          >
                            {STATUS_CHANGE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setAdminNotes(booking.adminNotes || "");
                          }}
                          className="p-1 rounded text-text-muted hover:text-text hover:bg-surface"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteBooking(booking.id)}
                          className="p-1 rounded text-text-muted hover:text-error hover:bg-error/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* Admin Notes Modal */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title={`הערות — ${selectedBooking?.customerName || ""}`}
        size="sm"
      >
        <div className="space-y-4">
          {selectedBooking?.notes && (
            <div className="bg-surface rounded-lg p-3">
              <p className="text-xs text-text-muted mb-1">הערות הלקוח:</p>
              <p className="text-sm text-text">{selectedBooking.notes}</p>
            </div>
          )}
          <Textarea
            label="הערות אדמין"
            placeholder="הוסיפו הערות פנימיות..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
          />
          <Button fullWidth onClick={saveAdminNotes}>
            שמירה
          </Button>
        </div>
      </Modal>
    </div>
  );
}

```

---

## `src/app/admin/services/page.tsx`

```tsx
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
import { CATEGORY_LABELS, SERVICE_ICON_OPTIONS } from "@/lib/constants";
import ServiceIcon, { iconMap } from "@/components/ui/ServiceIcon";
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

  const [selectedIcon, setSelectedIcon] = useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
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
      icon: "",
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
      icon: "",
      suitableFor: "",
      isActive: true,
      sortOrder: 0,
      homeVisitSurcharge: null,
    });
    setImagePreview(null);
    setSelectedIcon("");
    setIsModalOpen(true);
  };

  // ─── Open Edit Modal ─────────────────────────────────
  const openEditModal = (service: ServiceItem) => {
    setEditingService(service);
    setImagePreview(service.image || null);
    setSelectedIcon(service.icon || "");
    reset({
      name: service.name,
      slug: service.slug,
      shortDesc: service.shortDesc,
      description: service.description,
      category: service.category,
      duration: service.duration,
      price: service.price,
      image: service.image || "",
      icon: service.icon || "",
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
    setSelectedIcon("");
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
            rows={3}
            error={errors.description?.message}
            {...register("description")}
          />

          <Textarea
            label="למי מתאים?"
            placeholder="כל פריט בשורה חדשה, לדוגמה:&#10;סובלים מכאבי גב&#10;ספורטאים&#10;נשים בהריון"
            rows={3}
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
              <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
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
                className="w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-text-muted hover:text-primary transition-colors disabled:opacity-50"
              >
                <Upload className="h-8 w-8" />
                <span className="text-sm">{isUploading ? "מעלה..." : "העלאת תמונה"}</span>
              </button>
            )}
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">אייקון שירות</label>
            <input type="hidden" {...register("icon")} />
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
              {SERVICE_ICON_OPTIONS.map((opt) => {
                const IconComp = iconMap[opt.value];
                if (!IconComp) return null;
                const isSelected = selectedIcon === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.label}
                    onClick={() => {
                      setSelectedIcon(opt.value);
                      setValue("icon", opt.value);
                    }}
                    className={`flex items-center justify-center p-2 rounded-lg border transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30"
                        : "border-border text-text-muted hover:border-primary/50 hover:text-primary"
                    }`}
                  >
                    <IconComp className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                );
              })}
            </div>
            {selectedIcon && (
              <div className="flex items-center gap-2 mt-2 text-sm text-text-muted">
                <ServiceIcon name={selectedIcon} className="h-5 w-5 text-primary" />
                <span>{SERVICE_ICON_OPTIONS.find(o => o.value === selectedIcon)?.label}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIcon("");
                    setValue("icon", "");
                  }}
                  className="text-xs text-error hover:underline mr-auto"
                >
                  הסרה
                </button>
              </div>
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
                setValueAs: (v: string) => {
                  if (v === "" || v === undefined || v === null) return null;
                  const n = parseInt(v, 10);
                  return isNaN(n) ? null : n;
                },
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

```

---

## `src/app/admin/reviews/page.tsx`

```tsx
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
                  <Badge
                    className={
                      review.isApproved
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-warning/10 text-warning border-warning/20"
                    }
                  >
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
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setDeleteTarget(null)}
            >
              ביטול
            </Button>
            <Button
              fullWidth
              onClick={deleteReview}
              className="bg-error hover:bg-error/90 text-white"
            >
              מחיקה
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

```

---

## `src/app/admin/leads/page.tsx`

```tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { MessageSquare, Phone, Mail, Trash2, Search, Download } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Textarea from "@/components/ui/Textarea";
import { formatDateTime, formatPhone } from "@/lib/utils";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from "@/lib/constants";

interface LeadRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  subject: string;
  message: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
}

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "הכל" },
  { value: "NEW", label: "חדש" },
  { value: "IN_PROGRESS", label: "בטיפול" },
  { value: "CLOSED", label: "סגור" },
];

const STATUS_CHANGE_OPTIONS = [
  { value: "NEW", label: "חדש" },
  { value: "IN_PROGRESS", label: "בטיפול" },
  { value: "CLOSED", label: "סגור" },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<LeadRow | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/leads?${params}`);
      const result = await res.json();
      setLeads(result.data || []);
    } catch {
      toast.error("שגיאה בטעינת פניות");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setIsLoading(true);
    fetchLeads();
  }, [fetchLeads]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success("הסטטוס עודכן");
        fetchLeads();
      }
    } catch {
      toast.error("שגיאה בעדכון");
    }
  };

  const saveAdminNotes = async () => {
    if (!selectedLead) return;
    try {
      const res = await fetch(`/api/admin/leads/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes }),
      });
      if (res.ok) {
        toast.success("ההערה נשמרה");
        setSelectedLead(null);
        fetchLeads();
      }
    } catch {
      toast.error("שגיאה בשמירה");
    }
  };

  const filteredLeads = useMemo(() => {
    if (!searchQuery) return leads;
    const q = searchQuery.toLowerCase();
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        l.message.toLowerCase().includes(q)
    );
  }, [leads, searchQuery]);

  const exportCSV = () => {
    const headers = ["תאריך", "שם", "טלפון", "אימייל", "נושא", "הודעה", "סטטוס"];
    const rows = filteredLeads.map((l) => [
      formatDateTime(l.createdAt),
      l.name,
      l.phone,
      l.email || "",
      l.subject || "",
      l.message,
      LEAD_STATUS_LABELS[l.status] || l.status,
    ]);
    const bom = "\uFEFF";
    const csv = bom + [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteLead = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/leads/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("הפנייה נמחקה");
        setDeleteTarget(null);
        fetchLeads();
      }
    } catch {
      toast.error("שגיאה במחיקה");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner label="טוען פניות..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">ניהול פניות</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 ml-1" />
            CSV
          </Button>
          <div className="w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={STATUS_FILTER_OPTIONS}
            />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <input
          type="text"
          placeholder="חיפוש לפי שם, טלפון, אימייל או הודעה..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-10 pl-3 py-2 text-sm rounded-lg border border-border bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
      </div>

      {filteredLeads.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-12 w-12" />}
          title="אין פניות"
          description="כשלקוחות ישלחו פניות, הן יופיעו כאן"
        />
      ) : (
        <div className="space-y-4">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-text">{lead.name}</h3>
                    <Badge className={LEAD_STATUS_COLORS[lead.status]}>
                      {LEAD_STATUS_LABELS[lead.status]}
                    </Badge>
                    <span className="text-xs text-text-muted">
                      {formatDateTime(lead.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-secondary hover:underline flex items-center gap-1"
                      dir="ltr"
                    >
                      <Phone className="h-3 w-3" />
                      {formatPhone(lead.phone)}
                    </a>
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-secondary hover:underline flex items-center gap-1"
                        dir="ltr"
                      >
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </a>
                    )}
                  </div>

                  {lead.subject && (
                    <p className="text-sm text-text-muted">
                      נושא: {lead.subject}
                    </p>
                  )}

                  <p className="text-sm text-text bg-surface rounded-lg p-3">
                    {lead.message}
                  </p>

                  {lead.adminNotes && (
                    <div className="bg-primary-light/30 rounded-lg p-3">
                      <p className="text-xs text-text-muted mb-1">
                        הערות אדמין:
                      </p>
                      <p className="text-sm text-text">{lead.adminNotes}</p>
                    </div>
                  )}
                </div>

                <div className="flex sm:flex-col items-center gap-2">
                  <select
                    value={lead.status}
                    onChange={(e) => updateStatus(lead.id, e.target.value)}
                    className="text-sm px-2.5 py-1.5 rounded border border-border bg-white"
                  >
                    {STATUS_CHANGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setSelectedLead(lead);
                      setAdminNotes(lead.adminNotes || "");
                    }}
                    className="p-1.5 rounded text-text-muted hover:text-text hover:bg-surface"
                    title="הערות אדמין"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(lead)}
                    className="p-1.5 rounded text-text-muted hover:text-error hover:bg-error/10"
                    title="מחק פנייה"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Admin Notes Modal */}
      <Modal
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        title={`הערות — ${selectedLead?.name || ""}`}
        size="sm"
      >
        <div className="space-y-4">
          <Textarea
            label="הערות אדמין"
            placeholder="הוסיפו הערות פנימיות..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
          />
          <Button fullWidth onClick={saveAdminNotes}>
            שמירה
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="מחיקת פנייה"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text">
            האם למחוק את הפנייה של{" "}
            <strong>{deleteTarget?.name}</strong>? פעולה זו אינה הפיכה.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setDeleteTarget(null)}
            >
              ביטול
            </Button>
            <Button
              fullWidth
              onClick={deleteLead}
              className="bg-error hover:bg-error/90 text-white"
            >
              מחיקה
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

```

---

## `src/app/admin/gift-cards/page.tsx`

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Gift,
  ExternalLink,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";

interface GiftCardItem {
  id: string;
  recipientName: string;
  senderName: string | null;
  serviceName: string;
  message: string;
  code: string;
  isRedeemed: boolean;
  redeemedAt: string | null;
  createdAt: string;
}

export default function AdminGiftCardsPage() {
  const [giftCards, setGiftCards] = useState<GiftCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GiftCardItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareCard, setShareCard] = useState<GiftCardItem | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  // Form state
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [message, setMessage] = useState("");

  const fetchGiftCards = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/gift-cards");
      if (!res.ok) throw new Error();
      const json = await res.json();
      setGiftCards(json.data);
    } catch {
      toast.error("שגיאה בטעינת הגיפט קארדים");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGiftCards();
  }, [fetchGiftCards]);

  const openCreateModal = () => {
    setRecipientName("");
    setSenderName("");
    setServiceName("");
    setMessage("");
    setIsModalOpen(true);
  };

  const handleCreate = async () => {
    if (!recipientName || !serviceName || !message) {
      toast.error("יש למלא את כל השדות הנדרשים");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientName, senderName, serviceName, message }),
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || "שגיאה ביצירת הגיפט קארד");
        return;
      }

      const json = await res.json();
      toast.success("הגיפט קארד נוצר בהצלחה!");
      setIsModalOpen(false);
      await fetchGiftCards();
      // Show share popup with the new card
      if (json.data) {
        setShareCard(json.data);
        setShareCopied(false);
      }
    } catch {
      toast.error("שגיאת שרת");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRedeemed = async (card: GiftCardItem) => {
    try {
      const res = await fetch(`/api/admin/gift-cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRedeemed: !card.isRedeemed }),
      });
      if (!res.ok) throw new Error();
      toast.success(card.isRedeemed ? "סומן כלא מומש" : "סומן כמומש");
      fetchGiftCards();
    } catch {
      toast.error("שגיאה בעדכון");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/gift-cards/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("הגיפט קארד נמחק");
      setDeleteTarget(null);
      fetchGiftCards();
    } catch {
      toast.error("שגיאה במחיקה");
    } finally {
      setIsDeleting(false);
    }
  };

  const copyLink = async (card: GiftCardItem) => {
    const url = `${window.location.origin}/gift-card/${card.code}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(card.id);
    toast.success("הקישור הועתק!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("he-IL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner label="טוען גיפט קארדים..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">גיפט קארדים</h1>
        <Button size="sm" onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          גיפט קארד חדש
        </Button>
      </div>

      {/* List */}
      {giftCards.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Gift className="h-12 w-12" strokeWidth={1.5} />}
            title="אין גיפט קארדים"
            description="צרו את הגיפט קארד הראשון כדי להתחיל"
            action={
              <Button size="sm" onClick={openCreateModal}>
                <Plus className="h-4 w-4" />
                גיפט קארד חדש
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {giftCards.map((card) => (
            <Card key={card.id} className="relative">
              {/* Status badge */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-text text-lg">
                    {card.recipientName}
                  </h3>
                  {card.senderName && (
                    <p className="text-sm text-text-muted">
                      מאת: {card.senderName}
                    </p>
                  )}
                </div>
                <Badge variant={card.isRedeemed ? "error" : "success"}>
                  {card.isRedeemed ? "מומש" : "פעיל"}
                </Badge>
              </div>

              <div className="bg-surface rounded-lg px-3 py-2 mb-3">
                <p className="text-sm font-medium text-primary-dark">
                  {card.serviceName}
                </p>
              </div>

              <p className="text-sm text-text-secondary line-clamp-2 mb-3 italic">
                &ldquo;{card.message}&rdquo;
              </p>

              <p className="text-xs text-text-muted mb-4">
                נוצר: {formatDate(card.createdAt)}
                {card.redeemedAt && ` | מומש: ${formatDate(card.redeemedAt)}`}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2 border-t border-border pt-3">
                <button
                  onClick={() => copyLink(card)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  {copiedId === card.id ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copiedId === card.id ? "הועתק!" : "העתק קישור"}
                </button>
                <a
                  href={`/gift-card/${card.code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-muted hover:bg-surface transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  צפייה
                </a>
                <button
                  onClick={() => toggleRedeemed(card)}
                  className="px-3 py-1.5 rounded-lg text-sm text-text-muted hover:bg-surface transition-colors"
                >
                  {card.isRedeemed ? "סמן כפעיל" : "סמן כמומש"}
                </button>
                <button
                  onClick={() => setDeleteTarget(card)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors mr-auto"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="גיפט קארד חדש"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="שם המקבל/ת *"
            placeholder="למי מיועד הגיפט קארד?"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
          />
          <Input
            label="שם השולח/ת"
            placeholder="מי שולח את הגיפט קארד? (אופציונלי)"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
          />
          <Input
            label="סוג השירות / טיפול *"
            placeholder="למשל: עיסוי שוודי, שיעור יוגה פרטי"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
          />
          <Textarea
            label="הודעת ברכה *"
            placeholder="כתבו הודעה אישית שתופיע על הגיפט קארד..."
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              ביטול
            </Button>
            <Button size="sm" isLoading={isSubmitting} onClick={handleCreate}>
              <Gift className="h-4 w-4" />
              יצירת גיפט קארד
            </Button>
          </div>
        </div>
      </Modal>

      {/* Share Modal (shown after creation) */}
      <Modal
        isOpen={!!shareCard}
        onClose={() => setShareCard(null)}
        title="הגיפט קארד נוצר בהצלחה!"
        size="sm"
      >
        {shareCard && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-3">
                <Gift className="h-8 w-8 text-success" />
              </div>
              <p className="text-text-secondary text-sm">
                גיפט קארד עבור <strong>{shareCard.recipientName}</strong>
              </p>
            </div>

            <div className="bg-surface rounded-lg p-3">
              <p className="text-xs text-text-muted mb-1">קישור לשיתוף:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/gift-card/${shareCard.code}`}
                  className="flex-1 text-sm bg-white border border-border rounded-lg px-3 py-2 text-left"
                  dir="ltr"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  size="sm"
                  variant={shareCopied ? "outline" : "primary"}
                  onClick={async () => {
                    const url = `${window.location.origin}/gift-card/${shareCard.code}`;
                    await navigator.clipboard.writeText(url);
                    setShareCopied(true);
                    toast.success("הקישור הועתק!");
                    setTimeout(() => setShareCopied(false), 3000);
                  }}
                  className="flex-shrink-0"
                >
                  {shareCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {shareCopied ? "הועתק!" : "העתק"}
                </Button>
              </div>
            </div>

            <p className="text-xs text-text-muted text-center">
              שלחו את הקישור ללקוח/ה כדי שיוכלו לצפות בגיפט קארד
            </p>

            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShareCard(null)}
              >
                סגור
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="מחיקת גיפט קארד"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text">
            האם למחוק את הגיפט קארד עבור{" "}
            <span className="font-semibold">
              &quot;{deleteTarget?.recipientName}&quot;
            </span>
            ?
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

```

---

## `src/app/admin/images/page.tsx`

```tsx
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

```

---

## `src/app/admin/content/page.tsx`

```tsx
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
      { key: "buttonText", label: "טקסט כפתור", type: "input" as const },
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
      { key: "heroTitle", label: "כותרת", type: "input" as const },
      { key: "heroSubtitle", label: "תת כותרת", type: "input" as const },
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

```

---

# 7. ADMIN COMPONENTS

## `src/components/admin/CalendarGrid.tsx`

```tsx
"use client";

import { ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAYS_OF_WEEK_HE } from "@/lib/constants";

export type DayStatus = "available" | "blocked" | "override" | "dayoff";

export interface DayInfo {
  date: Date;
  status: DayStatus;
  effectiveStart?: string;
  effectiveEnd?: string;
  hasException: boolean;
}

interface CalendarGridProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  dayInfoMap: Map<string, DayInfo>;
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarGrid({
  currentMonth,
  onMonthChange,
  selectedDate,
  onDateSelect,
  dayInfoMap,
}: CalendarGridProps) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthName = new Date(year, month).toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Previous month trailing days
  const prevMonthDays = new Date(year, month, 0).getDate();

  const prevMonth = () => onMonthChange(new Date(year, month - 1, 1));
  const nextMonth = () => onMonthChange(new Date(year, month + 1, 1));
  const goToToday = () => onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1));

  const statusColors: Record<DayStatus, string> = {
    available: "bg-success/15",
    blocked: "bg-error/15",
    override: "bg-warning/15",
    dayoff: "",
  };

  const dotColors: Record<DayStatus, string> = {
    available: "bg-success",
    blocked: "bg-error",
    override: "bg-warning",
    dayoff: "bg-gray-300",
  };

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface/50 border-b border-border">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-white transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-text-muted" />
        </button>

        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-text">{monthName}</h3>
          <button
            onClick={goToToday}
            className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            היום
          </button>
        </div>

        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-white transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-text-muted" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS_OF_WEEK_HE.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-text-muted py-2"
          >
            {day.slice(0, 2)}׳
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {/* Previous month days */}
        {Array.from({ length: firstDayOfMonth }, (_, i) => {
          const day = prevMonthDays - firstDayOfMonth + 1 + i;
          return (
            <div
              key={`prev-${i}`}
              className="aspect-square flex items-center justify-center text-sm text-text-muted/30 border-b border-r border-border/30"
            >
              {day}
            </div>
          );
        })}

        {/* Current month days */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const date = new Date(year, month, day);
          const key = toKey(date);
          const info = dayInfoMap.get(key);
          const status = info?.status ?? "dayoff";
          const isToday = date.toDateString() === today.toDateString();
          const isSelected = selectedDate?.toDateString() === date.toDateString();

          return (
            <button
              key={day}
              onClick={() => onDateSelect(date)}
              className={cn(
                "relative aspect-square flex flex-col items-center justify-center text-sm transition-all border-b border-r border-border/30",
                isSelected
                  ? "bg-secondary text-white ring-2 ring-secondary ring-inset"
                  : statusColors[status],
                !isSelected && "hover:bg-surface"
              )}
            >
              <span
                className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-full text-sm",
                  isToday && !isSelected && "bg-secondary text-white font-bold",
                  isSelected && "font-bold",
                  !isToday && !isSelected && status === "dayoff" && "text-text-muted/50",
                  !isToday && !isSelected && status !== "dayoff" && "text-text"
                )}
              >
                {day}
              </span>

              {/* Status dot */}
              {!isSelected && status !== "dayoff" && (
                <span
                  className={cn(
                    "absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                    dotColors[status]
                  )}
                />
              )}

              {/* Exception indicator */}
              {info?.hasException && !isSelected && (
                <span className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-warning" />
              )}

              {/* Time hint */}
              {info?.effectiveStart && !isSelected && (
                <span className="absolute bottom-0 text-[9px] text-text-muted/60 leading-none hidden sm:block">
                  {info.effectiveStart}
                </span>
              )}
            </button>
          );
        })}

        {/* Next month days to fill the grid */}
        {(() => {
          const totalCells = firstDayOfMonth + daysInMonth;
          const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
          return Array.from({ length: remaining }, (_, i) => (
            <div
              key={`next-${i}`}
              className="aspect-square flex items-center justify-center text-sm text-text-muted/30 border-b border-r border-border/30"
            >
              {i + 1}
            </div>
          ));
        })()}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-border text-xs text-text-muted">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-success" />
          פעיל
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-error" />
          חסום
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-warning" />
          שעות מיוחדות
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
          יום חופש
        </div>
      </div>
    </div>
  );
}

```

---

## `src/components/admin/DayDetailPanel.tsx`

```tsx
"use client";

import { useState } from "react";
import {
  X,
  Ban,
  Clock,
  Trash2,
  RotateCcw,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { DAYS_OF_WEEK_HE, CATEGORY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ExceptionItem {
  id: string;
  date: string;
  type: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  category: string | null;
}

interface Rule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  category: string | null;
}

interface DayDetailPanelProps {
  date: Date;
  rules: Rule[];
  exceptions: ExceptionItem[];
  selectedCategory: string | null;
  onClose: () => void;
  onAddException: (data: {
    date: string;
    type: "BLOCKED" | "OVERRIDE";
    startTime?: string;
    endTime?: string;
    reason?: string;
    category: string | null;
  }) => Promise<void>;
  onDeleteException: (id: string) => Promise<void>;
  onUpdateRule: (dayOfWeek: number, updates: Partial<Rule>) => Promise<void>;
}

function toDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}


export default function DayDetailPanel({
  date,
  rules,
  exceptions,
  selectedCategory,
  onClose,
  onAddException,
  onDeleteException,
  onUpdateRule,
}: DayDetailPanelProps) {
  const [mode, setMode] = useState<"view" | "custom-hours">("view");
  const [customStart, setCustomStart] = useState("09:00");
  const [customEnd, setCustomEnd] = useState("18:00");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dayOfWeek = date.getDay();
  const dateKey = toDateString(date);
  const dayName = DAYS_OF_WEEK_HE[dayOfWeek];

  const formattedDate = date.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Find ALL rules for this day (not just one)
  const categoryRules = rules
    .filter((r) => r.dayOfWeek === dayOfWeek && r.category === selectedCategory)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const generalRules = rules
    .filter((r) => r.dayOfWeek === dayOfWeek && r.category === null)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const activeRules = (selectedCategory && categoryRules.length > 0) ? categoryRules : generalRules;

  // Find exceptions for this date
  const dayExceptions = exceptions.filter((e) => {
    const excDate = new Date(e.date);
    const excKey = toDateString(excDate);
    return excKey === dateKey;
  });

  // Determine current status
  const categoryException = dayExceptions.find(
    (e) => e.category === selectedCategory
  );
  const generalException = dayExceptions.find((e) => e.category === null);
  const activeException = categoryException || generalException;

  let statusLabel: string;
  let statusVariant: "success" | "error" | "warning" | "default";
  let effectiveHours: string | null = null;

  if (activeException) {
    if (activeException.type === "BLOCKED") {
      statusLabel = "חסום";
      statusVariant = "error";
    } else {
      statusLabel = "שעות מיוחדות";
      statusVariant = "warning";
      effectiveHours = `${activeException.startTime} - ${activeException.endTime}`;
    }
  } else if (activeRules.some((r) => r.isActive)) {
    statusLabel = "פעיל";
    statusVariant = "success";
    // Show all active time ranges
    const activeTimeRanges = activeRules.filter((r) => r.isActive);
    effectiveHours = activeTimeRanges
      .map((r) => `${r.startTime} - ${r.endTime}`)
      .join(" , ");
  } else {
    statusLabel = "יום חופש";
    statusVariant = "default";
  }

  const handleBlock = async () => {
    setIsSubmitting(true);
    try {
      await onAddException({
        date: new Date(date).toISOString(),
        type: "BLOCKED",
        reason: reason || undefined,
        category: selectedCategory,
      });
      setReason("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomHours = async () => {
    setIsSubmitting(true);
    try {
      await onAddException({
        date: new Date(date).toISOString(),
        type: "OVERRIDE",
        startTime: customStart,
        endTime: customEnd,
        reason: reason || undefined,
        category: selectedCategory,
      });
      setMode("view");
      setReason("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRule = async () => {
    const newActive = !activeRules.some((r) => r.isActive);
    // Toggle ALL rules for this day (updateRule handles multiple rules)
    await onUpdateRule(dayOfWeek, { isActive: newActive });
  };

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface/50 border-b border-border">
        <div>
          <h3 className="font-bold text-text">{formattedDate}</h3>
          {selectedCategory && (
            <span className="text-xs text-text-muted">
              {CATEGORY_LABELS[selectedCategory]}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white text-text-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Current Status */}
        <div className="flex items-center gap-3">
          <Badge variant={statusVariant} className="text-sm">
            {statusLabel}
          </Badge>
          {effectiveHours && (
            <span className="text-sm text-text-muted flex items-center gap-1" dir="ltr">
              <Clock className="h-3.5 w-3.5" />
              {effectiveHours}
            </span>
          )}
        </div>

        {/* Default Rule Info */}
        {activeRules.length > 0 && (
          <div className="text-xs text-text-muted bg-surface/50 rounded-lg px-3 py-2">
            ברירת מחדל ליום {dayName}:{" "}
            {activeRules.some((r) => r.isActive)
              ? activeRules
                  .filter((r) => r.isActive)
                  .map((r) => `${r.startTime} - ${r.endTime}`)
                  .join(" , ")
              : "יום חופש"}
          </div>
        )}

        {/* Existing Exceptions */}
        {dayExceptions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-muted">חריגות ביום זה:</p>
            {dayExceptions.map((exc) => (
              <div
                key={exc.id}
                className="flex items-center justify-between bg-surface/50 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant={exc.type === "BLOCKED" ? "error" : "warning"}
                    className="text-xs"
                  >
                    {exc.type === "BLOCKED" ? "חסום" : "מיוחד"}
                  </Badge>
                  {exc.category && (
                    <span className="text-xs text-text-muted">
                      {CATEGORY_LABELS[exc.category]}
                    </span>
                  )}
                  {exc.type === "OVERRIDE" && (
                    <span className="text-xs" dir="ltr">
                      {exc.startTime}-{exc.endTime}
                    </span>
                  )}
                  {exc.reason && (
                    <span className="text-xs text-text-muted">
                      ({exc.reason})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onDeleteException(exc.id)}
                  className="p-1 rounded text-error hover:bg-error/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Quick Actions */}
        {mode === "view" ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-muted">פעולות מהירות:</p>

            {/* Block Day */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="סיבה (אופציונלי)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-error border-error/20 hover:bg-error/5"
                  onClick={handleBlock}
                  isLoading={isSubmitting}
                >
                  <Ban className="h-4 w-4" />
                  חסום יום זה
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => setMode("custom-hours")}
                >
                  <Clock className="h-4 w-4" />
                  שעות מיוחדות
                </Button>
              </div>
            </div>

            {/* Toggle weekly rule */}
            <button
              onClick={handleToggleRule}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-right",
                "text-text-muted hover:bg-surface"
              )}
            >
              <RotateCcw className="h-4 w-4" />
              {activeRules.some((r) => r.isActive)
                ? `הפוך את כל ימי ${dayName} ליום חופש`
                : `הפעל את כל ימי ${dayName}`}
            </button>
          </div>
        ) : (
          /* Custom Hours Form */
          <div className="space-y-3">
            <p className="text-sm font-medium text-text">הגדרת שעות מיוחדות:</p>
            <div className="grid grid-cols-2 gap-3" dir="ltr">
              <div>
                <label className="text-xs text-text-muted block mb-1 text-right">
                  שעת התחלה
                </label>
                <input
                  type="time"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white text-center"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1 text-right">
                  שעת סיום
                </label>
                <input
                  type="time"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white text-center"
                />
              </div>
            </div>
            <input
              type="text"
              placeholder="סיבה (אופציונלי)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={handleCustomHours}
                isLoading={isSubmitting}
              >
                שמור
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode("view")}
              >
                ביטול
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

```

---

## `src/components/layout/AdminSidebar.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";
import {
  LayoutDashboard,
  Calendar,
  Settings2,
  Clock,
  ImageIcon,
  FileText,
  MessageSquare,
  Star,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LOGO_PATH, SITE_NAME } from "@/lib/constants";
import { useSiteImages } from "@/lib/hooks/useSiteImages";

const navItems = [
  { label: "לוח בקרה", href: "/admin", icon: LayoutDashboard },
  { label: "הזמנות", href: "/admin/bookings", icon: Calendar },
  { label: "שירותים", href: "/admin/services", icon: Settings2 },
  { label: "זמינות", href: "/admin/availability", icon: Clock },
  { label: "תמונות", href: "/admin/images", icon: ImageIcon },
  { label: "תוכן האתר", href: "/admin/content", icon: FileText },
  { label: "פניות", href: "/admin/leads", icon: MessageSquare },
  { label: "המלצות", href: "/admin/reviews", icon: Star },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { images } = useSiteImages();
  const logoSrc = images.logo?.imagePath || LOGO_PATH;
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch("/api/admin/bookings?status=PENDING")
      .then((r) => r.json())
      .then((r) => setPendingCount(r.data?.length || 0))
      .catch(() => {});
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-64 bg-white border-l border-border flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Link href="/admin" className="flex items-center gap-2">
            <Image
              src={logoSrc}
              alt={images.logo?.alt || SITE_NAME}
              width={80}
              height={28}
              className="h-7 w-auto"
            />
            <span className="text-sm font-medium text-text-muted">ניהול</span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded text-text-muted hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/20 text-secondary"
                    : "text-text-secondary hover:bg-surface hover:text-text"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.5} />
                {item.label}
                {item.href === "/admin/bookings" && pendingCount > 0 && (
                  <span className="mr-auto bg-warning text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-error hover:bg-error/5 w-full transition-colors"
          >
            <LogOut className="h-5 w-5" strokeWidth={1.5} />
            התנתקות
          </button>
        </div>
      </aside>
    </>
  );
}

```

---

# 8. ADMIN API ROUTES

## `src/app/api/admin/dashboard/route.ts`

```ts
import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [todayBookings, weekBookings, newLeads, pendingReviews, pendingBookings, todayBookingsList, recentLeads] =
      await Promise.all([
        prisma.booking.count({
          where: {
            startAt: { gte: todayStart, lt: todayEnd },
            status: { not: "CANCELLED" },
          },
        }),
        prisma.booking.count({
          where: {
            startAt: { gte: weekStart, lt: weekEnd },
            status: { not: "CANCELLED" },
          },
        }),
        prisma.lead.count({ where: { status: "NEW" } }),
        prisma.review.count({ where: { isApproved: false } }),
        prisma.booking.count({ where: { status: "PENDING" } }),
        prisma.booking.findMany({
          where: {
            startAt: { gte: todayStart, lt: todayEnd },
            status: { not: "CANCELLED" },
          },
          include: { service: true },
          orderBy: { startAt: "asc" },
        }),
        prisma.lead.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

    // Auto-mark past CONFIRMED bookings as COMPLETED
    await prisma.booking.updateMany({
      where: {
        status: "CONFIRMED",
        endAt: { lt: now },
      },
      data: { status: "COMPLETED" },
    });

    return NextResponse.json({
      data: {
        stats: { todayBookings, weekBookings, newLeads, pendingReviews, pendingBookings },
        todayBookingsList,
        recentLeads,
      },
    });
  } catch (error) {
    console.error("[DASHBOARD]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

```

---

## `src/app/api/admin/availability/route.ts`

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { availabilityRuleSchema, availabilityExceptionSchema } from "@/lib/validations";

// GET all rules + exceptions
export async function GET() {
  try {
    const [rules, exceptions] = await Promise.all([
      prisma.availabilityRule.findMany({ orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] }),
      prisma.availabilityException.findMany({
        orderBy: { date: "asc" },
      }),
    ]);

    return NextResponse.json({ data: { rules, exceptions } });
  } catch (error) {
    console.error("[AVAILABILITY_GET]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// POST — create or update rule / create exception
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type: actionType } = body;

    if (actionType === "rule") {
      const validated = availabilityRuleSchema.safeParse(body.data);
      if (!validated.success) {
        return NextResponse.json(
          { error: "נתונים לא תקינים", details: validated.error.flatten() },
          { status: 400 }
        );
      }

      const category = body.data.category ?? null;
      const ruleId = body.data.id as string | undefined;

      let rule;
      if (ruleId) {
        // Update existing rule by ID
        rule = await prisma.availabilityRule.update({
          where: { id: ruleId },
          data: { ...validated.data, category },
        });
      } else {
        // Create new rule (allows multiple per day)
        rule = await prisma.availabilityRule.create({
          data: { ...validated.data, category },
        });
      }

      return NextResponse.json({ data: rule }, { status: 201 });
    }

    if (actionType === "exception") {
      const validated = availabilityExceptionSchema.safeParse(body.data);
      if (!validated.success) {
        return NextResponse.json(
          { error: "נתונים לא תקינים", details: validated.error.flatten() },
          { status: 400 }
        );
      }

      const excCategory = body.data.category ?? null;
      const excDate = new Date(validated.data.date);
      // Normalize date to start of day for comparison
      excDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(excDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Check for existing exception on the same date+category — replace it
      const existing = await prisma.availabilityException.findFirst({
        where: {
          date: { gte: excDate, lt: nextDay },
          category: excCategory,
        },
      });

      let exception;
      if (existing) {
        // Update existing exception instead of creating duplicate
        exception = await prisma.availabilityException.update({
          where: { id: existing.id },
          data: {
            type: validated.data.type,
            startTime: validated.data.startTime || null,
            endTime: validated.data.endTime || null,
            reason: validated.data.reason || null,
          },
        });
      } else {
        exception = await prisma.availabilityException.create({
          data: {
            date: new Date(validated.data.date),
            type: validated.data.type,
            startTime: validated.data.startTime || null,
            endTime: validated.data.endTime || null,
            reason: validated.data.reason || null,
            category: excCategory,
          },
        });
      }

      return NextResponse.json({ data: exception }, { status: 201 });
    }

    return NextResponse.json({ error: "סוג פעולה לא תקין" }, { status: 400 });
  } catch (error) {
    console.error("[AVAILABILITY_POST]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

```

---

## `src/app/api/admin/availability/[id]/route.ts`

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE exception or rule by id
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Try deleting as exception first
    try {
      await prisma.availabilityException.delete({
        where: { id: params.id },
      });
      return NextResponse.json({ success: true });
    } catch {
      // Not an exception — try as a rule
    }

    // Try deleting as rule
    await prisma.availabilityRule.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AVAILABILITY_DELETE]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

```

---

## `src/app/api/admin/bookings/route.ts`

```ts
import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const serviceId = searchParams.get("serviceId");

    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") where.status = status;
    if (serviceId && serviceId !== "ALL") where.serviceId = serviceId;

    const bookings = await prisma.booking.findMany({
      where,
      include: { service: true },
      orderBy: { startAt: "desc" },
    });

    return NextResponse.json({ data: bookings });
  } catch (error) {
    console.error("[ADMIN_BOOKINGS_GET]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

```

---

## `src/app/api/admin/bookings/[id]/route.ts`

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendBookingApprovedEmail,
  sendBookingRejectedEmail,
} from "@/lib/email";

// PATCH — update booking status or admin notes
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status, adminNotes } = body;

    const data: Record<string, unknown> = {};
    if (status) {
      data.status = status;
      if (status === "CANCELLED") data.cancelledAt = new Date();
    }
    if (adminNotes !== undefined) data.adminNotes = adminNotes;

    const booking = await prisma.booking.update({
      where: { id: params.id },
      data,
      include: { service: true },
    });

    // Send email notification on status change
    if (status && booking.customerEmail) {
      const emailData = {
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        serviceName: booking.service.name,
        startAt: booking.startAt,
        cancelToken: booking.cancelToken,
      };

      if (status === "CONFIRMED") {
        sendBookingApprovedEmail(emailData);
      } else if (status === "REJECTED" || status === "CANCELLED") {
        sendBookingRejectedEmail(emailData);
      }
    }

    return NextResponse.json({ data: booking });
  } catch (error) {
    console.error("[ADMIN_BOOKING_PATCH]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// DELETE
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.booking.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_BOOKING_DELETE]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

```

---

## `src/app/api/admin/services/route.ts`

```ts
import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceSchema } from "@/lib/validations";

// GET all services (admin)
export async function GET() {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

  try {
    const services = await prisma.service.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ data: services });
  } catch (error) {
    console.error("[ADMIN_SERVICES_GET]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// POST create service
export async function POST(req: Request) {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

  try {
    const body = await req.json();
    const validated = serviceSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await prisma.service.findUnique({
      where: { slug: validated.data.slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "slug כבר קיים, יש לבחור ערך ייחודי" },
        { status: 409 }
      );
    }

    const service = await prisma.service.create({
      data: {
        name: validated.data.name,
        slug: validated.data.slug,
        shortDesc: validated.data.shortDesc,
        description: validated.data.description,
        category: validated.data.category,
        duration: validated.data.duration,
        price: validated.data.price,
        image: validated.data.image || null,
        suitableFor: validated.data.suitableFor || null,
        isActive: validated.data.isActive,
        sortOrder: validated.data.sortOrder,
      },
    });

    return NextResponse.json({ data: service }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN_SERVICES_POST]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

```

---

## `src/app/api/admin/services/[id]/route.ts`

```ts
import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceSchema } from "@/lib/validations";

// PATCH update service
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

  try {
    const { id } = params;

    // Check service exists
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "שירות לא נמצא" }, { status: 404 });
    }

    const body = await req.json();
    const validated = serviceSchema.partial().safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    // If slug is being changed, check uniqueness
    if (validated.data.slug && validated.data.slug !== existing.slug) {
      const slugExists = await prisma.service.findUnique({
        where: { slug: validated.data.slug },
      });
      if (slugExists) {
        return NextResponse.json(
          { error: "slug כבר קיים, יש לבחור ערך ייחודי" },
          { status: 409 }
        );
      }
    }

    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(validated.data.name !== undefined && { name: validated.data.name }),
        ...(validated.data.slug !== undefined && { slug: validated.data.slug }),
        ...(validated.data.shortDesc !== undefined && {
          shortDesc: validated.data.shortDesc,
        }),
        ...(validated.data.description !== undefined && {
          description: validated.data.description,
        }),
        ...(validated.data.category !== undefined && {
          category: validated.data.category,
        }),
        ...(validated.data.duration !== undefined && {
          duration: validated.data.duration,
        }),
        ...(validated.data.price !== undefined && {
          price: validated.data.price,
        }),
        ...(validated.data.image !== undefined && {
          image: validated.data.image || null,
        }),
        ...(validated.data.suitableFor !== undefined && {
          suitableFor: validated.data.suitableFor || null,
        }),
        ...(validated.data.isActive !== undefined && {
          isActive: validated.data.isActive,
        }),
        ...(validated.data.sortOrder !== undefined && {
          sortOrder: validated.data.sortOrder,
        }),
      },
    });

    return NextResponse.json({ data: service });
  } catch (error) {
    console.error("[ADMIN_SERVICES_PATCH]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// DELETE service
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

  try {
    const { id } = params;

    // Check service exists
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "שירות לא נמצא" }, { status: 404 });
    }

    // Check for related bookings
    const bookingCount = await prisma.booking.count({
      where: { serviceId: id },
    });

    if (bookingCount > 0) {
      return NextResponse.json(
        {
          error: `לא ניתן למחוק שירות עם ${bookingCount} הזמנות. ניתן לבטל את הפעלתו במקום.`,
        },
        { status: 409 }
      );
    }

    await prisma.service.delete({ where: { id } });

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("[ADMIN_SERVICES_DELETE]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

```

---

## `src/app/api/admin/reviews/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter");

    const where: Record<string, unknown> = {};
    if (filter === "approved") {
      where.isApproved = true;
    } else if (filter === "pending") {
      where.isApproved = false;
    }

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: reviews });
  } catch (error) {
    console.error("[ADMIN_REVIEWS_GET]", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת המלצות" },
      { status: 500 }
    );
  }
}

```

---

## `src/app/api/admin/reviews/[id]/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

  try {
    const body = await req.json();
    const { isApproved } = body;

    const existing = await prisma.review.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "המלצה לא נמצאה" }, { status: 404 });
    }

    const updated = await prisma.review.update({
      where: { id: params.id },
      data: { isApproved },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[ADMIN_REVIEWS_PATCH]", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון המלצה" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

  try {
    const existing = await prisma.review.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "המלצה לא נמצאה" }, { status: 404 });
    }

    await prisma.review.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_REVIEWS_DELETE]", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת המלצה" },
      { status: 500 }
    );
  }
}

```

---

## `src/app/api/admin/leads/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: leads });
  } catch (error) {
    console.error("[ADMIN_LEADS_GET]", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת פניות" },
      { status: 500 }
    );
  }
}

```

---

## `src/app/api/admin/leads/[id]/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

  try {
    const body = await req.json();
    const { status, adminNotes } = body;

    const existing = await prisma.lead.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "פנייה לא נמצאה" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    const updated = await prisma.lead.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[ADMIN_LEADS_PATCH]", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון פנייה" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "לא מורשה" }, { status: 401 });
  // }

  try {
    const existing = await prisma.lead.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "פנייה לא נמצאה" }, { status: 404 });
    }

    await prisma.lead.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_LEADS_DELETE]", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת פנייה" },
      { status: 500 }
    );
  }
}

```

---

## `src/app/api/admin/gift-cards/route.ts`

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — list all gift cards
export async function GET() {
  try {
    const giftCards = await prisma.giftCard.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: giftCards });
  } catch (error) {
    console.error("[GIFT_CARDS_GET]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// POST — create a new gift card
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { recipientName, senderName, serviceName, message } = body;

    if (!recipientName || !serviceName || !message) {
      return NextResponse.json(
        { error: "יש למלא את כל השדות הנדרשים" },
        { status: 400 }
      );
    }

    const giftCard = await prisma.giftCard.create({
      data: {
        recipientName,
        senderName: senderName || null,
        serviceName,
        message,
      },
    });

    return NextResponse.json({ data: giftCard }, { status: 201 });
  } catch (error) {
    console.error("[GIFT_CARDS_POST]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

```

---

## `src/app/api/admin/gift-cards/[id]/route.ts`

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE — delete a gift card
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.giftCard.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[GIFT_CARD_DELETE]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

// PATCH — mark as redeemed
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (body.isRedeemed !== undefined) {
      data.isRedeemed = body.isRedeemed;
      data.redeemedAt = body.isRedeemed ? new Date() : null;
    }

    const giftCard = await prisma.giftCard.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ data: giftCard });
  } catch (error) {
    console.error("[GIFT_CARD_PATCH]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

```

---

## `src/app/api/admin/site-content/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all site content
export async function GET() {
  try {
    const content = await prisma.siteContent.findMany({
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json({ data: content });
  } catch (error) {
    console.error("[SITE_CONTENT_GET]", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת תוכן" },
      { status: 500 }
    );
  }
}

// POST - create or update site content
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { section, key, value, sortOrder } = body;

    if (!section || !key) {
      return NextResponse.json(
        { error: "חסרים שדות חובה" },
        { status: 400 }
      );
    }

    const content = await prisma.siteContent.upsert({
      where: { section_key: { section, key } },
      update: { value: value ?? "", sortOrder: sortOrder ?? 0 },
      create: { section, key, value: value ?? "", sortOrder: sortOrder ?? 0 },
    });

    return NextResponse.json({ data: content });
  } catch (error) {
    console.error("[SITE_CONTENT_POST]", error);
    return NextResponse.json(
      { error: "שגיאה בשמירת תוכן" },
      { status: 500 }
    );
  }
}

// DELETE - remove site content by id
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
    }

    await prisma.siteContent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SITE_CONTENT_DELETE]", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת תוכן" },
      { status: 500 }
    );
  }
}

```

---

## `src/app/api/admin/site-images/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all site images
export async function GET() {
  try {
    const images = await prisma.siteImage.findMany({
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    });
    return NextResponse.json({ data: images });
  } catch (error) {
    console.error("[SITE_IMAGES_GET]", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת תמונות" },
      { status: 500 }
    );
  }
}

// POST - add or update a site image
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, section, imagePath, alt, sortOrder } = body;

    if (!section || !imagePath) {
      return NextResponse.json(
        { error: "חסרים שדות חובה" },
        { status: 400 }
      );
    }

    let image;
    if (id) {
      // Update existing
      image = await prisma.siteImage.update({
        where: { id },
        data: { imagePath, alt: alt || "", sortOrder: sortOrder ?? 0 },
      });
    } else {
      // For non-hero sections, upsert (replace existing)
      if (section !== "hero") {
        const existing = await prisma.siteImage.findFirst({
          where: { section },
        });
        if (existing) {
          image = await prisma.siteImage.update({
            where: { id: existing.id },
            data: { imagePath, alt: alt || "" },
          });
        } else {
          image = await prisma.siteImage.create({
            data: { section, imagePath, alt: alt || "" },
          });
        }
      } else {
        // Hero: add new (multiple allowed)
        const maxSort = await prisma.siteImage.findFirst({
          where: { section: "hero" },
          orderBy: { sortOrder: "desc" },
        });
        image = await prisma.siteImage.create({
          data: {
            section: "hero",
            imagePath,
            alt: alt || "",
            sortOrder: (maxSort?.sortOrder ?? -1) + 1,
          },
        });
      }
    }

    return NextResponse.json({ data: image });
  } catch (error) {
    console.error("[SITE_IMAGES_POST]", error);
    return NextResponse.json(
      { error: "שגיאה בשמירת תמונה" },
      { status: 500 }
    );
  }
}

// DELETE - remove a site image by id
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });
    }

    await prisma.siteImage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SITE_IMAGES_DELETE]", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת תמונה" },
      { status: 500 }
    );
  }
}

```

---

## `src/app/api/admin/upload/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "סוג קובץ לא נתמך. השתמשו ב-JPG, PNG, WebP או SVG" },
        { status: 400 }
      );
    }

    // Validate file size (25MB max)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "הקובץ גדול מדי. מקסימום 25MB" },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: "public",
    });

    return NextResponse.json({
      path: blob.url,
      filename: file.name,
    });
  } catch (error) {
    console.error("[UPLOAD]", error);
    return NextResponse.json(
      { error: "שגיאה בהעלאת הקובץ" },
      { status: 500 }
    );
  }
}

```

---

# 9. PUBLIC API ROUTES (Supporting Admin)

## `src/app/api/availability-days/route.ts`

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — return which days of week have active availability rules
// AND which specific dates are blocked (exceptions)
export async function GET() {
  try {
    const [rules, exceptions] = await Promise.all([
      prisma.availabilityRule.findMany({
        where: { isActive: true },
        select: { dayOfWeek: true },
      }),
      prisma.availabilityException.findMany({
        where: {
          type: "BLOCKED",
          date: { gte: new Date() }, // Only future blocked dates
        },
        select: { date: true, category: true },
      }),
    ]);

    const daySet = new Set(rules.map((r) => r.dayOfWeek));
    const activeDays = Array.from(daySet);

    // Return blocked dates as ISO date strings (YYYY-MM-DD)
    const blockedDates = exceptions.map((e) => {
      const d = new Date(e.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });
    // Deduplicate (a date blocked for ANY category blocks the whole day visually)
    const uniqueBlockedDates = Array.from(new Set(blockedDates));

    return NextResponse.json({
      data: activeDays,
      blockedDates: uniqueBlockedDates,
    });
  } catch (error) {
    console.error("[AVAILABILITY_DAYS_GET]", error);
    return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
  }
}

```

---

## `src/app/api/bookings/route.ts`

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots, isSlotAvailable } from "@/lib/slots";
import { bookingSchema } from "@/lib/validations";

// GET available slots for a date + service
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const serviceId = searchParams.get("serviceId");

    if (!dateStr || !serviceId) {
      return NextResponse.json(
        { error: "חסרים פרמטרים: date, serviceId" },
        { status: 400 }
      );
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "תאריך לא תקין" },
        { status: 400 }
      );
    }

    const slots = await getAvailableSlots(date, serviceId);
    return NextResponse.json({ data: slots });
  } catch (error) {
    console.error("[BOOKINGS_GET]", error);
    return NextResponse.json(
      { error: "שגיאת שרת" },
      { status: 500 }
    );
  }
}

// POST create booking
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validated = bookingSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "נתונים לא תקינים", details: validated.error.flatten() },
        { status: 400 }
      );
    }

    const { serviceId, startAt, customerName, customerPhone, customerEmail, notes, isHomeVisit: homeVisitFlag } =
      validated.data;

    const isHomeVisit = homeVisitFlag === true;

    // Get service for duration
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { duration: true, name: true, homeVisitSurcharge: true },
    });

    if (!service) {
      return NextResponse.json(
        { error: "שירות לא נמצא" },
        { status: 404 }
      );
    }

    const startDate = new Date(startAt);
    const endDate = new Date(startDate.getTime() + service.duration * 60 * 1000);

    // Re-check availability inside transaction
    const available = await isSlotAvailable(startDate, endDate);
    if (!available) {
      return NextResponse.json(
        { error: "הזמן שבחרת כבר לא פנוי, אנא בחרו זמן אחר" },
        { status: 409 }
      );
    }

    const booking = await prisma.booking.create({
      data: {
        serviceId,
        startAt: startDate,
        endAt: endDate,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        notes: notes || null,
        status: "PENDING",
        isHomeVisit,
        homeVisitSurcharge: isHomeVisit ? (service.homeVisitSurcharge || 0) : null,
      },
      include: { service: true },
    });

    return NextResponse.json({ data: booking }, { status: 201 });
  } catch (error) {
    // Handle unique constraint violation (double booking)
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "הזמן שבחרת כבר לא פנוי, אנא בחרו זמן אחר" },
        { status: 409 }
      );
    }

    console.error("[BOOKINGS_POST]", error);
    return NextResponse.json(
      { error: "שגיאת שרת, אנא נסו שוב מאוחר יותר" },
      { status: 500 }
    );
  }
}

```

---

## `src/app/api/site-images/route.ts`

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET all site images (public)
export async function GET() {
  try {
    const images = await prisma.siteImage.findMany({
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    });

    // Hero is an array (carousel), others are single
    const heroImages = images
      .filter((img) => img.section === "hero" && img.imagePath)
      .map((img) => ({ imagePath: img.imagePath, alt: img.alt }));

    const result: Record<string, unknown> = {};
    for (const img of images) {
      if (img.section !== "hero" && img.imagePath) {
        result[img.section] = { imagePath: img.imagePath, alt: img.alt };
      }
    }
    if (heroImages.length > 0) {
      result.hero = heroImages;
    }

    return NextResponse.json({ data: result }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    console.error("[SITE_IMAGES_PUBLIC_GET]", error);
    return NextResponse.json({ data: {} }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }
}

```

---

## `src/app/api/site-content/route.ts`

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.siteContent.findMany({
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    });

    // Group by section, then by key
    const result: Record<string, Record<string, string>> = {};

    for (const row of rows) {
      if (!result[row.section]) {
        result[row.section] = {};
      }
      result[row.section][row.key] = row.value;
    }

    return NextResponse.json(
      { data: result },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error) {
    console.error("[SITE_CONTENT_PUBLIC_GET]", error);
    return NextResponse.json(
      { data: {} },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  }
}

```

---

# 10. UI COMPONENTS (Shared)

## `src/components/ui/Accordion.tsx`

```tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface AccordionItem {
  question: string;
  answer: string;
}

interface AccordionProps {
  items: AccordionItem[];
  className?: string;
}

export default function Accordion({ items, className }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item, index) => (
        <div
          key={index}
          className="bg-white rounded-xl border border-border overflow-hidden"
        >
          <button
            onClick={() => toggle(index)}
            className="w-full flex items-center justify-between px-6 py-4 text-right hover:bg-surface/50 transition-colors"
            aria-expanded={openIndex === index}
          >
            <span className="font-medium text-text">{item.question}</span>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-text-muted transition-transform duration-200 flex-shrink-0 ms-4",
                openIndex === index && "rotate-180"
              )}
            />
          </button>
          <AnimatePresence>
            {openIndex === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <div className="px-6 pb-4 text-text-secondary leading-relaxed">
                  {item.answer}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

```

---

## `src/components/ui/Badge.tsx`

```tsx
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
}

const variantStyles: Record<string, string> = {
  default: "bg-surface text-text-secondary border-border",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  error: "bg-error/10 text-error border-error/20",
  info: "bg-info/10 text-info border-info/20",
};

export default function Badge({ children, className, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

```

---

## `src/components/ui/Button.tsx`

```tsx
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-secondary text-white hover:bg-secondary-dark focus:ring-secondary shadow-sm",
  secondary:
    "bg-primary text-text hover:bg-primary-dark focus:ring-primary shadow-sm",
  ghost:
    "bg-transparent text-text hover:bg-surface-alt focus:ring-secondary",
  danger:
    "bg-error text-white hover:bg-red-700 focus:ring-error shadow-sm",
  outline:
    "bg-transparent border-2 border-secondary text-secondary hover:bg-secondary hover:text-white focus:ring-secondary",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;

```

---

## `src/components/ui/Card.tsx`

```tsx
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className, hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      className={cn(
        "bg-white rounded-xl border border-border p-4 sm:p-6 shadow-sm",
        hover && "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

```

---

## `src/components/ui/Container.tsx`

```tsx
import { cn } from "@/lib/utils";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function Container({ children, className }: ContainerProps) {
  return (
    <div className={cn("max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

```

---

## `src/components/ui/EmptyState.tsx`

```tsx
import { cn } from "@/lib/utils";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="mb-4 text-text-muted">
        {icon || <Inbox className="h-12 w-12" strokeWidth={1.5} />}
      </div>
      <h3 className="text-lg font-medium text-text mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

```

---

## `src/components/ui/Input.tsx`

```tsx
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, type, ...props }, ref) => {
    const inputId = id || label?.replace(/\s+/g, "-").toLowerCase();
    const isLtrInput = type === "tel" || type === "email" || type === "number" || type === "url";

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          dir={isLtrInput ? "ltr" : undefined}
          className={cn(
            "w-full px-4 py-3 rounded-lg border bg-white text-text transition-colors duration-200",
            "placeholder:text-text-muted",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface",
            error
              ? "border-error focus:ring-error"
              : "border-border hover:border-text-muted",
            isLtrInput && "text-left",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-error">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-text-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;

```

---

## `src/components/ui/Modal.tsx`

```tsx
"use client";

import { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = "md",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap
      if (e.key === "Tab" && contentRef.current) {
        const focusable = contentRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";

      // Focus first focusable element
      setTimeout(() => {
        const focusable = contentRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        size === "lg" ? "p-0 sm:p-4" : "p-4"
      )}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Content */}
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative w-full flex flex-col bg-white shadow-lg z-10",
          "animate-in fade-in zoom-in-95 duration-200",
          size === "lg"
            ? "h-full sm:h-auto sm:max-h-[90vh] sm:rounded-xl max-w-none sm:max-w-2xl"
            : cn("max-h-[90vh] rounded-xl", sizeStyles[size]),
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
            <h2 className="text-xl font-semibold text-text">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors"
              aria-label="סגירה"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className={cn("px-4 sm:px-6 py-3 sm:py-4 overflow-y-auto", !title && "pt-6")}>
          {!title && (
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors"
              aria-label="סגירה"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

```

---

## `src/components/ui/Section.tsx`

```tsx
import { cn } from "@/lib/utils";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  bg?: "default" | "surface" | "surface-alt";
}

const bgStyles = {
  default: "bg-bg",
  surface: "bg-surface",
  "surface-alt": "bg-surface-alt",
};

export default function Section({ children, className, id, bg = "default" }: SectionProps) {
  return (
    <section
      id={id}
      className={cn("py-10 md:py-16 lg:py-24", bgStyles[bg], className)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </section>
  );
}

```

---

## `src/components/ui/Select.tsx`

```tsx
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const inputId = id || label?.replace(/\s+/g, "-").toLowerCase();

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              "w-full px-4 py-3 rounded-lg border bg-white text-text transition-colors duration-200 appearance-none",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface",
              error
                ? "border-error focus:ring-error"
                : "border-border hover:border-text-muted",
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-muted pointer-events-none" />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-error">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;

```

---

## `src/components/ui/ServiceIcon.tsx`

```tsx
"use client";

import {
  Hand,
  Flower2,
  Leaf,
  TreePine,
  Sprout,
  Mountain,
  Sun,
  Moon,
  Waves,
  Wind,
  Droplets,
  Heart,
  HeartHandshake,
  Sparkles,
  Star,
  Gem,
  Feather,
  Flame,
  Shell,
  Activity,
  Dumbbell,
  Footprints,
  Users,
  User,
  Baby,
  CloudSun,
  Sunrise,
  Bird,
  CircleDot,
  Orbit,
  type LucideProps,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<LucideProps>> = {
  Hand,
  Flower2,
  Leaf,
  TreePine,
  Sprout,
  Mountain,
  Sun,
  Moon,
  Waves,
  Wind,
  Droplets,
  Heart,
  HeartHandshake,
  Sparkles,
  Star,
  Gem,
  Feather,
  Flame,
  Shell,
  Activity,
  Dumbbell,
  Footprints,
  Users,
  User,
  Baby,
  CloudSun,
  Sunrise,
  Bird,
  CircleDot,
  Orbit,
};

interface ServiceIconProps {
  name?: string | null;
  className?: string;
  strokeWidth?: number;
}

export default function ServiceIcon({
  name,
  className = "h-8 w-8",
  strokeWidth = 1.5,
}: ServiceIconProps) {
  const IconComponent = name ? iconMap[name] : null;
  if (!IconComponent) {
    return <Hand className={className} strokeWidth={strokeWidth} />;
  }
  return <IconComponent className={className} strokeWidth={strokeWidth} />;
}

export { iconMap };

```

---

## `src/components/ui/Spinner.tsx`

```tsx
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}

const sizeStyles = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export default function Spinner({ className, size = "md", label }: SpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeStyles[size])} />
      {label && <p className="text-sm text-text-secondary">{label}</p>}
    </div>
  );
}

```

---

## `src/components/ui/StarRating.tsx`

```tsx
"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

const sizeStyles = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export default function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onChange,
}: StarRatingProps) {
  return (
    <div className="flex gap-0.5" dir="ltr">
      {Array.from({ length: maxRating }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= rating;

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(starValue)}
            className={cn(
              "transition-colors",
              interactive
                ? "cursor-pointer hover:scale-110"
                : "cursor-default"
            )}
            aria-label={`${starValue} כוכבים`}
          >
            <Star
              className={cn(
                sizeStyles[size],
                isFilled
                  ? "fill-warning text-warning"
                  : "fill-none text-border"
              )}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
}

```

---

## `src/components/ui/Textarea.tsx`

```tsx
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.replace(/\s+/g, "-").toLowerCase();

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full px-4 py-3 rounded-lg border bg-white text-text transition-colors duration-200 resize-y min-h-[100px]",
            "placeholder:text-text-muted",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface",
            error
              ? "border-error focus:ring-error"
              : "border-border hover:border-text-muted",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-error">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-text-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;

```

---

# 11. DATABASE SEED

## `prisma/seed.ts`

```ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── Admin User ─────────────────────────
  const hashedPassword = await bcrypt.hash("Admin123!", 12);
  await prisma.user.upsert({
    where: { email: "hilahalfo1@gmail.com" },
    update: {},
    create: {
      email: "hilahalfo1@gmail.com",
      hashedPassword,
      name: "הילה",
      role: "ADMIN",
    },
  });
  console.log("Admin user created");

  // ─── Services ───────────────────────────
  const services = [
    {
      slug: "thai-massage",
      name: "עיסוי תאילנדי",
      category: "MASSAGE",
      duration: 70,
      price: 300,
      shortDesc: "עיסוי תאילנדי מסורתי – הרגעת שרירים, תנועה למפרקים ומתיחות",
      description: "עיסוי תאילנדי מסורתי המתמקד בהרגעת השרירים, הכנסת תנועה למפרקים ומתיחות מאריכות גוף.",
      suitableFor: "סובלים מכאבי שרירים ומפרקים\nמחפשים הרפיה עמוקה ושחרור מתחים\nספורטאים שרוצים לשפר ביצועים\nמחפשים גמישות ותנועתיות",
      sortOrder: 1,
    },
    {
      slug: "deep-tissue",
      name: "עיסוי רקמות עמוק",
      category: "MASSAGE",
      duration: 70,
      price: 350,
      shortDesc: "טיפול בשמן חם ממוקד בשכבות העמוקות של השריר",
      description: "עיסוי רקמות עמוק בשמן חם, טיפול ממוקד בשכבות העמוקות של השריר. מסייע בשחרור מתחים כרוניים, הידבקויות ומגבלות תנועה.",
      suitableFor: "סובלים ממתחים כרוניים\nסובלים מכאבי גב, צוואר או כתפיים\nספורטאים לאחר אימון\nמחפשים טיפול עמוק וממוקד",
      sortOrder: 2,
    },
    {
      slug: "medical-massage",
      name: "עיסוי רפואי – אקוספורה תאילנדית",
      category: "MASSAGE",
      duration: 60,
      price: 300,
      shortDesc: "שיטה מבוססת נקודות לחיצה לבעיות ספציפיות בגוף",
      description: "אקוספורה תאילנדית – שיטה מבוססת נקודות לחיצה לבעיות ספציפיות בגוף. מבוצעת בבתי חולים בתאילנד וניתנת לטיפול ביותר מ-60 בעיות בגוף. יש ליצור קשר לבדיקת התאמה.",
      suitableFor: "סובלים מבעיות ספציפיות בגוף\nמחפשים טיפול רפואי מבוסס\nסובלים מכאבים כרוניים\nיש ליצור קשר לבדיקת התאמה",
      sortOrder: 3,
    },
    {
      slug: "foot-massage",
      name: "פוט מאסז׳",
      category: "MASSAGE",
      duration: 40,
      price: 200,
      shortDesc: "עיסוי כפות רגליים הכולל שהייה במי מלח חמים",
      description: "עיסוי בכפות הרגליים הכולל 10 דקות של שהייה במי מלח חמים המטהרים את הגוף, עיסוי בהתמקדות על נקודות לחיצה רלוונטיות ומתיחות לאורך הרגליים.",
      suitableFor: "מחפשים הרפיה ופינוק\nסובלים מעייפות ברגליים\nמחפשים טיפול מרענן וקצר\nלא מתאים לנשים בהריון",
      sortOrder: 4,
    },
    {
      slug: "private-yoga",
      name: "שיעור יוגה פרטי",
      category: "YOGA",
      duration: 60,
      price: 150,
      shortDesc: "שיעור מותאם אישית הכולל ציוד, עם אפשרות הגעה לבית הלקוח",
      description: "שיעור יוגה מותאם אישית הכולל ציוד ובמידת הצורך הגעה לבית הלקוח. מתאים לכולם – גיל שלישי, פיברומיאלגיה, הריון ועוד.",
      suitableFor: "מתחילים שרוצים ללמוד בסביבה תומכת\nמתרגלים מנוסים שרוצים להעמיק\nגיל שלישי\nנשים בהריון\nסובלים מפיברומיאלגיה",
      sortOrder: 5,
    },
    {
      slug: "wellness-retreat",
      name: "ריטריט יום חוויתי",
      category: "YOGA",
      duration: 0,
      price: 0,
      shortDesc: "אירועי יום בסגנון Wellness לקבוצה של 8 אנשים ומעלה",
      description: "מארגנת אירועי יום בסגנון Wellness לקבוצה של 8 אנשים ומעלה. לפרטים והתאמת אירוע אנא צרו קשר.",
      suitableFor: "קבוצות של 8 אנשים ומעלה\nאירועי חברה\nימי כיף\nמסיבות רווקות",
      sortOrder: 6,
    },
    {
      slug: "rehab-pilates",
      name: "פילאטיס שיקומי",
      category: "PILATES",
      duration: 60,
      price: 180,
      shortDesc: "שיעור פרטי בהתאמה אישית – גיל שלישי, הריון, אוסטאופורוזיס",
      description: "שיעור פילאטיס פרטי בהתאמה אישית, מתאים לגיל השלישי, הריון, אוסטאופורוזיס, פיברומיאלגיה ועוד. כולל ציוד והגעה עד בית הלקוח.",
      suitableFor: "גיל שלישי\nנשים בהריון\nסובלים מאוסטאופורוזיס\nסובלים מפיברומיאלגיה\nמתאוששים מפציעות",
      sortOrder: 7,
    },
    {
      slug: "sculpt-pilates",
      name: "פילאטיס מחטב",
      category: "PILATES",
      duration: 60,
      price: 140,
      shortDesc: "שיעור קבוצתי (עד 4 משתתפים) לחיטוב וחיזוק הגוף",
      description: "שיעור פילאטיס (עד 4 משתתפים) כולל ציוד ואופציה להגעה עד בית הלקוח. מתמקד בחיטוב הגוף, הארכה וחיזוק השרירים.",
      suitableFor: "מחפשים חיטוב וחיזוק הגוף\nרוצים לשפר יציבה\nמחפשים אימון בקבוצה קטנה\nמתאים לכל רמה",
      sortOrder: 8,
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: service,
      create: service,
    });
  }
  console.log(`${services.length} services created`);

  // ─── Availability Rules ─────────────────
  const existingRules = await prisma.availabilityRule.count();
  if (existingRules === 0) {
    const rules = [
      { dayOfWeek: 0, startTime: "11:00", endTime: "20:00" },
      { dayOfWeek: 1, startTime: "07:00", endTime: "20:00" },
      { dayOfWeek: 3, startTime: "07:00", endTime: "20:00" },
      { dayOfWeek: 4, startTime: "07:00", endTime: "20:00" },
      { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
      { dayOfWeek: 6, startTime: "11:00", endTime: "18:30" },
    ];
    for (const rule of rules) {
      await prisma.availabilityRule.create({
        data: { ...rule, isActive: true },
      });
    }
    console.log("Availability rules created");
  }

  // ─── Reviews ────────────────────────────
  const existingReviews = await prisma.review.count();
  if (existingReviews === 0) {
    const reviews = [
      {
        name: "שרה לוי",
        rating: 5,
        content: "טיפול מדהים! הגעתי עם כאבי גב חזקים ואחרי שלושה טיפולים ההבדל היה דרמטי. ממליצה בחום!",
        service: "עיסוי רקמות עמוק",
        isApproved: true,
      },
      {
        name: "דוד כהן",
        rating: 5,
        content: "המקצועיות והאווירה פשוט מושלמים. מרגיש שהגוף שלי מודה לי אחרי כל ביקור.",
        service: "עיסוי תאילנדי",
        isApproved: true,
      },
      {
        name: "מיכל ברק",
        rating: 4,
        content: "שיעורי היוגה הכי טובים שהיו לי. תשומת לב אישית ואווירה נהדרת.",
        service: "שיעור יוגה פרטי",
        isApproved: true,
      },
      {
        name: "אלון דגן",
        rating: 5,
        content: "הפילאטיס השיקומי עזר לי מאוד עם כאבי הגב. מקצועי ומדויק.",
        service: "פילאטיס שיקומי",
        isApproved: true,
      },
      {
        name: "רונית שמש",
        rating: 5,
        content: "הפוט מאסז׳ היה חוויה מדהימה. ההשריה במי מלח חמים והעיסוי - מומלץ!",
        service: "פוט מאסז׳",
        isApproved: true,
      },
    ];
    for (const review of reviews) {
      await prisma.review.create({ data: review });
    }
    console.log(`${reviews.length} reviews created`);
  }

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

```

---
