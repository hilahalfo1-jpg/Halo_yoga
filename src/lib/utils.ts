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
