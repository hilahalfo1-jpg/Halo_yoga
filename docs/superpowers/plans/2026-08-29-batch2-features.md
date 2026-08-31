# Batch 2 — Features + Mobile Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Clusters run ONE AT A TIME, each followed by spec review + quality review. User approved the design 2026-08-29 ("מאושר — רוץ עד הסוף").

**Goal:** Contacts CRUD, iCloud busy-sync, report charts, medical-form visibility + legal terms, blog images/crop, weekly blog reminder (banner+email), and a full mobile-responsiveness overhaul of the admin.

**Architecture:** `Contact` table as an *overlay* on the derived contacts list (booking history stays computed); external ICS busy intervals injected into slot logic alongside bookings; hand-rolled SVG chart components (validated palette); terms page via SiteContent with versioned consent stored on MedicalForm; plain-text blog content extended with an image-token line syntax; Vercel cron for reminder email; audit-driven mobile fixes.

**User-approved decisions:** iCloud share-link sync; real crop with zoom (`react-easy-crop` — the only new runtime dep); reminder = admin banner + weekly email; deploy of batch 1 already done.

**Base:** branch `feature/batch-2` off `main` (post-f23875b + deploy). Build gate per cluster: `npx vitest run` (50) + `npm run build`.

**Hard constraints (carry over):** preserve AvailabilityRule/Exception priority logic exactly; Hebrew RTL UI; try-catch + sonner toasts + res.ok on admin mutations; time inputs `dir="ltr"`; no prod `db push` from the agent (deploy-time, user runs); no deploy from agents; Zod v4.

**Schema changes (one `db push` at deploy):** new `Contact` model; `MedicalForm.termsVersion String?`; nothing else.

---

## Cluster W1: Contacts CRUD (overlay model)

**Files:** `prisma/schema.prisma`, `src/lib/validations.ts`, `src/app/api/admin/contacts/route.ts`, `src/app/admin/contacts/page.tsx`

- [ ] Schema — add:
```prisma
model Contact {
  id            String   @id @default(cuid())
  normalizedKey String   @unique // normalizeIdentifier(phone) or lowercased email — same key space as the derived list
  name          String
  phone         String   // display format
  email         String?
  notes         String?
  isManual      Boolean  @default(false)
  isHidden      Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```
  `npx prisma generate` only. Add a top-of-file comment in the contacts route: table requires db push at deploy.
- [ ] API: keep the derived merge EXACTLY as today, then overlay: fetch all Contact rows; for each derived entry whose key has a Contact row → override name/phone/email, attach notes + contactId; drop entries whose Contact `isHidden` **UNLESS the derived `lastInteraction` is newer than `Contact.updatedAt` — a hidden contact who books again must reappear (clear `isHidden` back to false in that read path, fire-and-forget)**; append `isManual` Contact rows that have no derived entry (bookingCount 0). Add: `POST` (create manual: name+phone required, phone via `customerDetailsSchema`'s phone rule; compute normalizedKey; 409 Hebrew if key exists), `PATCH` (by id: name/phone/email/notes; if phone/email changes the normalizedKey, recompute — 409 on collision with another Contact ROW; colliding with a derived-only key is ACCEPTED by design — the edited row then overlays that customer's history; this is documented, see UI hint), `DELETE ?id=` (sets `isHidden: true`; for `isManual` rows actually delete). Zod schemas in validations.ts — **names `adminContactSchema` / `adminContactPatchSchema` (the export `contactSchema` ALREADY EXISTS for the public contact form — do not touch it)**. UI hint on the phone field in the edit modal: "שינוי טלפון מנתק את ההיסטוריה הקיימת ומקשר את הכרטיס להיסטוריה של המספר החדש".
- [ ] UI: card gains an edit (pencil) button → modal with name/phone/email/notes (phone/email `dir="ltr"`, 16px inputs); delete (trash) with the existing confirm-dialog pattern ("איש הקשר יוסתר מהרשימה; היסטוריית ההזמנות נשמרת"); header gains "הוסף איש קשר" button → same modal empty. Show notes line on the card when present. All touch targets ≥40px. toasts per project rules.
- [ ] Build + vitest + commit `feat(contacts): editable contact overlay (add/edit/hide)`.

## Cluster W2: iCloud busy-sync

**Files:** create `src/lib/external-calendar.ts`; modify `src/lib/slots.ts` (additive only), `src/app/admin/availability/page.tsx`, new `src/app/api/admin/external-calendar/route.ts`

- [ ] Storage: SiteContent section `settings`, key `icloud_calendar_url` (fits existing Zod). Admin card on the availability page: URL input (`dir="ltr"`), save via existing site-content POST, "בדוק חיבור" button → new admin GET `/api/admin/external-calendar?check=1` returns `{ ok, eventCount, upcoming: [{start, end, allDay}] }` (first 5, times in Israel format) or a Hebrew error. Include step-by-step Hebrew instructions for iPhone (הגדרות → יומן → שיתוף יומן ציבורי → העתקת הקישור).
- [ ] `external-calendar.ts`: `getExternalBusyIntervals(fromUtc: Date, toUtc: Date): Promise<Array<{start: Date; end: Date}>>`:
  - Read URL from SiteContent (`webcal://` → `https://`). Missing/empty → `[]`.
  - Fetch with `next: { revalidate: 300 }`, a 5s AbortSignal timeout, AND a **response byte cap of 2MB** (read as text, reject longer — iCloud feeds return full history and can exceed Vercel's Data Cache item limit; the cap doubles as the security length-limit on attacker-controlled feed content). Add a **module-scope in-memory memo (5-min TTL)** around the whole function as a second cache layer for warm lambdas. ANY failure → log + `[]` (fail-open: never block the whole calendar).
  - Parse ICS (hand-rolled): unfold folded lines (continuation = CRLF **or bare LF** followed by space **or tab**), iterate VEVENTs; skip `TRANSP:TRANSPARENT` and `STATUS:CANCELLED`. Handle: `DTSTART`/`DTEND` with `Z` (UTC), with `TZID=` (convert via the Intl technique like `israelOffsetMs`, arbitrary zone; unknown zone → treat as Israel time), `VALUE=DATE` all-day (block full Israel day(s); DTEND date exclusive per RFC), **`DURATION:PT#H#M#S` when DTEND is absent (parse it — do NOT default such events to 1h)**; only when BOTH DTEND and DURATION are missing → DTSTART + 1h (or full day for all-day).
  - RRULE: support `FREQ=DAILY|WEEKLY` with optional `INTERVAL`, `BYDAY`, `UNTIL`/`COUNT`, plus `EXDATE` (**comma-separated values and an optional TZID param**); expand only within [fromUtc, toUtc] capped at 90 days. Other FREQs: first occurrence only + one `console.warn`. `RECURRENCE-ID` moved instances: NOT reconciled in v1 (both original and moved time may block — fail-closed; listed in Deferred). Unit-test in `src/lib/external-calendar.test.ts` with fixture ICS strings: simple event, all-day, TZID Jerusalem, DURATION-only event, weekly RRULE with BYDAY, EXDATE (incl. comma form), TRANSPARENT skipped, folded lines (CRLF+space and LF+tab).
- [ ] `slots.ts` integration (ADDITIVE — do not touch rule/exception logic, and **do NOT touch `createBookingInTransaction`**): (1) in `getAvailableSlots`, after fetching bookings, `const externalBusy = await getExternalBusyIntervals(dayStartUtc, dayEndUtc)` and mark a slot unavailable when it overlaps a busy interval (same overlap predicate as bookings) — this automatically covers `validateSlotForBooking` and the public flow; (2) in `hasBookingConflictOrBlocked` (admin create), after the booking-conflict query, check external busy and on overlap have the ADMIN route return a DISTINCT Hebrew 409: "הזמן חופף לאירוע ביומן ה-iCloud של הילה" (so Hila knows WHY; requires the function to signal which check failed — return a reason enum instead of bare boolean, update its two call sites). Failures keep returning [] so behavior degrades to today's.
- [ ] Build + tests + commit `feat(availability): iCloud calendar busy-sync blocks conflicting slots`.

## Cluster W3: Reports charts

**Files:** create `src/components/admin/charts/{DonutChart,BarChart,BarsOverTime}.tsx` (client, pure SVG, no deps); modify `src/app/api/admin/reports/route.ts`, `src/app/admin/reports/page.tsx`

**Chart rules (from the dataviz skill — binding):**
- Validated categorical palette, in this FIXED order: `#2e9e5b, #3B82F6, #e8830c, #9256c8, #d5477a` (passed CVD validation). Assign by entity order, never re-color on filter. >5 categories → fold into "אחר" (gray `#8a8f8a`). The amber `#e8830c` has <3:1 surface contrast → EVERY chart shows direct labels (name + value/percent) — non-negotiable — and the existing tables stay below the charts as the table view.
- Status-distribution chart uses the STATUS palette (derive from existing `BOOKING_STATUS_COLORS` semantics: green confirmed/completed, amber pending, red cancelled/rejected, gray no-show), never the categorical set.
- One axis per chart, no dual-axis ever. Thin marks; 2px white gaps between segments/bars; donut (not filled pie), slice labels outside with leader lines only where they fit — otherwise label+percent in a legend list beside/below; bars horizontal (RTL-friendly: labels right, bars grow leftward is confusing — use `dir="ltr"` inside the chart plot with Hebrew labels in a right-aligned column). Tap/hover tooltip per mark (mobile: tap toggles). Numbers via `formatPrice`/plain, text in text tokens (not series colors).
- [ ] API additions (same response, new fields): `monthlyTrend` (last 12 Israel months: `{month: "2026-08", revenue, bookings}` — revenue = COMPLETED `service.price + (homeVisitSurcharge ?? 0)`); FIX existing `totalRevenue` to include `homeVisitSurcharge` too; `newVsReturning` for the period (dedupe by `normalizeIdentifier` — first-ever booking in period → new); `homeVisitShare` `{home, studio}`; `attemptsByReason` (BookingAttempt grouped by reason, period); `statusCounts` gains REJECTED. Add `export const dynamic = "force-dynamic"`.
- [ ] Page: replace the broken `<input type="month">` (unsupported on iOS) with prev/next arrows + "חודש נוכחי" chip showing "אוגוסט 2026" (state as YYYY-MM). Layout order: summary cards → revenue-over-time bars (12mo) → donut byService (count) → status bars → new/returning + home-visit as two small donuts side by side (stack on mobile) → attemptsByReason bars ("ביקושים שאבדו") → existing tables converted to the bookings-page mobile-card pattern (`lg:hidden` cards + `hidden lg:block` tables). CSV export unchanged plus the new sections appended.
- [ ] Build + commit `feat(reports): charts (donut/bars/trend), fixed revenue, mobile-safe month picker`.

## Cluster W4: Terms (תקנון) + medical-form visibility

**Files:** create `src/app/terms/page.tsx`, `src/lib/terms-content.ts` (seed text); modify `src/app/admin/content/page.tsx`, `src/app/api/medical-form/route.ts`, `src/lib/validations.ts`, `prisma/schema.prisma` (`termsVersion String?` on MedicalForm), `src/components/booking/StepMedicalForm.tsx`, `src/app/admin/bookings/page.tsx`, `src/components/layout/Footer.tsx`

- [ ] `/terms` page (revalidate 60): renders SiteContent section `terms` keys `title` + `body` (body = plain text, paragraphs on blank lines, numbered items preserved); fallback to the seed constant in `terms-content.ts` — the EXACT draft from **`docs/superpowers/specs/2026-08-29-terms-draft.md`** (read that file; it also lists what must NOT be added — binding), plus a `termsVersion` export `"2026-08-29.1"`. Admin content page: new "תקנון טיפולים" section (title + large textarea) with a warning helper: "מומלץ שעורך דין יאשר שינויים בנוסח".
- [ ] StepMedicalForm: under the signature area add: "חתימתך הדיגיטלית מהווה אישור כי קראת והבנת את **התקנון והצהרת הבריאות** וכי המידע שמסרת נכון ומלא" — התקנון linking to `/terms` (new tab). POST payload gains `termsVersion` (from the constant); `medicalFormSchema` gains optional `termsVersion: z.string().max(20)`; route stores it. Footer: add a "תקנון" link next to privacy/accessibility.
- [ ] Admin visibility fix: in `BookingActions`, replace the icon-only medical button with a labeled chip button "הצהרת בריאות" (icon+text, ≥40px, `text-secondary` — fixes the 1.98:1 contrast) shown whenever `medicalForm` exists; in the medical modal show `agreedAt` + `termsVersion` ("נחתם ב-... · גרסת תקנון ..."). Keep desktop compact variant with an accessible label.
- [ ] Build + commit `feat(legal): terms page + versioned consent, visible medical-form button`.

## Cluster W5: Blog images (crop + inline)

**Files:** `package.json` (+`react-easy-crop`), create `src/components/admin/ImageCropModal.tsx`; modify `src/app/admin/blog/page.tsx`, `src/app/blog/[slug]/page.tsx`, `src/app/api/admin/blog/route.ts` (POST Zod — currently unvalidated, add `blogPostSchema` mirroring the PATCH allow-list), `src/lib/validations.ts`

- [ ] Cover crop: after Hila picks a file, open `ImageCropModal` (react-easy-crop: aspect 16/9, zoom slider, drag; Hebrew labels; full-screen sheet on mobile via Modal size="lg") → on אישור, draw the crop to a canvas capped at 1600×900 JPEG q0.85 → upload the cropped blob to `/api/admin/upload` → save URL as coverImage. v1: "ערוך חיתוך" on an existing cover re-crops the already-cropped image (UI hint says so); "החלף תמונה" path for starting over from a new file.
- [ ] Inline images: editor toolbar button "הוסף תמונה לכתבה" → upload (reuse cover pipeline WITHOUT crop, cap 1600px wide) → insert `\n\n[תמונה: <url>]\n\n` at the textarea cursor (**the wrapping blank lines are mandatory — the renderer splits paragraphs on blank lines and the token must be its own paragraph**); caption variant `[תמונה: <url> | כיתוב]`. Renderer (`blog/[slug]/page.tsx`): TRIM each paragraph, and when it matches `^\[תמונה:\s*(\S+)(?:\s*\|\s*(.+))?\]$` render `next/image` (width 800, intrinsic height, rounded, centered, optional `<figcaption>`) instead of `<p>`; URL must pass the same blob-host check as medicalDocUrl — otherwise render the raw text (content legitimately starting with "[" is safe: the `תמונה:` prefix is required, non-matches fall through). Excerpt/list surfaces unaffected. AI-generate prompt: add one sentence telling the model NOT to emit image tokens.
- [ ] Build + commit `feat(blog): cover crop with zoom + inline article images`.

## Cluster W6: Weekly blog reminder (banner + cron email)

**Files:** `src/components/admin/BlogReminder.tsx`, `src/app/admin/blog/page.tsx`, create `src/app/api/cron/blog-reminder/route.ts`, `vercel.json` (new), `src/lib/email.ts`

- [ ] Banner: render `<BlogReminder />` also at the top of the blog tab; add "נזכרתי, אל תציגי היום" dismiss (sessionStorage, try/catch) so it stops nagging within a session.
- [ ] Cron route: GET, guarded by `Authorization: Bearer ${process.env.CRON_SECRET}` (401 otherwise; missing env → 500 log) — this matches Vercel's documented behavior: with a `CRON_SECRET` env set, Vercel cron invocations automatically send that Bearer header. Logic: latest `isPublished` `publishedAt`; if none or >7 days → `sendBlogReminderEmail` (new template in email.ts, recipient = `ADMIN_EMAIL` env — the same one the other admin emails use, with its existing fallback): friendly Hebrew nudge + deep link `https://haloyogamassage.com/admin/blog` + the "share to Google Business" tip from the help page. Respond `{ sent: boolean }`.
- [ ] `vercel.json`: `{ "crons": [{ "path": "/api/cron/blog-reminder", "schedule": "0 6 * * 0" }] }` (Sunday 06:00 UTC = 09:00 Israel). Note: middleware matcher must NOT block `/api/cron/*` (it doesn't — matcher covers only /admin + /api/admin) — verify. Deploy note: user must add `CRON_SECRET` env in Vercel.
- [ ] Build + commit `feat(blog): weekly reminder cron email + dismissible banner`.

## Cluster W7: Mobile overhaul (audit-driven; LAST — touches many files)

**The COMPLETE audit is committed at `docs/superpowers/specs/2026-08-29-admin-mobile-audit.md` — read it; W7 = fix every P0–P4 item in it.** The bullets below restate the binding specifics; on any discrepancy the audit file wins.

**Files:** per audit — `src/app/globals.css`, `src/app/admin/layout.tsx`, `src/components/ui/Modal.tsx`, `src/components/layout/AdminSidebar.tsx`, admin pages: bookings, services, blog, leads, blacklist, reviews, gift-cards, availability, images, content, contacts, reports(only if W3 left gaps), `src/components/admin/{DayDetailPanel,BulkBlockModal,ManualBookingModal}.tsx`

Binding specifics:
- [ ] **Layout plumbing:** add `min-w-0` to the admin content flex column (`admin/layout.tsx:24`); change `html, body { overflow-x: hidden }` to `overflow-x: clip` on `html` only (restores `position: sticky` for the admin header — VERIFY sticky works after, and that no page regains a horizontal scrollbar); keep a safety `overflow-x-hidden` on the admin `<main>` wrapper instead of body if needed.
- [ ] **P0:** bookings header row → `flex-wrap` + full-width status Select on mobile (`w-full sm:w-40`); gallery delete buttons in images page → always visible on touch (`opacity-100 lg:opacity-0 lg:group-hover:opacity-100` + dark scrim behind icon for contrast); services + blog admin tables → add `lg:hidden` mobile card layouts mirroring the bookings pattern (card: name/status/key facts + action buttons ≥40px), keep tables `hidden lg:block`.
- [ ] **P1:** leads email `truncate` inside `min-w-0` flex (tap still opens mailto; add `break-all` fallback on the card variant); blacklist identifier `break-all`; availability mobile Modal — pass a real `title` (e.g. "פרטי היום") so the fallback X disappears, and remove DayDetailPanel's own X when rendered inside the modal (prop `hideClose`); Modal.tsx — `max-h-[85dvh]` (dvh not vh) + `overflow-y-auto` on the panel for sm/md, and overlay `p-4` so edges never touch; verify ManualBookingModal + BulkBlockModal fully scrollable with submit reachable.
- [ ] **P2 touch targets:** every flagged control to ≥40px (p-2.5 + h-5 icons or larger); sidebar close X and hamburger ≥44px; BulkBlock calendar cells are borderline-OK — leave.
- [ ] **P3:** add `flex-wrap`/`gap` to the flagged rows (reviews header, gift-cards actions, blog header, blacklist header, content FAQ buttons); BulkBlockModal date inputs → stack `grid-cols-1 sm:grid-cols-2`; availability TimeInput rows — widen wrap tolerance (`w-[100px]` stays, ensure the row wraps cleanly with gap-y).
- [ ] **P4 iOS zoom:** every flagged input/select/textarea with `text-xs`/`text-sm` → `text-base` (16px) on mobile (`text-base sm:text-sm` where density matters); reports month input already replaced in W3; sidebar drawer: add body scroll-lock while open (reuse Modal's mechanism), `role="dialog"` + Escape close.
- [ ] Manual verification: `npm run build`; then run the dev server and spot-check bookings/services/blog/availability/images at 390px via curl-rendered HTML is insufficient — instead reason through each fixed class change against the audit's numbers and list any that remain doubtful in the report.
- [ ] Commit `fix(admin): full mobile-web overhaul per responsiveness audit`.

---

## Review & close

- [ ] Per cluster: spec reviewer + quality reviewer (same two-stage as batch 1), fixes applied by the same implementer, re-review.
- [ ] Final: TWO branch-wide reviewers — (1) integration/correctness incl. slots.ts external-busy interaction with the preserved rule logic and the Serializable transaction; (2) feature-completeness vs the user's 8 requests + security (cron auth, contacts PII, terms consent storage, ICS parser input from an attacker-controlled URL — treat feed content as untrusted: length caps, no string interpolation into queries).
- [ ] Merge `feature/batch-2` → main (--no-ff).

## Deploy notes (user actions)

1. `db push` (new Contact table + MedicalForm.termsVersion) — REQUIRED before/with deploy; contacts tab errors on old DB schema. Same command as before.
2. Add `CRON_SECRET` env in Vercel (any long random string) — cron email silently off until set. Hobby-plan cron precision is per-hour: the Sunday email may arrive 09:00–10:00 Israel, not at 09:00 sharp (max 2 crons on Hobby — this is the only one).
3. After deploy: Hila pastes her iCloud share link in עמוד הזמינות and taps "בדוק חיבור"; recommend attorney review of `/terms` before heavy marketing use.
4. Deploy-time verification (from W2 review): some Next 14 patch versions opt signal-bearing fetches out of the Data Cache — after deploy, confirm the ICS fetch is actually cached (check function logs for repeated iCloud fetches within 5 min on different visitors); if not cached, the in-memory memo + negative cache remain the effective layers (acceptable), no code change required.

## Explicitly deferred

- Complex RRULEs (monthly/yearly recurring events) — first occurrence only, documented. `RECURRENCE-ID` moved instances not reconciled (both times may block — fail-closed).
- Re-crop from the original image (v1 re-crops the cropped file).
- Contact merge tooling for phone-format duplicates (0543... vs 972543...) in the derived history.
- Editing a booking's customer identity from a contact edit (overlay only).
