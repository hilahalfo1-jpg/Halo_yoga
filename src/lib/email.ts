import { Resend } from "resend";
import { CANCELLATION_CUTOFF_HOURS } from "@/lib/constants";

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Halo Yoga <noreply@haloyogamassage.com>";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "hilahalfo1@gmail.com";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

// Escape user-controlled values before interpolating into HTML templates
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Jerusalem",
  }).format(date);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jerusalem",
  }).format(date);
}

interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  startAt: Date;
  cancelToken?: string;
  notes?: string | null;
  isHomeVisit?: boolean;
}

const emailWrapper = (content: string) => `
  <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
    <div style="text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #f0f0eb;">
      <h1 style="color: #5C7C5A; margin: 0; font-size: 24px;">Halo Yoga & Massage</h1>
    </div>
    ${content}
    <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e0e0db; text-align: center;">
      <p style="color: #999; font-size: 12px; margin: 0;">
        Halo Yoga & Massage | haloyogamassage.com
      </p>
    </div>
  </div>
`;

const bookingDetailsCard = (data: {
  serviceName: string;
  date: string;
  time: string;
  notes?: string | null;
  isHomeVisit?: boolean;
}) => `
  <div style="background: #f5f5f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 4px 0;"><strong>שירות:</strong> ${escapeHtml(data.serviceName)}</p>
    <p style="margin: 4px 0;"><strong>תאריך:</strong> ${data.date}</p>
    <p style="margin: 4px 0;"><strong>שעה:</strong> ${data.time}</p>
    ${data.isHomeVisit ? '<p style="margin: 4px 0;"><strong>טיפול בבית הלקוח</strong></p>' : ""}
    ${data.notes ? `<p style="margin: 4px 0;"><strong>הערות:</strong> ${escapeHtml(data.notes)}</p>` : ""}
  </div>
`;

/**
 * Send email to ADMIN when a new booking is created
 */
export async function sendNewBookingAdminEmail(data: BookingEmailData) {
  if (!process.env.RESEND_API_KEY) return;

  const date = formatDate(new Date(data.startAt));
  const time = formatTime(new Date(data.startAt));
  const siteUrl = process.env.NEXTAUTH_URL || "https://haloyogamassage.com";

  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `הזמנה חדשה - ${data.serviceName} | ${data.customerName}`,
      html: emailWrapper(`
        <h2 style="color: #5C7C5A;">הזמנה חדשה התקבלה!</h2>
        <p>הזמנה חדשה ממתינה לאישור:</p>
        ${bookingDetailsCard({ serviceName: data.serviceName, date, time, notes: data.notes, isHomeVisit: data.isHomeVisit })}
        <div style="background: #fff; border: 1px solid #e0e0db; padding: 12px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>שם:</strong> ${escapeHtml(data.customerName)}</p>
          <p style="margin: 4px 0;"><strong>טלפון:</strong> <a href="tel:${escapeHtml(data.customerPhone)}" dir="ltr">${escapeHtml(data.customerPhone)}</a></p>
          ${data.customerEmail ? `<p style="margin: 4px 0;"><strong>אימייל:</strong> ${escapeHtml(data.customerEmail)}</p>` : ""}
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${siteUrl}/admin/bookings" style="display: inline-block; background: #5C7C5A; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            צפייה בהזמנות
          </a>
        </div>
      `),
    });
    console.log("[EMAIL_ADMIN_NEW_BOOKING]", result);
  } catch (error) {
    console.error("[EMAIL_ADMIN_NEW_BOOKING]", error);
  }
}

/**
 * Send confirmation to CUSTOMER that their booking request was received
 */
export async function sendBookingReceivedEmail(data: BookingEmailData) {
  if (!data.customerEmail || !process.env.RESEND_API_KEY) return;

  const date = formatDate(new Date(data.startAt));
  const time = formatTime(new Date(data.startAt));

  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `הבקשה התקבלה - ${data.serviceName}`,
      html: emailWrapper(`
        <h2 style="color: #5C7C5A;">הבקשה שלך התקבלה!</h2>
        <p>שלום ${escapeHtml(data.customerName)},</p>
        <p>הבקשה שלך לקביעת תור התקבלה ומחכה לאישור. נעדכן אותך בהקדם.</p>
        ${bookingDetailsCard({ serviceName: data.serviceName, date, time, notes: data.notes, isHomeVisit: data.isHomeVisit })}
        <p style="color: #666; font-size: 14px;">תקבל/י הודעה נוספת כשההזמנה תאושר.</p>
        <p>בברכה,</p>
        <p style="color: #5C7C5A; font-weight: bold;">Halo Yoga & Massage</p>
      `),
    });
    console.log("[EMAIL_BOOKING_RECEIVED]", result);
  } catch (error) {
    console.error("[EMAIL_BOOKING_RECEIVED]", error);
  }
}

/**
 * Send approval email to CUSTOMER
 */
export async function sendBookingApprovedEmail(data: BookingEmailData) {
  if (!data.customerEmail || !process.env.RESEND_API_KEY) return;

  const date = formatDate(new Date(data.startAt));
  const time = formatTime(new Date(data.startAt));
  const siteUrl = process.env.NEXTAUTH_URL || "https://haloyogamassage.com";

  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `ההזמנה שלך אושרה - ${data.serviceName}`,
      html: emailWrapper(`
        <h2 style="color: #5C7C5A;">ההזמנה שלך אושרה!</h2>
        <p>שלום ${escapeHtml(data.customerName)},</p>
        <p>שמחים לעדכן שההזמנה שלך אושרה:</p>
        ${bookingDetailsCard({ serviceName: data.serviceName, date, time, isHomeVisit: data.isHomeVisit })}
        ${data.cancelToken ? `<p style="font-size: 14px; color: #666;">לביטול ההזמנה (עד ${CANCELLATION_CUTOFF_HOURS} שעות לפני): <a href="${siteUrl}/cancel/${data.cancelToken}" style="color: #5C7C5A;">לחצו כאן</a></p>` : ""}
        <p>נתראה!</p>
        <p style="color: #5C7C5A; font-weight: bold;">Halo Yoga & Massage</p>
      `),
    });
    console.log("[EMAIL_APPROVED]", result);
  } catch (error) {
    console.error("[EMAIL_APPROVED]", error);
  }
}

/**
 * Send rejection/cancellation email to CUSTOMER
 */
export async function sendBookingRejectedEmail(data: BookingEmailData) {
  if (!data.customerEmail || !process.env.RESEND_API_KEY) return;

  const date = formatDate(new Date(data.startAt));
  const time = formatTime(new Date(data.startAt));

  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `עדכון לגבי ההזמנה - ${data.serviceName}`,
      html: emailWrapper(`
        <h2 style="color: #5C7C5A;">עדכון לגבי ההזמנה שלך</h2>
        <p>שלום ${escapeHtml(data.customerName)},</p>
        <p>תודה רבה שפנית אלינו ובחרת ב-Halo Yoga & Massage.</p>
        <p>אנו מתנצלים מקרב לב, אך לצערנו לא נוכל לקיים את הטיפול במועד שנבחר:</p>
        ${bookingDetailsCard({ serviceName: data.serviceName, date, time })}
        <p>חשוב לנו שתדע/י שהפנייה שלך חשובה לנו מאוד, ונשמח לסייע למצוא מועד חלופי שיתאים לך.</p>
        <p>ניתן לקבוע תור חדש באתר או ליצור איתנו קשר ישירות.</p>
        <p style="margin-top: 16px;">מחכים לראותך,</p>
        <p style="color: #5C7C5A; font-weight: bold;">Halo Yoga & Massage</p>
      `),
    });
    console.log("[EMAIL_REJECTED]", result);
  } catch (error) {
    console.error("[EMAIL_REJECTED]", error);
  }
}

/**
 * Notify ADMIN (Hila) when a customer cancels their booking
 */
export async function sendBookingCancelledAdminEmail(data: BookingEmailData) {
  if (!process.env.RESEND_API_KEY) return;

  const date = formatDate(new Date(data.startAt));
  const time = formatTime(new Date(data.startAt));

  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `ביטול תור - ${data.serviceName} | ${data.customerName}`,
      html: emailWrapper(`
        <h2 style="color: #5C7C5A;">לקוח/ה ביטל/ה תור</h2>
        <p>התור הבא בוטל על ידי הלקוח/ה:</p>
        ${bookingDetailsCard({ serviceName: data.serviceName, date, time })}
        <div style="background: #fff; border: 1px solid #e0e0db; padding: 12px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>שם:</strong> ${escapeHtml(data.customerName)}</p>
          <p style="margin: 4px 0;"><strong>טלפון:</strong> <a href="tel:${escapeHtml(data.customerPhone)}" dir="ltr">${escapeHtml(data.customerPhone)}</a></p>
        </div>
        <p style="color: #666; font-size: 14px;">המשבצת התפנתה וזמינה כעת להזמנות חדשות.</p>
      `),
    });
    console.log("[EMAIL_CANCELLED_ADMIN]", result);
  } catch (error) {
    console.error("[EMAIL_CANCELLED_ADMIN]", error);
  }
}

interface GiftOrderEmailData {
  purchaserName: string;
  purchaserPhone: string;
  purchaserEmail?: string | null;
  recipientName: string;
  serviceName: string;
  startAt: Date | null;
}

/**
 * Notify ADMIN (Hila) when a new public gift-card order arrives (PENDING —
 * awaiting approval + offline payment).
 */
export async function sendNewGiftOrderAdminEmail(data: GiftOrderEmailData) {
  if (!process.env.RESEND_API_KEY) return;

  const siteUrl = process.env.NEXTAUTH_URL || "https://haloyogamassage.com";
  const when = data.startAt
    ? `${formatDate(data.startAt)} בשעה ${formatTime(data.startAt)}`
    : "ללא תאריך";

  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `הזמנת גיפט קארד חדשה - ${data.serviceName} | ${data.purchaserName}`,
      html: emailWrapper(`
        <h2 style="color: #5C7C5A;">הזמנת גיפט קארד חדשה! 🎁</h2>
        <p>התקבלה בקשה חדשה לגיפט קארד — ממתינה לאישור ולהסדרת תשלום:</p>
        <div style="background: #f5f5f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>שירות:</strong> ${escapeHtml(data.serviceName)}</p>
          <p style="margin: 4px 0;"><strong>מתנה עבור:</strong> ${escapeHtml(data.recipientName)}</p>
          <p style="margin: 4px 0;"><strong>מועד מבוקש:</strong> ${when}</p>
        </div>
        <div style="background: #fff; border: 1px solid #e0e0db; padding: 12px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>שם הרוכש/ת:</strong> ${escapeHtml(data.purchaserName)}</p>
          <p style="margin: 4px 0;"><strong>טלפון:</strong> <a href="tel:${escapeHtml(data.purchaserPhone)}" dir="ltr">${escapeHtml(data.purchaserPhone)}</a></p>
          ${data.purchaserEmail ? `<p style="margin: 4px 0;"><strong>אימייל:</strong> ${escapeHtml(data.purchaserEmail)}</p>` : ""}
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${siteUrl}/admin/gift-cards" style="display: inline-block; background: #5C7C5A; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            לאישור הגיפט קארד
          </a>
        </div>
      `),
    });
    console.log("[EMAIL_ADMIN_GIFT_ORDER]", result);
  } catch (error) {
    console.error("[EMAIL_ADMIN_GIFT_ORDER]", error);
  }
}

/**
 * Weekly nudge to ADMIN (Hila) when no blog post was published in the last 7 days.
 * Returns true only when the email was actually accepted for delivery.
 */
export async function sendBlogReminderEmail(): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;

  try {
    const result = await getResend().emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: "תזכורת שבועית: זמן לפוסט חדש בבלוג 💡",
      html: emailWrapper(`
        <h2 style="color: #5C7C5A;">זמן לפוסט חדש בבלוג!</h2>
        <p>היי הילה,</p>
        <p>לא פורסם פוסט חדש בבלוג בשבוע האחרון. פוסט חדש מושך לקוחות ומשפר את הדירוג של האתר בגוגל.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://haloyogamassage.com/admin/blog" style="display: inline-block; background: #5C7C5A; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            לכתיבת פוסט חדש
          </a>
        </div>
        <div style="background: #f5f5f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0; font-size: 14px; color: #666;">
            💡 טיפ: אחרי הפרסום שווה לשתף את הפוסט גם בעמוד העסק שלך בגוגל (Google Business) —
            היכנסי ל-business.google.com, לחצי על "הוסף עדכון" (Add update / Post),
            העתיקי את הכותרת והתקציר, הוסיפי תמונה, והדביקי קישור לפוסט המלא באתר. זהו — הפוסט מופיע גם בגוגל.
          </p>
        </div>
      `),
    });
    console.log("[EMAIL_BLOG_REMINDER]", result);
    return !result.error;
  } catch (error) {
    console.error("[EMAIL_BLOG_REMINDER]", error);
    return false;
  }
}
