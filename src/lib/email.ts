import { Resend } from "resend";

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Halo Yoga <noreply@haloyogamassage.com>";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "hilahalfo1@gmail.com";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
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
    <p style="margin: 4px 0;"><strong>שירות:</strong> ${data.serviceName}</p>
    <p style="margin: 4px 0;"><strong>תאריך:</strong> ${data.date}</p>
    <p style="margin: 4px 0;"><strong>שעה:</strong> ${data.time}</p>
    ${data.isHomeVisit ? '<p style="margin: 4px 0;"><strong>טיפול בבית הלקוח</strong></p>' : ""}
    ${data.notes ? `<p style="margin: 4px 0;"><strong>הערות:</strong> ${data.notes}</p>` : ""}
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
          <p style="margin: 4px 0;"><strong>שם:</strong> ${data.customerName}</p>
          <p style="margin: 4px 0;"><strong>טלפון:</strong> <a href="tel:${data.customerPhone}" dir="ltr">${data.customerPhone}</a></p>
          ${data.customerEmail ? `<p style="margin: 4px 0;"><strong>אימייל:</strong> ${data.customerEmail}</p>` : ""}
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
        <p>שלום ${data.customerName},</p>
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
        <p>שלום ${data.customerName},</p>
        <p>שמחים לעדכן שההזמנה שלך אושרה:</p>
        ${bookingDetailsCard({ serviceName: data.serviceName, date, time, isHomeVisit: data.isHomeVisit })}
        ${data.cancelToken ? `<p style="font-size: 14px; color: #666;">לביטול ההזמנה (עד 24 שעות לפני): <a href="${siteUrl}/cancel/${data.cancelToken}" style="color: #5C7C5A;">לחצו כאן</a></p>` : ""}
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
        <h2 style="color: #5C7C5A;">עדכון לגבי ההזמנה</h2>
        <p>שלום ${data.customerName},</p>
        <p>לצערנו לא ניתן לאשר את ההזמנה הבאה:</p>
        ${bookingDetailsCard({ serviceName: data.serviceName, date, time })}
        <p>ניתן ליצור קשר לתיאום מועד חלופי.</p>
        <p>בברכה,</p>
        <p style="color: #5C7C5A; font-weight: bold;">Halo Yoga & Massage</p>
      `),
    });
    console.log("[EMAIL_REJECTED]", result);
  } catch (error) {
    console.error("[EMAIL_REJECTED]", error);
  }
}
