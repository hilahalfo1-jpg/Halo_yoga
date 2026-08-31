/** Normalize identifier: for phones strip all non-digits, for emails lowercase+trim */
export function normalizeIdentifier(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }
  // Phone: strip all non-digit characters
  return trimmed.replace(/\D/g, "");
}

/**
 * Contact key shared by the derived contacts list (bookings + attempts) and
 * the Contact overlay table: normalized phone digits, else lowercased email.
 */
export function contactKey(phone: string, email?: string | null): string {
  return normalizeIdentifier(phone) || (email || "").toLowerCase();
}

/**
 * Normalize a WhatsApp number to wa.me digits: non-digits stripped, leading 0
 * dropped, 972 prefix added unless already present. Empty input stays empty.
 */
export function normalizeWhatsAppNumber(value: string): string {
  let digits = value.replace(/\D/g, "").replace(/^0/, "");
  if (!digits) return "";
  if (!digits.startsWith("972")) digits = `972${digits}`;
  return digits;
}

/**
 * wa.me link for an Israeli phone: digits only, leading 0 stripped,
 * 972 prefix added unless the number already starts with 972.
 */
export function waMeLink(phone: string): string {
  return `https://wa.me/${normalizeWhatsAppNumber(phone)}`;
}
