import { z } from "zod";

// Israeli phone: 05X-XXXXXXX or 05XXXXXXXX
const phoneRegex = /^05\d[-]?\d{7}$/;

// Shared customer-details fields (booking wizard details step + booking APIs)
export const customerDetailsSchema = z.object({
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
});

export const bookingSchema = customerDetailsSchema.extend({
  serviceId: z.string().min(1, "יש לבחור שירות"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "פורמט שעה לא תקין"),
  isHomeVisit: z.boolean().optional(),
  customerPhotoUrl: z.string().url().optional().or(z.literal("")).nullable(),
});

// Admin-created booking (Hila books on behalf of a returning customer by phone)
export const adminBookingSchema = customerDetailsSchema.extend({
  serviceId: z.string().min(1, "יש לבחור שירות"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין")
    .refine((v) => !isNaN(new Date(v + "T00:00:00Z").getTime()), "תאריך לא תקין"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "פורמט שעה לא תקין"),
});

// Public gift-card order (booking wizard gift mode → POST /api/gift-cards).
// Base object kept unrefined so the client details form can .pick() from it.
const giftCardOrderBaseSchema = z.object({
  serviceId: z.string().min(10, "שירות לא תקין"),
  purchaserName: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  purchaserPhone: z
    .string()
    .regex(phoneRegex, "מספר טלפון לא תקין (05X-XXXXXXX)"),
  purchaserEmail: z
    .string()
    .email("כתובת אימייל לא תקינה")
    .optional()
    .or(z.literal(""))
    .nullable(),
  recipientName: z
    .string()
    .min(2, "שם מקבל/ת המתנה קצר מדי")
    .max(80, "שם מקבל/ת המתנה ארוך מדי"),
  message: z.string().max(500, "ההודעה ארוכה מדי").optional().or(z.literal("")),
  template: z.enum(["botanical", "minimal", "festive", "gold", "romantic"], {
    message: "עיצוב לא תקין",
  }),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין")
    .optional(),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "פורמט שעה לא תקין")
    .optional(),
});

// date/startTime are optional together: both present (buyer picked a slot)
// or both absent (recipient will book themselves).
export const giftCardOrderSchema = giftCardOrderBaseSchema.refine(
  (d) => (d.date === undefined) === (d.startTime === undefined),
  { message: "יש לבחור תאריך ושעה יחד", path: ["startTime"] }
);

// Client-side form schema for the wizard's gift-details step
export const giftDetailsFormSchema = giftCardOrderBaseSchema.pick({
  purchaserName: true,
  purchaserPhone: true,
  purchaserEmail: true,
  recipientName: true,
  message: true,
});

// Admin gift-card PATCH — redeemed toggle and/or approval (PENDING → ACTIVE);
// waMark stamps a manual WhatsApp send (handled before any status logic)
export const giftCardPatchSchema = z.object({
  isRedeemed: z.boolean().optional(),
  status: z.literal("ACTIVE", { message: "סטטוס לא תקין" }).optional(),
  waMark: z.literal("giftApproved").optional(),
});

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

// Admin contacts overlay (Contact table) — NOT the public contact form above.
// POST /api/admin/contacts creates a Contact row; PATCH edits one by id.
export const adminContactSchema = z.object({
  name: z.string().min(2, "שם חייב להכיל לפחות 2 תווים"),
  phone: z
    .string()
    .regex(phoneRegex, "מספר טלפון לא תקין (05X-XXXXXXX)"),
  email: z
    .string()
    .email("כתובת אימייל לא תקינה")
    .optional()
    .or(z.literal("")),
  notes: z.string().max(500, "ההערה ארוכה מדי").optional().or(z.literal("")),
});

// Lenient variant used ONLY by POST /api/admin/contacts when the submitted key
// already has derived booking/attempt history: legacy/foreign phones and
// email-only keys must stay hide/editable (the route enforces the history check
// and a non-empty contact key). Brand-new manual contacts keep the strict schema.
export const adminContactLenientSchema = adminContactSchema.extend({
  phone: z.string().max(30, "מספר טלפון ארוך מדי"),
});

export const adminContactPatchSchema = adminContactSchema.partial().extend({
  id: z.string().min(1, "חסר מזהה"),
});

// Lenient PATCH variant — same rule as adminContactLenientSchema: used ONLY by
// PATCH /api/admin/contacts when the resulting key stays the patched row's own
// key or has derived history (the route enforces both checks).
export const adminContactLenientPatchSchema = adminContactLenientSchema
  .partial()
  .extend({
    id: z.string().min(1, "חסר מזהה"),
  });

// Public medical (health declaration) form — see src/app/api/medical-form/route.ts
export const medicalFormSchema = z.object({
  bookingId: z.string().min(10, "מזהה הזמנה לא תקין").max(40, "מזהה הזמנה לא תקין"),
  idNumber: z.preprocess(
    (v) => {
      if (typeof v !== "string") return v;
      const s = v.replace(/[\s-]/g, "");
      return s === "" ? null : s;
    },
    z
      .string()
      .regex(/^\d{5,10}$/, "מספר תעודת זהות לא תקין")
      .nullable()
      .optional()
  ),
  conditions: z
    .array(z.string().max(300, "פירוט המצב הרפואי ארוך מדי"))
    .max(30, "יותר מדי פריטים")
    .optional(),
  conditionDetails: z.string().max(1000, "הפירוט ארוך מדי").nullable().optional(),
  signatureData: z
    .string()
    .regex(/^data:image\/(png|jpeg);base64,/, "פורמט חתימה לא תקין")
    .nullable()
    .optional(),
  medicalDocUrl: z
    .string()
    .refine((u) => {
      try {
        const parsed = new URL(u);
        return (
          parsed.protocol === "https:" &&
          parsed.hostname.endsWith(".public.blob.vercel-storage.com")
        );
      } catch {
        return false;
      }
    }, "כתובת מסמך לא תקינה")
    .nullable()
    .optional(),
  termsVersion: z.string().max(20).optional(),
});

// Admin blog POST — slug and publishedAt stay server-derived
export const blogPostSchema = z.object({
  title: z.string().min(1, "כותרת חסרה").max(200, "כותרת ארוכה מדי"),
  content: z.string().max(50000, "התוכן ארוך מדי"),
  excerpt: z.string().max(500, "התקציר ארוך מדי"),
  category: z.string().max(40, "קטגוריה לא תקינה").optional(),
  coverImage: z
    .string()
    .max(500, "כתובת תמונה ארוכה מדי")
    .nullable()
    .optional(),
  isPublished: z.boolean().optional(),
});

// Admin blog PATCH allow-list — slug and publishedAt stay server-derived
export const blogPatchSchema = z
  .object({
    title: z.string().min(1, "כותרת חסרה").max(200, "כותרת ארוכה מדי"),
    content: z.string().max(50000, "התוכן ארוך מדי"),
    excerpt: z.string().max(500, "התקציר ארוך מדי"),
    category: z.string().max(40, "קטגוריה לא תקינה"),
    coverImage: z.string().max(500, "כתובת תמונה ארוכה מדי").nullable(),
    isPublished: z.boolean(),
  })
  .partial();

// Admin site-content POST
// Section keys include camelCase (e.g. "howItWorks"), so uppercase is allowed
export const siteContentSchema = z.object({
  section: z.string().regex(/^[a-zA-Z0-9_]{1,50}$/, "מזהה סקציה לא תקין"),
  key: z.string().regex(/^[a-zA-Z0-9_]{1,80}$/, "מזהה שדה לא תקין"),
  value: z.string().max(10000, "הטקסט ארוך מדי"),
  sortOrder: z.number().int().optional(),
});

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
