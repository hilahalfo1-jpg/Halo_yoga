import { Resend } from "resend";

const FROM_EMAIL = "Halo Yoga <onboarding@resend.dev>";

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
