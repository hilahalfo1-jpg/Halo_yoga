# Site Improvements V2 — Design Spec

## 1. Medical Declaration Form + Document Upload

### Flow
After booking is submitted (step 5 confirmation), before the booking is truly "done", the customer sees a **medical declaration form** they must fill and sign digitally.

### Form Fields
- **Pre-filled** (from booking details): Full name, phone
- **Additional**: ID number (תעודת זהות)
- **Medical conditions checklist** (checkboxes):
  - בעיות לב / לחץ דם
  - סוכרת
  - בעיות גב / פריצת דיסק
  - פציעות / ניתוחים אחרונים
  - הריון
  - אלרגיות
  - מחלות כרוניות
  - נוטל/ת תרופות באופן קבוע
  - אחר (free text)
- **Details textarea**: פירוט (if any checkbox selected)
- **Declarations** (must all be checked):
  - מסרתי מידע רפואי נכון ומלא
  - ידוע לי כי טיפול עיסוי אינו תחליף לטיפול רפואי
  - אני נושא/ת באחריות לעדכן על שינוי במצב בריאותי
  - אני נותן/ת הסכמתי לקבלת טיפול עיסוי
- **Digital signature**: Canvas-based signature pad
- **Date**: Auto-filled (today)
- **Optional file upload**: Medical document/test results (PDF/JPG/PNG, max 5MB) → Vercel Blob

### Database
New model `MedicalForm`:
- id, bookingId (FK unique), idNumber, conditions (JSON array), conditionDetails, declarations (boolean), signatureUrl (Vercel Blob), medicalDocUrl (nullable, Vercel Blob), createdAt

### Admin View
- In booking detail panel: "טופס רפואי" tab showing all form data, signature image, and link to medical document if uploaded

---

## 2. Customer Photo (Optional)

### Flow
- New optional field in **Step 4** (StepDetailsForm): "העלאת תמונת פנים (אופציונלי)"
- Accepts JPG/PNG, max 3MB
- Uploaded to Vercel Blob

### Database
- New field on `Booking`: `customerPhotoUrl String?`

### Admin View
- Customer photo thumbnail shown next to customer details in booking list/detail

---

## 3. Enlarge Logo in Header

- Increase logo size in Header component from ~40px to ~56px height
- Right side (RTL), affects all pages

---

## 4. Full Name in About

- Change `THERAPIST_NAME` / `SITE_NAME_HE` references from "הילה" to "הילה חלפון" where appropriate
- Update About page, AboutPreview, and any other references
- Keep "HALO" as the brand name in English contexts

---

## 5. Google Reviews Integration

### Approach
- Use **Google Places API (New)** to fetch reviews for "הילה חלפון | Halo Yoga Massage"
- Cache reviews in a new DB model `GoogleReview` to avoid repeated API calls
- Refresh via admin button or cron (daily)

### Database
New model `GoogleReview`:
- id, googleReviewId (unique), authorName, rating, text, time, profilePhotoUrl, createdAt, updatedAt

### Public Display
- On `/reviews` page: Google reviews shown alongside internal reviews, with a Google "G" badge
- On homepage ReviewsCarousel: mix both sources

### Environment
- New env var: `GOOGLE_PLACES_API_KEY`
- Need to find the Place ID for the business

---

## 6. Blog System

### Database
New model `BlogPost`:
- id, title, slug (unique), content (rich text/markdown), excerpt, category (MASSAGE/YOGA/PILATES/HEALTH/TIPS), coverImage, author (default "הילה חלפון"), isPublished, publishedAt, createdAt, updatedAt

### Public Pages
- `/blog` — Grid of published posts, filterable by category, paginated
- `/blog/[slug]` — Full article with cover image, date, category badge, share buttons
- Homepage section: 3 latest published posts in a grid

### Admin
- `/admin/blog` — List all posts (draft/published), create, edit, delete
- Rich text editor or markdown editor for content
- "צור עם AI" button: opens modal where Hila enters a topic, Claude API generates a draft article in Hebrew. She can edit before publishing.
- Cover image upload (Vercel Blob)

### SEO
- JSON-LD `Article` schema on each blog post page
- Meta tags (title, description, og:image) per post
- Blog posts added to sitemap.xml

### Navigation
- Add "בלוג" to main nav (between "המלצות" and "צור קשר")

---

## 7. WhatsApp Community Link

- Add WhatsApp group join link: `https://chat.whatsapp.com/LBWIaJi6Um6IdqrEDLTutM`
- Display in footer as "הצטרפו לקהילה שלנו בוואטסאפ"
- Optionally on contact page as well

---

## 8. Address Update

- Change from "שכונת משולש, זבוטינסקי, ראשון לציון" to "רחוב דובנוב, ראשון לציון"
- Update in: `constants.ts`, Footer, Contact page, JSON-LD structured data, Google Maps embed query
