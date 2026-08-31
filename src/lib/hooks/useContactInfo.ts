"use client";

import { useSiteContent } from "@/lib/hooks/useSiteContent";
import { normalizeWhatsAppNumber } from "@/lib/phone";
import {
  CONTACT_PHONE,
  CONTACT_WHATSAPP,
  CONTACT_EMAIL,
  CONTACT_ADDRESS,
} from "@/lib/constants";

/**
 * Contact details managed in /admin/content (section "contact_info").
 * Constants remain the fallback when a key is missing or empty.
 */
export function useContactInfo() {
  const { content } = useSiteContent();
  const c = content["contact_info"] ?? {};

  return {
    phone: c.phone || CONTACT_PHONE,
    // CMS value may be typed as "054-3135182" — wa.me links need bare 972… digits
    whatsapp: normalizeWhatsAppNumber(c.whatsapp || "") || CONTACT_WHATSAPP,
    email: c.email || CONTACT_EMAIL,
    address: c.address || CONTACT_ADDRESS,
  };
}
