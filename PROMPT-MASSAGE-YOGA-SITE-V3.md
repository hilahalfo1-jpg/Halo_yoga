# 🧘 Full Production Website — Medical Massage Therapist & Yoga Instructor (Israel)

> **Role:** You are a Senior Full-Stack Developer and Tech Lead. Build a complete, production-ready website.
> **Language:** ALL user-facing text in Hebrew. Code comments in English. This prompt in English for clarity.
> **Approach:** Work step-by-step. After each step, show the file tree diff and ask before proceeding.

---

## 1 · TECH STACK (mandatory)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14+ App Router | `create-next-app --ts --tailwind --app --src-dir` |
| Language | TypeScript (strict mode) | No `any` — use proper types everywhere |
| Styling | Tailwind CSS 3.4+ | RTL plugin (`tailwindcss-rtl` or logical properties) |
| Database | PostgreSQL 16 via Docker | Fallback: SQLite for zero-config dev |
| ORM | Prisma 5+ | Typed client, migrations, seed script |
| Auth | NextAuth 4 (Credentials) | Single admin user; bcryptjs for hashing |
| Validation | Zod | Shared schemas for client + server |
| Dates | date-fns v3 + `date-fns/locale/he` | Hebrew day names, date formatting |
| Animations | Framer Motion 11+ | Subtle only — fade, slide, scale. No bounce/spring |
| Icons | lucide-react | Consistent 24px stroke-width=1.5 |
| Toasts | sonner | Hebrew messages, RTL position (top-right = top-left in RTL) |
| Forms | React Hook Form + @hookform/resolvers/zod | All forms validated client+server |
| File Upload | multer or Next.js built-in formData | For admin image uploads |
| Image Optimization | Next.js `<Image>` + sharp | Auto-resize uploaded images |
| Email (optional) | Resend or Nodemailer | Booking confirmation + admin notification |

---

## 2 · PROJECT STRUCTURE

```
/
├── .env.example                 # Copy to .env.local — document every var
├── docker-compose.yml           # PostgreSQL + optional Adminer
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                  # Realistic Hebrew seed data + media zones + settings
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root: Heebo font, RTL, metadata
│   │   ├── page.tsx             # Homepage (landing)
│   │   ├── about/page.tsx
│   │   ├── services/page.tsx
│   │   ├── services/[slug]/page.tsx   # Individual service detail
│   │   ├── booking/page.tsx
│   │   ├── reviews/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── cancel/[token]/page.tsx    # Booking cancellation via secure link
│   │   ├── admin/
│   │   │   ├── layout.tsx       # Admin shell: sidebar + topbar
│   │   │   ├── page.tsx         # Dashboard
│   │   │   ├── services/page.tsx
│   │   │   ├── availability/page.tsx
│   │   │   ├── bookings/page.tsx
│   │   │   ├── leads/page.tsx
│   │   │   ├── reviews/page.tsx
│   │   │   ├── media/page.tsx         # 🖼 SITE IMAGES & LOGO CMS
│   │   │   └── settings/page.tsx      # ⚙ SITE-WIDE SETTINGS (texts, phone, etc.)
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── bookings/route.ts
│   │   │   ├── bookings/[id]/route.ts
│   │   │   ├── bookings/cancel/route.ts
│   │   │   ├── contact/route.ts
│   │   │   ├── reviews/route.ts
│   │   │   ├── media/[zone]/route.ts        # PUBLIC: GET image by zone key
│   │   │   ├── settings/public/route.ts     # PUBLIC: GET site settings
│   │   │   └── admin/
│   │   │       ├── services/route.ts
│   │   │       ├── services/[id]/route.ts
│   │   │       ├── availability/route.ts
│   │   │       ├── availability/[id]/route.ts
│   │   │       ├── bookings/route.ts
│   │   │       ├── bookings/[id]/route.ts
│   │   │       ├── leads/route.ts
│   │   │       ├── leads/[id]/route.ts
│   │   │       ├── reviews/[id]/route.ts
│   │   │       ├── media/route.ts           # GET all zones, POST new zone
│   │   │       ├── media/[id]/route.ts      # PATCH update, DELETE
│   │   │       ├── media/upload/route.ts    # POST file upload → returns URL
│   │   │       ├── settings/route.ts        # GET all / PATCH update
│   │   │       └── dashboard/route.ts
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx       # Uses DynamicImage for logo
│   │   │   ├── Footer.tsx       # Uses DynamicImage for footer logo
│   │   │   ├── MobileMenu.tsx
│   │   │   └── AdminSidebar.tsx # Includes 🖼 and ⚙ nav items
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Textarea.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── Section.tsx
│   │   │   ├── Container.tsx
│   │   │   ├── StarRating.tsx
│   │   │   ├── Accordion.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── DynamicImage.tsx     # 🔑 KEY COMPONENT — fetches image from DB by zone
│   │   │   ├── ImageUploader.tsx    # Drag & drop / click upload with preview
│   │   │   └── FileDropZone.tsx     # Reusable drag-and-drop area
│   │   ├── home/
│   │   │   ├── HeroSection.tsx      # Uses DynamicImage zone="hero_bg"
│   │   │   ├── ServicesGrid.tsx
│   │   │   ├── HowItWorks.tsx
│   │   │   ├── AboutPreview.tsx     # Uses DynamicImage zone="home_about_photo"
│   │   │   ├── ReviewsCarousel.tsx
│   │   │   ├── FAQ.tsx
│   │   │   └── QuickContact.tsx
│   │   ├── booking/
│   │   │   ├── BookingWizard.tsx
│   │   │   ├── StepServiceSelect.tsx
│   │   │   ├── StepDateSelect.tsx
│   │   │   ├── StepTimeSelect.tsx
│   │   │   ├── StepDetailsForm.tsx
│   │   │   └── StepConfirmation.tsx
│   │   └── admin/
│   │       ├── StatsCard.tsx
│   │       ├── DataTable.tsx
│   │       ├── StatusBadge.tsx
│   │       ├── AvailabilityEditor.tsx
│   │       ├── BookingDetail.tsx
│   │       ├── MediaManager.tsx         # Full media zone management UI
│   │       ├── MediaZoneCard.tsx        # Single zone: preview + upload + edit
│   │       └── SiteSettingsForm.tsx     # Edit all site texts/config
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── validations.ts
│   │   ├── slots.ts
│   │   ├── upload.ts            # File upload utility: validate, resize, save
│   │   ├── media.ts             # getMediaByZone(), getAllMedia(), ZONE_REGISTRY
│   │   ├── settings.ts          # getSetting(), getAllSettings()
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   └── hooks/
│   │       ├── useMediaQuery.ts
│   │       ├── useScrollDirection.ts
│   │       └── useSiteMedia.ts  # Hook: fetch image URL by zone key
│   ├── types/
│   │   └── index.ts
│   └── styles/
│       └── globals.css
└── public/
    ├── images/                  # Default fallback images (shipped with code)
    ├── uploads/                 # Admin-uploaded images (gitignored, persisted on server)
    └── favicon.ico
```

---

## 3 · DATABASE SCHEMA

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── AUTH ────────────────────────────────
model User {
  id             String   @id @default(cuid())
  email          String   @unique
  hashedPassword String
  name           String
  role           String   @default("ADMIN")
  createdAt      DateTime @default(now())
}

// ─── SERVICES ────────────────────────────
model Service {
  id          String    @id @default(cuid())
  slug        String    @unique
  name        String
  shortDesc   String
  description String    @db.Text
  category    Category
  duration    Int
  price       Int
  image       String?            // Can point to a SiteMedia zone OR direct URL
  sortOrder   Int       @default(0)
  isActive    Boolean   @default(true)
  bookings    Booking[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

enum Category {
  MASSAGE
  YOGA
  REHABILITATION
}

// ─── AVAILABILITY ────────────────────────
model AvailabilityRule {
  id        String   @id @default(cuid())
  dayOfWeek Int
  startTime String
  endTime   String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model AvailabilityException {
  id        String        @id @default(cuid())
  date      DateTime      @db.Date
  type      ExceptionType
  startTime String?
  endTime   String?
  reason    String?
  createdAt DateTime      @default(now())
}

enum ExceptionType {
  BLOCKED
  OVERRIDE
}

// ─── BOOKINGS ────────────────────────────
model Booking {
  id            String        @id @default(cuid())
  service       Service       @relation(fields: [serviceId], references: [id])
  serviceId     String
  startAt       DateTime
  endAt         DateTime
  status        BookingStatus @default(PENDING)
  customerName  String
  customerPhone String
  customerEmail String?
  notes         String?
  adminNotes    String?
  cancelToken   String        @unique @default(cuid())
  cancelledAt   DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@unique([startAt, endAt])
  @@index([status])
  @@index([startAt])
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
  NO_SHOW
}

// ─── LEADS ───────────────────────────────
model Lead {
  id        String     @id @default(cuid())
  name      String
  phone     String
  email     String?
  subject   String?
  message   String     @db.Text
  status    LeadStatus @default(NEW)
  adminNote String?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

enum LeadStatus {
  NEW
  IN_PROGRESS
  CLOSED
}

// ─── REVIEWS ─────────────────────────────
model Review {
  id         String   @id @default(cuid())
  name       String
  rating     Int
  content    String   @db.Text
  service    String?
  isApproved Boolean  @default(false)
  createdAt  DateTime @default(now())
}

// ═══════════════════════════════════════════
// 🖼 SITE MEDIA — FULL CMS IMAGE MANAGEMENT
// ═══════════════════════════════════════════
// Every single image on the public site is driven by this table.
// The admin uploads/replaces images per "zone" — NO CODE CHANGES NEEDED.
//
// How it works:
// 1. Each zone has a unique key (e.g., "hero_bg", "logo", "about_main_photo")
// 2. Public components use <DynamicImage zone="hero_bg" /> which queries this table
// 3. Admin sees a visual grid of all zones, grouped by section
// 4. Admin clicks a zone → uploads new image → old image is replaced
// 5. Fallback: if no image exists for a zone, show default from /public/images/

model SiteMedia {
  id          String   @id @default(cuid())
  zone        String   @unique       // Unique key — see ZONE REGISTRY below
  label       String                 // Hebrew display name for admin: "תמונת רקע ראשית"
  description String?                // Admin helper: "מומלץ 1920x1080, JPG/PNG, עד 5MB"
  imageUrl    String                 // "/uploads/hero-bg-1709912345.jpg" or external URL
  altText     String   @default("")  // Hebrew alt text for accessibility
  section     MediaSection           // Grouping for admin UI
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum MediaSection {
  GLOBAL       // Logo, favicon, OG image
  HOMEPAGE     // Hero, about preview, CTA background
  ABOUT        // Main photo, gallery, certifications
  SERVICES     // Per-service images, category headers
  BOOKING      // Booking page header/background
  CONTACT      // Contact page image, map placeholder
  REVIEWS      // Reviews page header
}

// ═══════════════════════════════════════════
// ⚙ SITE SETTINGS — ALL EDITABLE TEXT/CONFIG
// ═══════════════════════════════════════════
// Every piece of site text, contact info, and configuration
// is stored here and editable from admin — NO CODE CHANGES NEEDED.

model SiteSettings {
  id    String @id @default(cuid())
  key   String @unique       // "site_name", "phone", "hero_title", etc.
  value String @db.Text      // The actual content
  label String               // Hebrew label for admin: "שם האתר"
  group String               // Grouping: "general", "contact", "homepage", "seo"
  type  SettingType @default(TEXT)
  sortOrder Int @default(0)
}

enum SettingType {
  TEXT           // Single line text
  TEXTAREA       // Multi-line text
  URL            // URL validation
  PHONE          // Phone format
  EMAIL          // Email format
  NUMBER         // Numeric value
  BOOLEAN        // Toggle on/off
}
```

---

## 4 · 🖼 MEDIA ZONE REGISTRY (CRITICAL)

This is the complete list of image zones the system must support.
Each zone is seeded into the database with a default placeholder image.
The admin can replace any image at any time without touching code.

```typescript
// src/lib/media.ts

export const ZONE_REGISTRY = {
  // ─── GLOBAL ────────────────────────────
  logo_main:          { label: "לוגו ראשי",           section: "GLOBAL",   desc: "מומלץ: PNG שקוף, 200x60px" },
  logo_white:         { label: "לוגו לבן (לפוטר)",     section: "GLOBAL",   desc: "גרסה לבנה/בהירה של הלוגו" },
  logo_icon:          { label: "אייקון לוגו",          section: "GLOBAL",   desc: "גרסה מרובעת ללוגו, 512x512px" },
  favicon:            { label: "Favicon",              section: "GLOBAL",   desc: "32x32px, PNG או ICO" },
  og_default:         { label: "תמונת שיתוף (OG)",     section: "GLOBAL",   desc: "1200x630px — מוצגת בשיתוף בפייסבוק/ווטסאפ" },

  // ─── HOMEPAGE ──────────────────────────
  hero_bg:            { label: "רקע Hero ראשי",         section: "HOMEPAGE", desc: "1920x1080 מינימום, JPG, תמונה רגועה/טבע" },
  hero_bg_mobile:     { label: "רקע Hero מובייל",       section: "HOMEPAGE", desc: "768x1024, גרסה מותאמת למובייל" },
  home_about_photo:   { label: "תמונת 'קצת עליי'",     section: "HOMEPAGE", desc: "תמונת פרופיל, מומלץ 600x600 מרובעת" },
  home_cta_bg:        { label: "רקע אזור CTA",         section: "HOMEPAGE", desc: "1920x600, תמונה עם אווירה" },
  home_how_it_works:  { label: "תמונת 'איך זה עובד'",  section: "HOMEPAGE", desc: "אופציונלי, 800x500" },

  // ─── ABOUT PAGE ────────────────────────
  about_hero:         { label: "תמונת Hero עמוד אודות", section: "ABOUT",    desc: "1920x600, רקע עליון" },
  about_main_photo:   { label: "תמונה ראשית - אודות",   section: "ABOUT",    desc: "תמונת פרופיל מקצועית, 800x1000" },
  about_gallery_1:    { label: "גלריה אודות #1",        section: "ABOUT",    desc: "תמונת סטודיו/טיפול 1" },
  about_gallery_2:    { label: "גלריה אודות #2",        section: "ABOUT",    desc: "תמונת סטודיו/טיפול 2" },
  about_gallery_3:    { label: "גלריה אודות #3",        section: "ABOUT",    desc: "תמונת סטודיו/טיפול 3" },
  about_cert_bg:      { label: "רקע אזור הסמכות",       section: "ABOUT",    desc: "רקע עדין, 1920x400" },

  // ─── SERVICES ──────────────────────────
  services_hero:      { label: "רקע עמוד שירותים",      section: "SERVICES", desc: "1920x400" },
  service_massage:    { label: "תמונה - עיסויים",       section: "SERVICES", desc: "600x400, תמונת קטגוריה" },
  service_yoga:       { label: "תמונה - יוגה",          section: "SERVICES", desc: "600x400, תמונת קטגוריה" },
  service_rehab:      { label: "תמונה - שיקום",         section: "SERVICES", desc: "600x400, תמונת קטגוריה" },
  // Individual service images are managed via Service.image field (also uploadable from admin)

  // ─── BOOKING ───────────────────────────
  booking_hero:       { label: "רקע עמוד הזמנות",       section: "BOOKING",  desc: "1920x400, אווירה רגועה" },

  // ─── CONTACT ───────────────────────────
  contact_hero:       { label: "רקע עמוד יצירת קשר",    section: "CONTACT",  desc: "1920x400" },
  contact_map:        { label: "תמונת מפה/מיקום",       section: "CONTACT",  desc: "אופציונלי, 800x400" },

  // ─── REVIEWS ───────────────────────────
  reviews_hero:       { label: "רקע עמוד המלצות",       section: "REVIEWS",  desc: "1920x400" },
} as const;

export type MediaZone = keyof typeof ZONE_REGISTRY;
```

---

## 5 · ⚙ SITE SETTINGS REGISTRY

All editable site content. Seeded with defaults — admin changes them without code:

```typescript
// src/lib/settings.ts

export const SETTINGS_REGISTRY = {
  // ─── GENERAL ───────────────────────────
  site_name:          { label: "שם האתר",              group: "general",  type: "TEXT",     default: "ישראל כהן - עיסוי רפואי ויוגה" },
  site_tagline:       { label: "סלוגן",                group: "general",  type: "TEXT",     default: "ריפוי הגוף, שקט הנפש" },
  therapist_name:     { label: "שם המטפל/ת",           group: "general",  type: "TEXT",     default: "ישראל כהן" },
  therapist_title:    { label: "תואר מקצועי",           group: "general",  type: "TEXT",     default: "מעסה רפואי מוסמך ומורה ליוגה" },

  // ─── CONTACT INFO ──────────────────────
  phone:              { label: "טלפון",                 group: "contact",  type: "PHONE",    default: "054-1234567" },
  whatsapp:           { label: "ווטסאפ",                group: "contact",  type: "PHONE",    default: "054-1234567" },
  email:              { label: "אימייל",                group: "contact",  type: "EMAIL",    default: "info@healing.co.il" },
  address:            { label: "כתובת",                 group: "contact",  type: "TEXT",     default: "רחוב הרצל 15, תל אביב" },
  google_maps_url:    { label: "קישור גוגל מפות",       group: "contact",  type: "URL",      default: "" },
  instagram_url:      { label: "אינסטגרם",              group: "contact",  type: "URL",      default: "" },
  facebook_url:       { label: "פייסבוק",               group: "contact",  type: "URL",      default: "" },

  // ─── WORKING HOURS DISPLAY ─────────────
  hours_sunday:       { label: "שעות - יום ראשון",      group: "hours",    type: "TEXT",     default: "09:00 - 18:00" },
  hours_monday:       { label: "שעות - יום שני",        group: "hours",    type: "TEXT",     default: "09:00 - 18:00" },
  hours_tuesday:      { label: "שעות - יום שלישי",      group: "hours",    type: "TEXT",     default: "09:00 - 18:00" },
  hours_wednesday:    { label: "שעות - יום רביעי",      group: "hours",    type: "TEXT",     default: "09:00 - 18:00" },
  hours_thursday:     { label: "שעות - יום חמישי",      group: "hours",    type: "TEXT",     default: "09:00 - 18:00" },
  hours_friday:       { label: "שעות - יום שישי",       group: "hours",    type: "TEXT",     default: "סגור" },
  hours_saturday:     { label: "שעות - שבת",            group: "hours",    type: "TEXT",     default: "סגור" },

  // ─── HOMEPAGE TEXTS ────────────────────
  hero_title:         { label: "כותרת Hero",            group: "homepage", type: "TEXT",     default: "ריפוי הגוף, שקט הנפש" },
  hero_subtitle:      { label: "תת-כותרת Hero",         group: "homepage", type: "TEXTAREA", default: "עיסוי רפואי מקצועי ושיעורי יוגה בסביבה נעימה ומרגיעה. חוויה טיפולית שמשלבת מגע מרפא עם תנועה מודעת." },
  hero_cta_primary:   { label: "כפתור CTA ראשי",       group: "homepage", type: "TEXT",     default: "קביעת תור" },
  hero_cta_secondary: { label: "כפתור CTA משני",        group: "homepage", type: "TEXT",     default: "שיחת ייעוץ" },
  about_preview_text: { label: "טקסט 'קצת עליי' בדף הבית", group: "homepage", type: "TEXTAREA", default: "" },
  cta_section_title:  { label: "כותרת אזור CTA",       group: "homepage", type: "TEXT",     default: "מוכנים להתחיל?" },
  cta_section_text:   { label: "טקסט אזור CTA",        group: "homepage", type: "TEXTAREA", default: "צרו קשר עוד היום ותתחילו את המסע לגוף בריא ונפש רגועה" },

  // ─── ABOUT PAGE ────────────────────────
  about_full_bio:     { label: "ביוגרפיה מלאה",         group: "about",    type: "TEXTAREA", default: "" },
  about_philosophy:   { label: "הפילוסופיה שלי",        group: "about",    type: "TEXTAREA", default: "" },
  about_certifications:{ label: "הסמכות (אחת בכל שורה)", group: "about",    type: "TEXTAREA", default: "מעסה רפואי מוסמך\nמורה ליוגה (200 שעות)\nרפלקסולוג מוסמך" },

  // ─── SEO ───────────────────────────────
  seo_home_title:     { label: "SEO - כותרת דף הבית",   group: "seo",      type: "TEXT",     default: "" },
  seo_home_desc:      { label: "SEO - תיאור דף הבית",   group: "seo",      type: "TEXTAREA", default: "" },
  seo_about_title:    { label: "SEO - כותרת אודות",     group: "seo",      type: "TEXT",     default: "" },
  seo_about_desc:     { label: "SEO - תיאור אודות",     group: "seo",      type: "TEXTAREA", default: "" },

  // ─── BOOKING PAGE ─────────────────────
  booking_intro_text: { label: "טקסט פתיחה בעמוד הזמנות", group: "booking", type: "TEXTAREA", default: "בחרו שירות, תאריך ושעה שנוחים לכם" },

  // ─── FOOTER ────────────────────────────
  footer_text:        { label: "טקסט פוטר",             group: "footer",   type: "TEXT",     default: "© 2024 כל הזכויות שמורות" },
  footer_disclaimer:  { label: "הצהרת פטור",            group: "footer",   type: "TEXTAREA", default: "" },
} as const;
```

---

## 6 · DynamicImage COMPONENT (KEY ARCHITECTURE)

This is the core component that makes all public images admin-controlled:

```typescript
// src/components/ui/DynamicImage.tsx
//
// USAGE IN ANY COMPONENT:
//   <DynamicImage zone="hero_bg" className="w-full h-screen object-cover" />
//   <DynamicImage zone="logo_main" width={200} height={60} />
//   <DynamicImage zone="about_main_photo" fallback="/images/default-profile.jpg" />
//
// HOW IT WORKS:
// 1. Server component (or fetches on server side)
// 2. Queries SiteMedia table by zone key
// 3. Returns Next.js <Image> with the imageUrl from DB
// 4. If zone not found or isActive=false → shows fallback image
// 5. Uses altText from DB for accessibility
// 6. Supports all Next.js Image props (fill, sizes, priority, etc.)

interface DynamicImageProps {
  zone: string;           // Media zone key from ZONE_REGISTRY
  fallback?: string;      // Default image if zone has no image
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
}

// Implementation: async server component that queries prisma
// Falls back to /images/defaults/{zone}.jpg if no DB entry
```

**SiteSetting helper:**
```typescript
// src/lib/settings.ts
//
// USAGE:
//   const siteName = await getSetting("site_name");
//   const phone = await getSetting("phone");
//   const allSettings = await getSettingsByGroup("homepage");
//
// Used in Server Components to pull admin-editable text:
//   <h1>{await getSetting("hero_title")}</h1>
//   <p>{await getSetting("hero_subtitle")}</p>
//   <a href={`tel:${await getSetting("phone")}`}>
```

---

## 7 · ADMIN MEDIA MANAGEMENT PAGE (/admin/media)

This is the admin interface for managing all site images:

### Layout
- Page title: "ניהול תמונות האתר"
- Subtitle: "כאן תוכלו להחליף כל תמונה באתר ללא צורך בקוד"
- Section tabs/filters: "הכל" | "כללי" | "דף הבית" | "אודות" | "שירותים" | "הזמנות" | "צור קשר" | "המלצות"

### Zone Cards Grid
Each media zone displayed as a visual card:
```
┌─────────────────────────────────────┐
│  [Current Image Preview - 300x200]  │
│                                     │
│  📌 לוגו ראשי                       │
│  zone: logo_main                    │
│  מומלץ: PNG שקוף, 200x60px         │
│                                     │
│  Alt text: [________________]       │
│                                     │
│  [📤 העלאת תמונה חדשה]  [🗑 מחק]    │
│                                     │
│  עודכן: 15/03/2024, 14:30          │
└─────────────────────────────────────┘
```

### Upload Flow
1. Admin clicks "העלאת תמונה חדשה" on any zone card
2. Modal opens with drag-and-drop area + file picker
3. Preview of selected image shown before upload
4. Client-side validation: file type (JPG/PNG/WebP/SVG), max size (5MB)
5. On confirm: POST to `/api/admin/media/upload` with FormData
6. Server: validates, resizes with sharp (max 1920px wide), saves to `/public/uploads/`
7. Server: updates SiteMedia record with new imageUrl
8. Old image file is deleted from disk
9. Toast: "התמונה עודכנה בהצלחה ✓"
10. Card preview updates immediately

### Upload API Spec
```
POST /api/admin/media/upload
  Content-Type: multipart/form-data
  Body: { file: File, zone: string, altText?: string }
  
  Server logic:
  1. Auth check (admin only)
  2. Validate file: type ∈ [image/jpeg, image/png, image/webp, image/svg+xml]
  3. Validate file size: <= 5MB
  4. Generate unique filename: {zone}-{timestamp}.{ext}
  5. Resize with sharp: max width 1920px, quality 85, preserve aspect ratio
  6. Save to /public/uploads/{filename}
  7. Delete old file if exists (but never delete default placeholders from /images/)
  8. Upsert SiteMedia: { zone, imageUrl: "/uploads/{filename}", altText }
  9. Return: { success: true, imageUrl: "/uploads/{filename}" }
```

### Service Images
Service images are also uploadable from the Services admin page:
- Each service has an image upload area
- Uploads go through same `/api/admin/media/upload` with zone=`service_{slug}`
- Service.image field stores the returned URL

---

## 8 · ADMIN SITE SETTINGS PAGE (/admin/settings)

### Layout
- Page title: "הגדרות האתר"
- Subtitle: "עדכנו טקסטים, פרטי קשר ותוכן ללא צורך בקוד"
- Grouped by tabs: "כללי" | "פרטי קשר" | "שעות פעילות" | "דף הבית" | "אודות" | "SEO" | "הזמנות" | "פוטר"

### Each Group
Display all settings for that group as a form:
- TEXT → single line input
- TEXTAREA → multi-line textarea (auto-resize)
- URL → input with URL validation + "פתח בחלון חדש" link
- PHONE → input with Israeli phone validation
- EMAIL → input with email validation
- BOOLEAN → toggle switch
- NUMBER → numeric input

### Save Behavior
- "שמור שינויים" button per group (or auto-save with debounce)
- Toast on save: "ההגדרות עודכנו בהצלחה"
- Changes reflect immediately on the public site (no cache to bust — or implement ISR revalidation)

---

## 9 · HOW PUBLIC PAGES CONSUME MEDIA + SETTINGS

**CRITICAL RULE:** No public-facing component should have hardcoded images or text that the admin wants to control. Every image uses `<DynamicImage>`, every text uses `getSetting()`.

### Example: HeroSection.tsx
```tsx
// src/components/home/HeroSection.tsx
export default async function HeroSection() {
  const title = await getSetting("hero_title");
  const subtitle = await getSetting("hero_subtitle");
  const ctaPrimary = await getSetting("hero_cta_primary");
  const ctaSecondary = await getSetting("hero_cta_secondary");

  return (
    <section className="relative h-screen">
      {/* Background — admin-controlled */}
      <DynamicImage
        zone="hero_bg"
        fill
        priority
        className="object-cover"
        sizes="100vw"
        fallback="/images/defaults/hero-bg.jpg"
      />
      {/* Mobile background variant */}
      <DynamicImage
        zone="hero_bg_mobile"
        fill
        className="object-cover md:hidden"
        sizes="100vw"
      />
      <div className="relative z-10 flex flex-col items-center justify-center h-full bg-black/40">
        <h1 className="text-5xl font-bold text-white">{title}</h1>
        <p className="text-xl text-white/90 mt-4">{subtitle}</p>
        <div className="flex gap-4 mt-8">
          <Button href="/booking">{ctaPrimary}</Button>
          <Button variant="outline" href={`https://wa.me/${await getSetting("whatsapp")}`}>
            {ctaSecondary}
          </Button>
        </div>
      </div>
    </section>
  );
}
```

### Example: Header.tsx
```tsx
export default async function Header() {
  const siteName = await getSetting("site_name");
  return (
    <header>
      <Link href="/">
        <DynamicImage zone="logo_main" width={180} height={50} fallback="/images/defaults/logo.png" />
        <span className="sr-only">{siteName}</span>
      </Link>
      {/* ... nav items */}
    </header>
  );
}
```

### Example: Footer.tsx
```tsx
export default async function Footer() {
  const phone = await getSetting("phone");
  const email = await getSetting("email");
  const address = await getSetting("address");
  const footerText = await getSetting("footer_text");
  const instagram = await getSetting("instagram_url");
  const facebook = await getSetting("facebook_url");

  return (
    <footer>
      <DynamicImage zone="logo_white" width={150} height={45} />
      <p>{address}</p>
      <a href={`tel:${phone}`}>{phone}</a>
      <a href={`mailto:${email}`}>{email}</a>
      {instagram && <a href={instagram}>Instagram</a>}
      {facebook && <a href={facebook}>Facebook</a>}
      <p>{footerText}</p>
    </footer>
  );
}
```

---

## 10 · SLOT GENERATION ALGORITHM

Implement in `src/lib/slots.ts`:

```
function getAvailableSlots(date: Date, serviceId: string): TimeSlot[]

ALGORITHM:
1. Get dayOfWeek (0-6) for requested date
2. Check AvailabilityException for this date:
   - If BLOCKED → return []
   - If OVERRIDE → use override hours
3. If no exception → get AvailabilityRule for dayOfWeek (isActive=true)
   - If no rule → return []
4. Get working window: startTime → endTime
5. Get service duration
6. Generate consecutive slots with 15min buffer (configurable)
7. Get existing non-cancelled bookings for this date
8. Filter out overlapping slots
9. Filter out past slots (if today)
10. Return: { startTime, endTime, isAvailable }[]
```

**Anti-overbooking:** Transaction + unique constraint + re-validate at creation.

---

## 11 · PAGE SPECIFICATIONS

### 11.1 · HOMEPAGE (/)
Long-scroll landing with sections:
A) Hero (uses DynamicImage + getSetting)
B) Services Grid (cards with icons, prices)
C) How It Works (3 steps)
D) About Preview (DynamicImage zone="home_about_photo" + getSetting("about_preview_text"))
E) Reviews Carousel
F) FAQ Accordion
G) Quick Contact (phone/WhatsApp from settings)

### 11.2 · ABOUT (/about)
- Hero: DynamicImage zone="about_hero"
- Main photo: DynamicImage zone="about_main_photo"
- Bio: getSetting("about_full_bio")
- Gallery: DynamicImage zone="about_gallery_1/2/3"
- Certifications: getSetting("about_certifications") parsed by newlines
- Philosophy: getSetting("about_philosophy")

### 11.3 · SERVICES (/services)
- Hero: DynamicImage zone="services_hero"
- Category tabs with filter
- Cards linking to /services/[slug]
- Per-service images from Service.image (also admin-uploaded)

### 11.4 · BOOKING (/booking)
5-step wizard: Service → Date → Time → Details → Confirm

### 11.5 · REVIEWS (/reviews)
- Hero: DynamicImage zone="reviews_hero"
- Average rating + grid + submit form

### 11.6 · CONTACT (/contact)
- Hero: DynamicImage zone="contact_hero"
- Form + info panel (all from settings)
- Map: DynamicImage zone="contact_map" or Google Maps embed from getSetting("google_maps_url")

### 11.7 · CANCEL BOOKING (/cancel/[token])
- Look up by cancelToken, show details, confirm cancellation

---

## 12 · ADMIN PANEL (/admin/*)

### Sidebar Navigation
```
📊 לוח בקרה         /admin
📋 הזמנות            /admin/bookings
🛠 שירותים           /admin/services
📅 זמינות            /admin/availability
💬 פניות             /admin/leads
⭐ המלצות           /admin/reviews
🖼 תמונות האתר       /admin/media         ← NEW
⚙ הגדרות האתר       /admin/settings      ← NEW
🚪 התנתקות
```

### Dashboard (/admin)
4 stat cards + today's bookings + recent leads

### Services (/admin/services)
CRUD with image upload per service (uses same upload API)

### Availability (/admin/availability)
Weekly rules grid + exceptions calendar

### Bookings (/admin/bookings)
Filterable table, status management, CSV export

### Leads (/admin/leads)
Table with status flow: NEW → IN_PROGRESS → CLOSED

### Reviews (/admin/reviews)
Approve/reject, preview, delete

### 🖼 Media (/admin/media) — DETAILED ABOVE IN SECTION 7

### ⚙ Settings (/admin/settings) — DETAILED ABOVE IN SECTION 8

---

## 13 · DESIGN SYSTEM

### Colors
```css
:root {
  --color-primary:       #5B7553;
  --color-primary-dark:  #4A6344;
  --color-primary-light: #7A9472;
  --color-secondary:     #D4A574;
  --color-secondary-dark:#C4955A;
  --color-accent:        #8B6F47;
  --color-bg:            #FDFBF8;
  --color-surface:       #F5F0EA;
  --color-surface-alt:   #EDE7DF;
  --color-text:          #2D2D2D;
  --color-text-secondary:#6B6B6B;
  --color-text-muted:    #9B9B9B;
  --color-border:        #E5DFD6;
  --color-success:       #4CAF50;
  --color-warning:       #F59E0B;
  --color-error:         #DC2626;
  --color-info:          #3B82F6;
}
```

### Typography: Heebo (400, 500, 600, 700) from Google Fonts
### RTL: `<html lang="he" dir="rtl">`, logical Tailwind properties
### Mobile-first responsive, focus states, proper contrast

---

## 14 · VALIDATION SCHEMAS (Zod)

All in `src/lib/validations.ts` — shared client+server.
Israeli phone regex, Hebrew error messages, schemas for:
- bookingSchema
- contactSchema
- reviewSchema
- serviceSchema
- availabilityRuleSchema
- availabilityExceptionSchema
- mediaUploadSchema (file type, size, zone key)
- settingUpdateSchema

---

## 15 · SEED DATA

Must seed:
1. **Admin user** (admin@healing.co.il / Admin123!)
2. **7 services** with Hebrew content
3. **Availability rules** (Sun-Thu 09:00-18:00)
4. **5 sample reviews** (approved, Hebrew)
5. **3 sample bookings**
6. **2 sample leads**
7. **ALL media zones** from ZONE_REGISTRY with default placeholder images from /images/defaults/
8. **ALL settings** from SETTINGS_REGISTRY with default values

The seed script must create default placeholder images in `/public/images/defaults/` for every zone.

---

## 16 · IMPLEMENTATION ORDER (mandatory)

```
PHASE A — Foundation
  A1: Create Next.js project (TS, Tailwind, App Router, src dir)
  A2: Configure tailwind.config.ts (colors, fonts, RTL)
  A3: Setup globals.css (Heebo font, base styles)
  A4: Setup Prisma schema (ALL models including SiteMedia + SiteSettings)
  A5: Docker-compose for PostgreSQL
  A6: Migrations + seed script (including all media zones + settings)
  A7: NextAuth config + admin middleware
  A8: .env.example

PHASE B — Design System
  B1: UI primitives (Button, Input, Card, Modal, etc.)
  B2: DynamicImage component + media helper functions
  B3: SiteSettings helper (getSetting, getSettingsByGroup)
  B4: ImageUploader + FileDropZone components
  B5: Layout (Header with DynamicImage logo, Footer with settings)
  B6: Verify RTL, responsive, fonts

PHASE C — Public Pages
  C1: Homepage (all sections using DynamicImage + getSetting)
  C2: About page (DynamicImage zones + settings)
  C3: Services page + [slug] pages
  C4: Contact page + Lead API
  C5: Reviews page + submit API

PHASE D — Booking Engine
  D1: Slot generation algorithm
  D2: BookingWizard + all steps
  D3: Booking API (create + anti-overbooking)
  D4: Cancellation page + API

PHASE E — Admin Panel
  E1: Admin layout + auth + sidebar
  E2: Dashboard
  E3: Services CRUD (with image upload)
  E4: Availability management
  E5: Bookings management
  E6: Leads management
  E7: Reviews management
  E8: 🖼 MEDIA MANAGEMENT PAGE (upload, replace, preview per zone)
  E9: ⚙ SITE SETTINGS PAGE (edit all texts, contact info, SEO)

PHASE F — Polish
  F1: Framer Motion animations
  F2: Loading states + Suspense
  F3: Error boundaries
  F4: Toast notifications
  F5: Mobile responsive QA
  F6: Accessibility audit
  F7: SEO metadata (using settings)
  F8: Default placeholder images for all zones
```

---

## 17 · RUN INSTRUCTIONS

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# DATABASE_URL="postgresql://user:pass@localhost:5432/healing"
# NEXTAUTH_SECRET="random-secret"
# NEXTAUTH_URL="http://localhost:3000"

# 3. Database
docker compose up -d
npx prisma migrate dev --name init
npx prisma db seed

# 4. Run
npm run dev

# 5. Access
# Public:  http://localhost:3000
# Admin:   http://localhost:3000/admin
# Login:   admin@healing.co.il / Admin123!
# Media:   http://localhost:3000/admin/media
# Settings:http://localhost:3000/admin/settings
```

---

## ⚠️ NON-NEGOTIABLE RULES

1. **NO `any` types** — proper TypeScript everywhere
2. **NO `alert()`** — use sonner toasts
3. **ALL text in Hebrew** — including errors, placeholders, labels
4. **Zod validation on BOTH sides** — client for UX, server for security
5. **Every form: loading + error + success states**
6. **Every list: empty state with icon**
7. **Mobile-first responsive** — test at 375px
8. **Proper focus/tab navigation**
9. **NO hardcoded images in public components** — use `<DynamicImage zone="...">` for ALL images
10. **NO hardcoded site text** — use `getSetting("key")` for ALL admin-editable content
11. **Prices in whole ₪** — no decimals
12. **File uploads validated** — type, size, dimensions on both client and server
13. **Old uploaded files cleaned up** — when replacing an image, delete the old file

---

## 🚀 START NOW

Begin with **Phase A, Step A1**: Create the Next.js project and show initial config files.
Then proceed step by step. Do NOT skip steps. Write COMPLETE, WORKING code.
