// Prefilled WhatsApp message texts for the admin's manual wa.me buttons.
// Client-safe: no prisma or server-only imports.

export type WaMessageKind =
  | "received"
  | "approved"
  | "rejected"
  | "review"
  | "reminder"
  | "giftApproved";

export interface WaTextParams {
  firstName: string;
  serviceName?: string;
  dateTimeStr?: string;
  cancelUrl?: string;
  reviewLink?: string;
  cardUrl?: string;
}

/**
 * Maps-search link used as the review target until Hila pastes a real
 * Google Business Profile review link in /admin/content (settings/google_review_link).
 */
export const MAPS_REVIEW_FALLBACK =
  "https://www.google.com/maps/search/?api=1&query=Halo+Yoga+Massage+הילה+חלפון";

function greeting(firstName: string): string {
  return firstName ? `היי ${firstName}` : "היי";
}

/** " לעיסוי שוודי ב-31/08/2026 בשעה 10:00" — omits whatever is missing. */
function serviceAndTime(p: WaTextParams): string {
  const parts: string[] = [];
  if (p.serviceName) parts.push(`ל${p.serviceName}`);
  if (p.dateTimeStr) parts.push(`ב-${p.dateTimeStr}`);
  return parts.length ? ` ${parts.join(" ")}` : "";
}

/**
 * Warm Hebrew WhatsApp text per lifecycle kind, mirroring the voice of the
 * customer emails in src/lib/email.ts. Missing optional params degrade
 * gracefully (their segment is simply omitted).
 */
export function waText(kind: WaMessageKind, params: WaTextParams): string {
  const hi = greeting(params.firstName);

  switch (kind) {
    case "received":
      return (
        `${hi} 🙏\n` +
        `הבקשה שלך לתור${serviceAndTime(params)} התקבלה וממתינה לאישור. נעדכן אותך בהקדם!\n` +
        `Halo Yoga & Massage`
      );

    case "approved":
      return (
        `${hi}, חדשות טובות — התור שלך אושר! 🌿\n` +
        (params.serviceName || params.dateTimeStr
          ? `${[params.serviceName, params.dateTimeStr].filter(Boolean).join(" | ")}\n`
          : "") +
        (params.cancelUrl ? `לביטול או שינוי: ${params.cancelUrl}\n` : "") +
        `נתראה!\n` +
        `Halo Yoga & Massage`
      );

    case "rejected":
      return (
        `${hi}, תודה שפנית ל-Halo Yoga & Massage 🙏\n` +
        `מתנצלים מקרב לב — לצערנו לא נוכל לקיים את התור${serviceAndTime(params)}.\n` +
        `נשמח למצוא יחד מועד חלופי שיתאים לך: אפשר לקבוע תור חדש באתר או פשוט להשיב להודעה הזו.\n` +
        `מחכים לראותך!`
      );

    case "review":
      return (
        `${hi}, תודה שהגעת ${params.serviceName ? `ל${params.serviceName}` : "לטיפול"}! 🌸\n` +
        `נשמח מאוד אם תקדיש/י דקה לשתף חוויה בביקורת בגוגל — זה עוזר לעסק קטן יותר מכל דבר אחר 💚\n` +
        (params.reviewLink ? `${params.reviewLink}\n` : "") +
        `תודה ענקית,\n` +
        `Halo Yoga & Massage`
      );

    case "reminder":
      return (
        `${hi}, תזכורת קטנה 🔔\n` +
        `מחר יש לך תור${serviceAndTime(params)}.\n` +
        (params.cancelUrl ? `אם צריך לשנות או לבטל: ${params.cancelUrl}\n` : "") +
        `מחכים לך!\n` +
        `Halo Yoga & Massage`
      );

    case "giftApproved":
      return (
        `${hi}, הגיפט קארד שלך מוכן! 🎁\n` +
        (params.cardUrl ? `אפשר לצפות בו ולשלוח אותו כאן:\n${params.cardUrl}\n` : "") +
        `תודה שבחרת ב-Halo Yoga & Massage 💚`
      );
  }
}
