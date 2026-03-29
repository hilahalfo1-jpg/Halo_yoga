# Site Improvements V2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add medical form, customer photo upload, blog system with AI, Google reviews, WhatsApp community link, address update, logo resize, and full name fix.

**Architecture:** Extends existing Next.js 14 App Router + Prisma + Vercel Blob architecture. New DB models for MedicalForm, BlogPost, GoogleReview. New booking step (6-step wizard). Blog with admin CRUD + AI generation via Claude API. Google Places API integration with DB caching.

**Tech Stack:** Next.js 14, Prisma, PostgreSQL (Neon), Vercel Blob, Claude API (anthropic SDK), Google Places API, Tailwind CSS, Framer Motion, react-hook-form, Zod.

---

## Task 1: Address Update + Full Name + Constants

**Files:**
- Modify: `src/lib/constants.ts`
- Modify: `src/app/page.tsx` (JSON-LD address)

- [ ] **Step 1: Update constants**

In `src/lib/constants.ts`, change:
```ts
export const CONTACT_ADDRESS = "רחוב דובנוב, ראשון לציון";
export const THERAPIST_NAME = "הילה חלפון";
```

- [ ] **Step 2: Update JSON-LD in page.tsx**

In `src/app/page.tsx`, update the `getJsonLd` function address:
```ts
address: {
  "@type": "PostalAddress",
  streetAddress: "רחוב דובנוב",
  addressLocality: "ראשון לציון",
  addressCountry: "IL",
},
```

- [ ] **Step 3: Verify grep for old address and old name**

Run: `grep -r "שכונת משולש" src/` and `grep -r "זבוטינסקי" src/` — fix any remaining references.

- [ ] **Step 4: Commit**

```bash
git add src/lib/constants.ts src/app/page.tsx
git commit -m "fix: update address to דובנוב and therapist name to הילה חלפון"
```

---

## Task 2: Enlarge Logo in Header

**Files:**
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Increase desktop logo size**

In `src/components/layout/Header.tsx`, change the desktop logo:
```tsx
{/* Desktop: Logo */}
<Link href="/" className="hidden md:flex items-center gap-2 flex-shrink-0">
  <Image
    src={logoSrc}
    alt={images.logo?.alt || SITE_NAME}
    width={160}
    height={56}
    className="h-14 w-auto object-contain transition-opacity duration-300"
    priority
  />
</Link>
```

- [ ] **Step 2: Increase mobile logo size**

```tsx
{/* Mobile: Logo */}
<Link href="/" className="md:hidden absolute left-1/2 -translate-x-1/2">
  <Image
    src={logoSrc}
    alt={images.logo?.alt || SITE_NAME}
    width={140}
    height={48}
    className="h-11 w-auto object-contain transition-opacity duration-300"
    priority
  />
</Link>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "style: enlarge logo in header"
```

---

## Task 3: WhatsApp Community Link

**Files:**
- Modify: `src/lib/constants.ts`
- Modify: `src/components/layout/Footer.tsx`

- [ ] **Step 1: Add constant**

In `src/lib/constants.ts`:
```ts
export const WHATSAPP_COMMUNITY_LINK = "https://chat.whatsapp.com/LBWIaJi6Um6IdqrEDLTutM";
```

- [ ] **Step 2: Add to Footer**

In `src/components/layout/Footer.tsx`, after the WhatsApp contact link in the Contact section, add a community link. Also add to the social section:
```tsx
<li>
  <a
    href={WHATSAPP_COMMUNITY_LINK}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-3 text-sm text-white/60 hover:text-white transition-colors"
  >
    <Users className="h-4 w-4 flex-shrink-0" />
    <span>הצטרפו לקהילה שלנו</span>
  </a>
</li>
```

Import `WHATSAPP_COMMUNITY_LINK` from constants and `Users` from lucide-react.

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants.ts src/components/layout/Footer.tsx
git commit -m "feat: add WhatsApp community link to footer"
```

---

## Task 4: Database Schema — New Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add MedicalForm model**

```prisma
// ─── MEDICAL FORMS ─────────────────────
model MedicalForm {
  id               String   @id @default(cuid())
  booking          Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  bookingId        String   @unique
  idNumber         String?
  conditions       String   @default("[]") // JSON array of selected conditions
  conditionDetails String?
  signatureUrl     String?  // Vercel Blob URL
  medicalDocUrl    String?  // Vercel Blob URL
  agreedAt         DateTime @default(now())
  createdAt        DateTime @default(now())
}
```

- [ ] **Step 2: Add customerPhotoUrl to Booking**

```prisma
model Booking {
  // ... existing fields ...
  customerPhotoUrl   String?
  medicalForm        MedicalForm?
  // ... rest
}
```

- [ ] **Step 3: Add BlogPost model**

```prisma
// ─── BLOG ──────────────────────────────
model BlogPost {
  id          String    @id @default(cuid())
  title       String
  slug        String    @unique
  content     String    // Markdown content
  excerpt     String
  category    String    @default("HEALTH") // MASSAGE, YOGA, PILATES, HEALTH, TIPS
  coverImage  String?
  author      String    @default("הילה חלפון")
  isPublished Boolean   @default(false)
  publishedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([isPublished, publishedAt])
  @@index([category])
}
```

- [ ] **Step 4: Add GoogleReview model**

```prisma
// ─── GOOGLE REVIEWS ────────────────────
model GoogleReview {
  id              String   @id @default(cuid())
  googleReviewId  String   @unique
  authorName      String
  rating          Int
  text            String?
  time            DateTime
  profilePhotoUrl String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

- [ ] **Step 5: Generate Prisma client and push to DB**

Run: `npx prisma generate && npx prisma db push`

**IMPORTANT:** Alert user before running `db push` — this modifies production DB.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add MedicalForm, BlogPost, GoogleReview models + customerPhotoUrl"
```

---

## Task 5: Medical Declaration Form — Step 6 in Booking Wizard

**Files:**
- Create: `src/components/booking/StepMedicalForm.tsx`
- Create: `src/components/booking/SignaturePad.tsx`
- Modify: `src/components/booking/BookingWizard.tsx`
- Create: `src/app/api/medical-form/route.ts`

- [ ] **Step 1: Create SignaturePad component**

Create `src/components/booking/SignaturePad.tsx` — a canvas-based signature pad:
- Uses `useRef` for canvas
- Touch and mouse event handlers for drawing
- Clear button
- Returns base64 data URL on completion
- RTL compatible

- [ ] **Step 2: Create StepMedicalForm component**

Create `src/components/booking/StepMedicalForm.tsx`:
- Pre-filled fields: customerName (from booking data), customerPhone (from booking data)
- ID number input field (optional)
- Medical conditions checkboxes (8 conditions + "other" with text input)
- Details textarea (shown if any condition checked)
- 4 declaration checkboxes (all must be checked to proceed)
- SignaturePad component
- Optional file upload (medical document, PDF/JPG/PNG, max 5MB)
- Submit button that POSTs to `/api/medical-form`
- On success: proceeds to the success screen

- [ ] **Step 3: Create medical form API route**

Create `src/app/api/medical-form/route.ts`:
- POST handler
- Accepts multipart form data (signature image + optional medical doc)
- Uploads signature to Vercel Blob
- Uploads medical doc to Vercel Blob (if provided)
- Creates MedicalForm record linked to bookingId
- Returns success

- [ ] **Step 4: Update BookingWizard to add step 6**

In `src/components/booking/BookingWizard.tsx`:
- Change STEPS array to 6 steps: add `{ label: "הצהרת בריאות" }` after "אישור"
- After booking submission succeeds (currentStep 5 → onSuccess), show StepMedicalForm instead of success screen
- After medical form submission → show success screen (step 7)
- Success screen stays the same, just moves from step 5 to step 7

Updated flow:
1. Select service
2. Select date
3. Select time
4. Personal details + optional photo upload
5. Confirmation → submits booking
6. Medical declaration form → submits medical form
7. Success screen (calendar download etc.)

- [ ] **Step 5: Add customer photo upload to StepDetailsForm**

In `src/components/booking/StepDetailsForm.tsx`:
- Add optional file input for customer photo (JPG/PNG, max 3MB)
- Store file in BookingData state
- Upload to Vercel Blob in StepConfirmation when submitting booking
- Save URL as `customerPhotoUrl` in booking creation

- [ ] **Step 6: Update booking API to accept customerPhotoUrl**

In `src/app/api/bookings/route.ts`:
- Accept `customerPhotoUrl` in the POST body
- Save to booking record

- [ ] **Step 7: Update admin bookings to show medical form + photo**

In `src/app/admin/bookings/page.tsx`:
- Add BookingRow interface fields: `customerPhotoUrl`, `medicalForm`
- Show customer photo thumbnail if available
- Add "טופס רפואי" button/link to view medical form data
- Show medical form in a modal: conditions, details, signature image, medical doc link

- [ ] **Step 8: Commit**

```bash
git add src/components/booking/ src/app/api/medical-form/ src/app/api/bookings/route.ts src/app/admin/bookings/page.tsx
git commit -m "feat: medical declaration form + customer photo upload in booking flow"
```

---

## Task 6: Blog System — Database, API, Public Pages

**Files:**
- Create: `src/app/blog/page.tsx`
- Create: `src/app/blog/[slug]/page.tsx`
- Create: `src/app/api/admin/blog/route.ts`
- Create: `src/app/api/admin/blog/[id]/route.ts`
- Create: `src/app/api/admin/blog/generate/route.ts`
- Create: `src/app/admin/blog/page.tsx`
- Modify: `src/components/home/` (new BlogPreview section)
- Modify: `src/app/page.tsx` (add blog section)
- Modify: `src/lib/constants.ts` (add blog nav link)
- Modify: `src/app/sitemap.ts` (add blog posts)

- [ ] **Step 1: Create admin blog API routes**

`src/app/api/admin/blog/route.ts`:
- GET: list all posts (published + drafts), ordered by createdAt desc
- POST: create new post (title, slug auto-generated, content, excerpt, category, coverImage, isPublished)

`src/app/api/admin/blog/[id]/route.ts`:
- GET: single post by ID
- PATCH: update post fields
- DELETE: delete post

- [ ] **Step 2: Create AI generation API route**

`src/app/api/admin/blog/generate/route.ts`:
- POST: accepts `{ topic, category }`
- Calls Claude API (Anthropic SDK) with a prompt to generate a Hebrew blog article about the topic
- Returns `{ title, content, excerpt }`
- Uses `ANTHROPIC_API_KEY` env var

```ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Prompt: generate a professional Hebrew blog post about {topic} for a yoga and massage business
```

- [ ] **Step 3: Create admin blog page**

`src/app/admin/blog/page.tsx`:
- List all posts in a table (title, category, status, date)
- Create new post button → opens editor
- Edit post → inline or modal editor with:
  - Title, category selector, excerpt, content (textarea/markdown)
  - Cover image upload (Vercel Blob)
  - "צור עם AI" button → modal with topic input → calls generate API → fills in content
  - Publish/Draft toggle
  - Save and Delete buttons

- [ ] **Step 4: Create public blog listing page**

`src/app/blog/page.tsx`:
- Server component, fetches published posts
- Grid layout with cards (cover image, title, excerpt, category badge, date)
- Category filter tabs (all, massage, yoga, pilates, health, tips)
- Pagination (12 per page)
- Metadata: title "בלוג", description

- [ ] **Step 5: Create public blog post page**

`src/app/blog/[slug]/page.tsx`:
- Server component, fetches post by slug
- Full article layout: cover image, title, category, date, author
- Content rendered from markdown (use simple markdown-to-HTML or `dangerouslySetInnerHTML` with sanitized content)
- JSON-LD Article schema
- Dynamic metadata (title, description from excerpt, og:image from coverImage)
- Back to blog link

- [ ] **Step 6: Create BlogPreview homepage section**

Create `src/components/home/BlogPreview.tsx`:
- Shows 3 latest published posts in a grid
- Card with cover image, title, excerpt, category badge
- "לכל הכתבות" link to `/blog`

- [ ] **Step 7: Add blog section to homepage**

In `src/app/page.tsx`:
- Fetch latest 3 published blog posts
- Add `<BlogPreview posts={latestPosts} />` between ReviewsCarousel and FAQ

- [ ] **Step 8: Add blog to navigation**

In `src/lib/constants.ts`, add to NAV_LINKS:
```ts
{ label: "בלוג", href: "/blog" },
```
Place between "המלצות" and "צור קשר".

- [ ] **Step 9: Add blog posts to sitemap**

In `src/app/sitemap.ts`, fetch published blog posts and add their URLs:
```ts
const blogPosts = await prisma.blogPost.findMany({
  where: { isPublished: true },
  select: { slug: true, updatedAt: true },
});

const blogPages = blogPosts.map((post) => ({
  url: `${baseUrl}/blog/${post.slug}`,
  lastModified: post.updatedAt,
  changeFrequency: "weekly" as const,
  priority: 0.7,
}));
```

- [ ] **Step 10: Commit**

```bash
git add src/app/blog/ src/app/api/admin/blog/ src/app/admin/blog/ src/components/home/BlogPreview.tsx src/app/page.tsx src/lib/constants.ts src/app/sitemap.ts
git commit -m "feat: blog system with admin CRUD, AI generation, and public pages"
```

---

## Task 7: Google Reviews Integration

**Files:**
- Create: `src/lib/google-reviews.ts`
- Create: `src/app/api/admin/google-reviews/route.ts`
- Modify: `src/app/reviews/page.tsx`
- Modify: `src/components/reviews/ReviewsPageClient.tsx` (or wherever reviews are rendered)
- Modify: `src/components/home/ReviewsCarousel.tsx`

- [ ] **Step 1: Create Google Reviews utility**

`src/lib/google-reviews.ts`:
- `fetchGoogleReviews()`: calls Google Places API (New) to get reviews
  - First: search for place by name to get Place ID
  - Then: fetch place details with reviews
  - Returns array of reviews
- `syncGoogleReviews()`: fetches and upserts into GoogleReview model
- Uses `GOOGLE_PLACES_API_KEY` env var

- [ ] **Step 2: Create admin API route for syncing**

`src/app/api/admin/google-reviews/route.ts`:
- GET: returns cached Google reviews from DB
- POST: triggers sync — fetches fresh reviews from Google and upserts

- [ ] **Step 3: Update reviews page to show Google reviews**

In `src/app/reviews/page.tsx`:
- Fetch both internal reviews and Google reviews from DB
- Pass both to client component

In client component:
- Show both review types in one list
- Google reviews get a Google "G" badge icon
- Internal reviews have no badge or a "HALO" badge
- Filter tabs: "הכל", "עיסוי", "יוגה", "Google"

- [ ] **Step 4: Update ReviewsCarousel to include Google reviews**

In `src/components/home/ReviewsCarousel.tsx`:
- Accept both internal and Google reviews as props
- Mix them together, show up to 6 total
- Google reviews show "G" badge

- [ ] **Step 5: Update homepage to fetch Google reviews**

In `src/app/page.tsx`:
- Fetch GoogleReview records alongside internal reviews
- Pass to ReviewsCarousel

- [ ] **Step 6: Commit**

```bash
git add src/lib/google-reviews.ts src/app/api/admin/google-reviews/ src/app/reviews/ src/components/reviews/ src/components/home/ReviewsCarousel.tsx src/app/page.tsx
git commit -m "feat: Google Reviews integration with caching and display"
```

---

## Task 8: Add Admin Sidebar Links

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Add admin nav links for new pages**

In `src/lib/constants.ts`, update `ADMIN_NAV_LINKS`:
```ts
export const ADMIN_NAV_LINKS: NavLink[] = [
  { label: "לוח בקרה", href: "/admin" },
  { label: "הזמנות", href: "/admin/bookings" },
  { label: "שירותים", href: "/admin/services" },
  { label: "זמינות", href: "/admin/availability" },
  { label: "בלוג", href: "/admin/blog" },
  { label: "תמונות", href: "/admin/images" },
  { label: "פניות", href: "/admin/leads" },
  { label: "המלצות", href: "/admin/reviews" },
  { label: "גיפט קארד", href: "/admin/gift-cards" },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat: add blog to admin navigation"
```

---

## Task 9: Install Dependencies + Build + Verify

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Anthropic SDK**

Run: `npm install @anthropic-ai/sdk`

- [ ] **Step 2: Set up environment variables**

Remind user to add to Vercel:
- `ANTHROPIC_API_KEY` — for blog AI generation
- `GOOGLE_PLACES_API_KEY` — for Google reviews

- [ ] **Step 3: Run build**

Run: `npm run build`

Fix any type errors or build issues.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: site improvements v2 — medical form, blog, google reviews, address update"
```

- [ ] **Step 5: Deploy**

When user says "תעלה":
```bash
cd "/Users/mac/Desktop/halo yoga" && vercel --prod --yes
```
