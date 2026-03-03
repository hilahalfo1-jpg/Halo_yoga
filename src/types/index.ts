// ─── Enums (mirroring Prisma, usable on client) ─────
export type Category = "MASSAGE" | "YOGA" | "REHABILITATION";
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
