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
