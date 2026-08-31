# Full-Site Fixes Implementation Plan (Code-Review Remediation)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 32 verified findings from the full-site code review (plus the minor reuse/cleanup findings), with zero regression in booking logic, in 5 sequential clusters that avoid file conflicts.

**Architecture:** Unify all Booking timestamps to **real UTC instants** with Israel-wall-clock helpers in a new client-safe `src/lib/time.ts`; make the customer-visible slot grid (`getAvailableSlots`) the single validation path for public bookings; harden security/validation; sync hardcoded content into the SiteContent CMS; then dedupe/clean. Each cluster ends with `npm run build` + commit. Two independent reviewers audit the final diff before done.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma 5 (PostgreSQL/Neon), Zod **v4**, Tailwind (RTL Hebrew), Resend, vitest (new, dev-only).

**Hard constraints (from project CLAUDE.md):**
- Preserve the AvailabilityRule/AvailabilityException priority logic in `slots.ts` EXACTLY (category exceptions > global exceptions > category rules > global rules; BLOCKED → zero slots; OVERRIDE → custom windows; multiple windows/day; `SLOT_BUFFER_MINUTES` buffer).
- RTL: all new UI `text-right`, time inputs `type="time" dir="ltr"` save on blur.
- All new admin mutations: try-catch + sonner toasts, check `res.ok`.
- Hebrew user-facing strings.
- **DO NOT run `prisma db push` against production.** Schema change is deployed later (see Deploy Notes).
- Do not deploy to Vercel. Commit only.

---

## Cluster 0: Secrets removal — ✅ DONE (commit `5ac2eda`, do not repeat)

- [x] `.env.production` / `.env.vercel` untracked, `.gitignore` updated, committed. **Agents: skip this cluster entirely.**
- [ ] For final report only: secrets must be **rotated** (they live in GitHub history): NEXTAUTH_SECRET, Neon DB password, GOOGLE_CLIENT_SECRET, RESEND_API_KEY, BLOB_READ_WRITE_TOKEN, CALENDAR_FEED_TOKEN. History scrub needs BFG + force-push (GitHub push currently broken — user action required).

---

## Cluster A: Time-frame unification + booking integrity (one subagent, highest effort)

**Decision D1 — canonical frame:** `Booking.startAt/endAt` are **real UTC instants**. Slot times (`HH:mm` strings) are Israel wall-clock. All conversions go through `src/lib/time.ts` (NO prisma import — client-safe).

**Files:**
- Create: `src/lib/time.ts`, `src/lib/time.test.ts`, `src/lib/slots.test.ts`
- Modify: `src/lib/slots.ts`, `src/lib/validations.ts`, `src/types/index.ts`, `src/lib/constants.ts`, `src/lib/email.ts`, `prisma/schema.prisma`, `src/app/api/bookings/route.ts`, `src/app/api/bookings/cancel/route.ts`, `src/app/api/admin/bookings/route.ts`, `src/app/api/admin/bookings/[id]/route.ts`, `src/app/api/availability-days/route.ts`, `src/app/api/calendar/route.ts`, `src/app/api/admin/dashboard/route.ts`, `src/components/booking/StepConfirmation.tsx`, `src/components/booking/StepDateSelect.tsx`, `src/components/booking/StepTimeSelect.tsx` (check), `src/components/booking/BookingWizard.tsx`, `src/app/admin/bookings/page.tsx`, `package.json` (vitest)

### Task A1: `src/lib/time.ts` + tests (TDD)

- [ ] Add vitest: `npm i -D vitest` and script `"test": "vitest run"`.
- [ ] Write failing tests in `src/lib/time.test.ts`:
  - `israelWallToUtc("2026-01-15", "10:00")` → `2026-01-15T08:00:00.000Z` (winter, UTC+2)
  - `israelWallToUtc("2026-07-15", "10:00")` → `2026-07-15T07:00:00.000Z` (summer, UTC+3)
  - round-trip: `utcToIsraelTimeStr(israelWallToUtc(k, t)) === t` for several times incl. "00:00", "23:45", and a DST-transition week date
  - `toIsraelDateKey(israelWallToUtc("2026-03-10", "00:00")) === "2026-03-10"`
- [ ] Implement:

```ts
const IL_TZ = "Asia/Jerusalem";

function israelOffsetMs(utcDate: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: IL_TZ, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = Object.fromEntries(dtf.formatToParts(utcDate).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUtc - utcDate.getTime();
}

/** Israel wall-clock ("YYYY-MM-DD","HH:mm") → real UTC instant. Two-pass for DST edges. */
export function israelWallToUtc(dateKey: string, time: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let result = guess - israelOffsetMs(new Date(guess));
  result = guess - israelOffsetMs(new Date(result));
  return new Date(result);
}

/** UTC instant → "HH:mm" Israel wall clock */
export function utcToIsraelTimeStr(d: Date): string { /* toLocaleTimeString en-GB, timeZone IL_TZ, 2-digit, hour12:false */ }

/** UTC instant → "YYYY-MM-DD" Israel calendar date */
export function toIsraelDateKey(d: Date): string { /* toLocaleDateString en-CA, timeZone IL_TZ */ }

/** Calendar-date day-of-week for a dateKey (TZ-independent) */
export function dateKeyDayOfWeek(dateKey: string): number { return new Date(dateKey + "T00:00:00Z").getUTCDay(); }

/** dateKey + n days → dateKey */
export function addDaysToKey(dateKey: string, n: number): string { /* Date.UTC arithmetic + toISOString().slice(0,10) */ }

/** Date from a browser-local calendar pick → "YYYY-MM-DD" using LOCAL getters (never toISOString) */
export function localDateToKey(d: Date): string { /* getFullYear/getMonth/getDate padded */ }
```

- [ ] `npx vitest run` → PASS. Commit.

### Task A2: Rewrite `src/lib/slots.ts` on the UTC frame

**Preserve the exception/rule priority logic verbatim.** Changes only to time math and queries:

- [ ] `getAvailableSlots(dateKey: string, serviceId: string)` — signature now takes a dateKey. `GET /api/bookings` validates `^\d{4}-\d{2}-\d{2}$` (reject otherwise) and passes it through. Check what `StepTimeSelect` sends; make client send `localDateToKey(data.date)`.
- [ ] `dayOfWeek = dateKeyDayOfWeek(dateKey)`; `targetKey = dateKey`. Exception fetch keeps the ±1-day widening: compute `searchStart = new Date(dateKey + "T00:00:00Z") - 1d`, `searchEnd = +2d`, keep the Israel-key filter + category precedence code EXACTLY as today.
- [ ] Slot generation becomes pure minute-arithmetic (no Date): `"HH:mm"`→minutes, iterate `while (cur + duration <= windowEnd)`, push, `cur += duration + buffer`. Extract as exported pure `generateSlotsForWindow(startTime, endTime, duration, buffer): TimeSlot[]` and unit-test it in `src/lib/slots.test.ts` (e.g. 09:00-13:00, 60min, 15min buffer → 09:00, 10:15, 11:30; 12:45 slot would end 13:45 > 13:00 so excluded).
- [ ] Bookings query — **overlap over the whole Israel day** (fixes containment bug):

```ts
const dayStartUtc = israelWallToUtc(dateKey, "00:00");
const dayEndUtc = israelWallToUtc(addDaysToKey(dateKey, 1), "00:00");
const bookings = await prisma.booking.findMany({
  where: {
    startAt: { lt: dayEndUtc },
    endAt: { gt: dayStartUtc },
    status: { notIn: ["CANCELLED", "REJECTED"] },
  },
  select: { startAt: true, endAt: true },
});
```

- [ ] Availability mapping: `slotStartUtc = israelWallToUtc(dateKey, slot.startTime)`, `slotEndUtc = israelWallToUtc(dateKey, slot.endTime)`; past check `slotStartUtc <= new Date()`; conflict = `slotStartUtc < b.endAt && slotEndUtc > b.startAt`.
- [ ] Query consolidation (efficiency finding): fetch service + exceptions via `Promise.all`; replace the two rule queries with ONE `findMany({ where: { dayOfWeek, isActive: true, category: { in: [service.category, null] } } ... })` wait — Prisma `in` does not match `null`; use `OR: [{ category: service.category }, { category: null }]`, then split cat/global in JS. Priority behavior identical.
- [ ] Replace `isSlotAvailable` with TWO exported functions:
  1. `validateSlotForBooking(dateKey, startTime, serviceId): Promise<{ startAt: Date; endAt: Date } | null>` — calls `getAvailableSlots(dateKey, serviceId)`, finds `slot.startTime === startTime && slot.isAvailable`, returns UTC instants (`endAt` from the slot's endTime). This is THE public-booking gate (fixes: no-rule bookings, OVERRIDE bypass, past bookings, precedence mismatch, category logic).
  2. `hasBookingConflictOrBlocked(startAt, endAt, serviceId): Promise<boolean>` — the old isSlotAvailable behavior (direct overlap check with `status: { notIn: ["CANCELLED", "REJECTED"] }`, plus exception check). **Critical for the precedence fix:** the exception fetch must include ALL types (BLOCKED **and** OVERRIDE) for the date — NOT `type: "BLOCKED"` only — then pick the category-specific set if non-empty else the global set (same selection as getAvailableSlots), and only then `blocked = relevantSet.some(e => e.type === "BLOCKED")`. (Fetching only BLOCKED rows would make the cat set look empty on a "cat OVERRIDE + global BLOCKED" day and wrongly re-block it.) Used by the ADMIN create route (admin may book off-grid times).
- [ ] Delete now-unused local helpers (`nowInIsrael`, old `setTime`/`parseTime` if fully replaced); re-export `toIsraelDateKey` etc. from time.ts for existing importers.
- [ ] `npx vitest run` → PASS.

### Task A3: Schema — drop the broken unique; transactional create

- [ ] `prisma/schema.prisma`: remove `@@unique([startAt, endAt])` from Booking (CANCELLED/REJECTED rows must not block re-booking; overlap-but-not-identical rows were never protected anyway). Keep both `@@index`. Run `npx prisma generate` ONLY. **Do NOT `db push` anywhere** (deploy-time step).
- [ ] `POST /api/bookings`: replace `startAt` with `{ date, startTime }` in `bookingSchema` (`src/lib/validations.ts`): `date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`, `startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)`. Flow:
  1. shadow-ban check (unchanged; fake response keeps `startAt` field — synthesize from `israelWallToUtc(date, startTime)`),
  2. `const slot = await validateSlotForBooking(date, startTime, serviceId)`; if null → log BookingAttempt + 409 (unchanged Hebrew message),
  3. create inside a Serializable transaction with an in-tx overlap re-check:

```ts
try {
  const booking = await prisma.$transaction(async (tx) => {
    const conflict = await tx.booking.findFirst({
      where: {
        status: { notIn: ["CANCELLED", "REJECTED"] },
        startAt: { lt: slot.endAt },
        endAt: { gt: slot.startAt },
      },
      select: { id: true },
    });
    if (conflict) throw new SlotTakenError();
    return tx.booking.create({ data: { ...capture all existing fields..., startAt: slot.startAt, endAt: slot.endAt }, include: { service: true } });
  }, { isolationLevel: "Serializable" });
} catch (e) { /* SlotTakenError or Prisma P2034 (serialization conflict) → 409 same Hebrew message + BookingAttempt log. KEEP a P2002 → 409 branch too: it becomes dead code once the unique index is dropped at deploy time, but protects the rollout window if code deploys before the db push. */ }
```

  4. Emails: replace fire-and-forget with `await Promise.allSettled([...])` AFTER create, BEFORE the 201 response (guarantees delivery on serverless; failures logged, never fail the response).
- [ ] `StepConfirmation.tsx`: send `date: localDateToKey(data.date), startTime: data.timeSlot.startTime` (delete the local `setHours`/`toISOString` block).

### Task A4: Admin bookings routes

- [ ] `api/admin/bookings/route.ts` POST: `startDate = israelWallToUtc(date, startTime)`; use `hasBookingConflictOrBlocked`; same Serializable transaction pattern; keep P2002 → 409 branch (rollout window, see A3). GET — **committed decision, no ?all UI:** keep returning by status/service filters but with `service: { select: { name: true, duration: true, price: true } }`, `medicalForm: { select: { id: true } }`, and `take: 500` newest-first. (CSV export then covers the loaded 500 — acceptable; note in code comment.)
- [ ] Confirm-flow route `[id]/route.ts`:
  - Zod-validate body: `z.object({ status: z.enum(["PENDING","CONFIRMED","CANCELLED","COMPLETED","NO_SHOW","REJECTED"]).optional(), adminNotes: z.string().max(2000).optional() })` → 400 on failure.
  - Import `SLOT_BUFFER_MINUTES` from `@/lib/constants`; delete the shadow constant.
  - Await all emails with `Promise.allSettled` before responding.
- [ ] Where a medical form is viewed from the bookings page, fetch it lazily: check how the page's medical modal gets data today; if it used the list include, add `GET /api/admin/bookings/[id]/medical-form` (or reuse an existing route if present) returning the full form, and call it on modal open.

### Task A5: REJECTED becomes a first-class status

- [ ] `src/types/index.ts`: add `"REJECTED"` to `BookingStatus`.
- [ ] `src/lib/constants.ts`: `BOOKING_STATUS_LABELS.REJECTED = "נדחה"`, `BOOKING_STATUS_COLORS.REJECTED` = red classes matching the existing palette style.
- [ ] `src/app/admin/bookings/page.tsx`: add REJECTED to the status filter options and the status-change `<select>` options.
- [ ] `api/calendar/route.ts`: bookings query `status: { notIn: ["CANCELLED", "REJECTED"] }`; per-event `STATUS:` = `TENTATIVE` for PENDING, `CONFIRMED` for everything else (CONFIRMED/COMPLETED/NO_SHOW — past real appointments).
- [ ] Verify every remaining `status: { not: "CANCELLED" }` in the repo (grep) is switched to `notIn: ["CANCELLED","REJECTED"]` where it feeds availability/calendar; dashboard counts: REJECTED excluded from "pending/upcoming" metrics (read the route and apply judgment; rejected should not inflate counts).

### Task A6: Cancel route + emails hardening

- [ ] `api/bookings/cancel/route.ts`: allow cancel only from `PENDING`/`CONFIRMED` (guard REJECTED/COMPLETED/NO_SHOW with a clear Hebrew error); cutoff uses new `CANCELLATION_CUTOFF_HOURS = 24` exported from `src/lib/constants.ts` (message interpolates it); add + await `sendBookingCancelledAdminEmail` (new function in `email.ts`: notifies Hila with customer/service/time).
- [ ] `src/lib/email.ts`: add `function escapeHtml(s: string)` (& < > " ') and wrap EVERY interpolated user-controlled field (customerName, notes, customerEmail, customerPhone, service names in all templates, subject lines use plain text already — verify). Add the cancelled-admin template. All times rendered with `Intl ... timeZone: "Asia/Jerusalem"` (verify existing templates do this — fix any server-local rendering).

### Task A7: availability-days + StepDateSelect category awareness

- [ ] `api/availability-days/route.ts`: accept `?serviceId=`; resolve category. Return, per date, category-precedence results mirroring slots.ts: for BLOCKED/OVERRIDE exception dates group by Israel date key (import `toIsraelDateKey` from time.ts — delete the inline copies), pick cat-specific set if non-empty else global set. **The two lists must be mutually exclusive:** `blocked = relevantSet.some(BLOCKED)`; a date goes to `openedDates` only if it has OVERRIDE **and is not blocked** (StepDateSelect checks openedDates before blockedDates, so a date in both would show open while slots return none). `availableWeekdays`: for each dayOfWeek, true if cat rules exist for it, else if global rules exist. No serviceId param → current global behavior (fallback).
- [ ] `StepDateSelect.tsx`: destructure `serviceId` prop, include it in the fetch, refetch when it changes.

### Task A8: Dashboard + admin list timezone fixes

- [ ] `api/admin/dashboard/route.ts`: `todayKey = toIsraelDateKey(new Date())`; `todayStart = israelWallToUtc(todayKey, "00:00")`, `todayEnd = israelWallToUtc(addDaysToKey(todayKey,1), "00:00")`; week boundaries from the Israel date's `dateKeyDayOfWeek`. COMPLETED sweep unchanged (`endAt < now` is now correct).
- [ ] `admin/bookings/page.tsx` date filter: booking key via `new Date(b.startAt).toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" })`.
- [ ] Same page: render home-visit indicator (🏠 "ביקור בית" badge + `+₪{homeVisitSurcharge}` when > 0) in BOTH the mobile card and the desktop row; add `isHomeVisit`/`homeVisitSurcharge` to `BookingRow`.

### Task A9: Wizard ICS + shadow-ban medical-form

- [ ] `BookingWizard.tsx`: both calendar paths (Google URL + .ics download) compute UTC via `israelWallToUtc(localDateToKey(data.date), data.timeSlot.startTime)` from `@/lib/time` (client-safe); dedupe the twice-repeated start/end computation into one helper in the component. Full ICS escaping is Cluster D's shared builder — here just fix the time source; keep strings as-is.
- [ ] Shadow-ban 404: in `api/medical-form/route.ts` ONLY add at the top: `if (bookingId?.startsWith("shadow_")) return NextResponse.json({ data: { ok: true } });` (fake success — nothing else in this file; Cluster B owns the rest).

### Task A10: Verify + commit

- [ ] `npx vitest run` PASS; `npm run build` PASS. Grep: no remaining `toISOString()` feeding booking `startAt`; no `new Date(y, m - 1, ...)` in API routes.
- [ ] Commit: `fix(booking): unify all times to real UTC, transactional create, REJECTED handling, category-aware calendar`.

---

## Cluster B: Security & validation (one subagent, after A)

**Files:** `src/app/api/upload/route.ts`, `src/app/api/medical-form/route.ts`, `src/app/api/admin/blog/[id]/route.ts`, `src/app/api/admin/site-content/route.ts`, `src/app/api/contact/route.ts`, `src/app/api/reviews/route.ts`, `src/app/api/calendar/route.ts` (token compare only), `src/lib/validations.ts`

- [ ] **B1 upload:** read call sites first (customer photo, medical doc, admin images — public flows DO use it, so no auth wall). The 5MB size cap is ALREADY enforced server-side — the real work is: magic-byte sniff of the first bytes (JPEG ff d8 ff, PNG 89 50 4e 47, WebP RIFF....WEBP, PDF %PDF) — reject on mismatch with Hebrew error; ignore client `file.type`; random filename `uploads/<crypto.randomUUID()>.<ext-from-sniffed-type>` (drop user-controlled `file.name`). (Upload throttling: deferred — see Deferred list.)
- [ ] **B2 medical-form:** Zod schema in `validations.ts` (`medicalFormSchema`): bookingId cuid-ish string, idNumber optional `\d{5,10}`, conditions `z.array(z.string().max(100)).max(30)`, conditionDetails max 1000, signatureData optional base64 data-URL with decoded size cap 200KB (reject larger), medicalDocUrl optional URL that must start with `https://` and belong to a `*.vercel-storage.com` / `blob.vercel-storage.com` host. Keep the shadow_ short-circuit added in A9 at the very top.
- [ ] **B3 blog PATCH:** replace `{ ...body }` with a Zod-validated allow-list: title, content, excerpt, category, coverImage, isPublished (slug/publishedAt handled server-side as today — read route first and preserve slug-suffix logic).
- [ ] **B4 site-content POST:** Zod: section `^[a-z0-9_]{1,50}$`, key `^[a-zA-Z0-9_]{1,80}$`, value `z.string().max(10000)`, sortOrder int optional. 400 on failure. (DELETE stays id-gated.)
- [ ] **B5 throttle (no new deps, no schema change):** in contact POST — before create, `count` Leads with same `phone` in last hour ≥ 3 → 429 Hebrew "יותר מדי פניות, נסו שוב מאוחר יותר"; plus global count last hour ≥ 30 → 429. Same pattern in reviews POST (by `name` + global). Modest but stops naive floods.
- [ ] **B6 calendar token:** constant-time compare: both to `Buffer`, length check first, `crypto.timingSafeEqual`.
- [ ] `npm run build` PASS → commit `fix(security): validation, upload hardening, throttling, timing-safe token`.

---

## Cluster C: Admin↔site sync, content, performance (one subagent, after B)

**Files:** `src/lib/constants.ts`, `src/app/admin/content/page.tsx`, `src/app/admin/images/page.tsx`, `src/app/admin/leads/page.tsx`, `src/app/admin/page.tsx`, `src/components/services/ServicesHero.tsx`, `src/components/layout/Footer.tsx`, `src/components/home/QuickContact.tsx`, `src/app/contact/page.tsx`, public pages (`src/app/page.tsx`, `about`, `services`, `services/[slug]`, `reviews`, `blog`, `blog/[slug]`, `sitemap`), `src/app/api/site-content/route.ts`, `src/app/api/site-images/route.ts`, `src/app/api/working-hours/route.ts` (new), `src/app/api/admin/contacts/route.ts`, `src/app/api/admin/availability/bulk-block/route.ts`, `src/app/blog/page.tsx`, admin mutation routes (revalidatePath)

- [ ] **C1 contact info via CMS:** new SiteContent section `contact_info` (keys: phone, whatsapp, email, address). Add an editing card in `/admin/content` (SECTIONS config) with RTL inputs + help text ("וואטסאפ בפורמט 972...", phone display format free). Consumers: Footer, QuickContact, WhatsAppFab, Header (if it shows phone), contact page — read via existing `useSiteContent`/server `getSiteContent`, falling back to the constants when keys absent. Constants stay as fallback defaults only.
- [ ] **C2 working hours from availability:** new `GET /api/working-hours` (public, `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`): reads active AvailabilityRules, groups per dayOfWeek (0-6), returns `[{ day: "ראשון", hours: "11:00 - 20:00" | "סגור" | "8:00-12:00, 16:00-20:00" }]` — category rules merged with global per the same "category wins" precedence is NOT needed here; show the union of all active windows per day (this is a display of when the business is open at all). Replace `WORKING_HOURS` usage in Footer, contact page, QuickContact with fetched data (client hook or server fetch per component type); keep `WORKING_HOURS` as loading/error fallback.
- [ ] **C3 certifications admin:** in `/admin/images` add a multi-image section `certifications` (same UX as hero carousel management: upload, delete, sortOrder, alt).
- [ ] **C4 leads subject labels:** map `lead.subject` through `CONTACT_SUBJECTS` (value→label, fallback to raw) in leads page + dashboard recent-leads.
- [ ] **C5 small fixes:** FAQ delete in admin content: try-catch + `res.ok` check per DELETE, error toast, only update state+success toast when both succeed. Dashboard fetch: `.catch` + `toast.error`. `ServicesHero.tsx`: add `priority` to the fill Image.
- [ ] **C6 caching/ISR:** on public pages replace `export const dynamic = "force-dynamic"` with `export const revalidate = 60` (verify none uses cookies/headers/searchParams — if one does, leave it dynamic and note). Admin mutation routes for site-content, site-images, services, blog, reviews: after successful write call `revalidatePath("/", "layout")`. `api/site-content` + `api/site-images` GET: `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` (replace no-store; revalidatePath does NOT purge route-handler CDN cache, so ≤60s staleness for client-component content is the accepted tradeoff — document in code comment). Sitemap: revalidate 3600.
- [ ] **C7 query slimming:** blog index page `select` (no content); homepage reviews → `aggregate` for avg/count + `findMany take 12`; googleReviews `take 12`; `/reviews` page `take 60`. Contacts route: `select` only used fields on both queries.
- [ ] **C8 bulk-block:** rewrite to ≤3 queries: one `deleteMany({ where: { date: { in: parsedDates }, category } })` (match current per-date delete semantics — read the current where precisely), optional prefetch for OVERRIDE conflict semantics, one `createMany`. Preserve response shape.
- [ ] `npm run build` PASS → commit `feat(admin-sync): CMS contact/hours/certifications, perf caching, query slimming`.

---

## Cluster D: Reuse & cleanup (one subagent, after C)

- [ ] **D1 CSV:** `src/lib/csv.ts` `downloadCsv(filename, headers, rows)` with BOM + proper `"` escaping; use in bookings/leads/contacts/reports admin pages (fixes the unescaped bookings copy).
- [ ] **D2 phone:** `src/lib/phone.ts`: `normalizeIdentifier(raw)` (trim → if contains @ lowercase else strip \D — read blacklist route's exact semantics first and keep byte-identical) + `waMeLink(phone)` (strip \D, strip leading 0, prefix 972 unless already 972). Replace the 4 inline variants (bookings route, blacklist route, contacts route, contacts page).
- [ ] **D3 ICS:** `src/lib/ics.ts` with `escapeICal` + `buildIcsEvent({start,end,summary,description,location,uid})` + CRLF join; refactor `api/calendar/route.ts` and `BookingWizard.tsx` download/Google-URL to use it (escaping everywhere).
- [ ] **D4 hooks:** `createCachedFetchHook<T>(url)` factory in `src/lib/hooks/createCachedFetchHook.ts`; reimplement `useSiteContent` + `useSiteImages` on it (public API of both hooks unchanged). Add cache invalidation export used by admin content/images pages after save (clear module cache) — only if trivial; otherwise skip invalidation.
- [ ] **D5 dates:** replace inline `toLocaleDateString("he-IL", ...)` copies with `formatDate`/`formatDateShort` from utils in: BlogListClient, blog/[slug], BlogPreview, admin blog/blacklist/contacts pages; delete the local `formatDate` in gift-cards page (use shared).
- [ ] **D6 cancellation constant:** interpolate `CANCELLATION_CUTOFF_HOURS` into StepConfirmation policy text, email.ts template text, constants FAQ default text.
- [ ] **D7 shared details schema:** export `customerDetailsSchema` from validations (pick of name/phone/email/notes rules); StepDetailsForm uses it instead of its inline copy (keep its Hebrew messages — move them into the shared schema so server+client agree).
- [ ] **D8 dead code (verify zero usages with grep before EACH deletion):** `Container.tsx`; `ADMIN_NAV_LINKS`; `SITE_NAME_HE`, `SITE_TAGLINE_HE`, `THERAPIST_NAME` (verify!); `formatDayName`; unused inferred types in validations (`BookingFormData` etc. — bookingSchema changed in A, re-derive what's actually imported); the 14 commented-out `getServerSession` blocks + their commented imports across the 9 admin routes. Do NOT delete `loginSchema` without confirming the login page doesn't import it.
- [ ] **D9 wire dead features:** admin reviews page: "סנכרן ביקורות מגוגל" button → POST `/api/admin/google-reviews` (loading state, toast with count). Admin blog page: "✨ צור טיוטה עם AI" button (topic + category inputs → POST `/api/admin/blog/generate`, fill the editor form with the result as a DRAFT). Harden the generate route: strip ```json fences before `JSON.parse`, check `stop_reason === "max_tokens"` → Hebrew error, raise max_tokens to 4096, wrap parse in try with Hebrew 502 error. If `ANTHROPIC_API_KEY` missing → clear Hebrew message. **Update the pinned model** from the legacy dated snapshot to `claude-sonnet-5` (current Sonnet id; no date suffix).
- [ ] **D10 misc:** `useMediaQuery` wired into availability page (replace hand-rolled resize listener); StepConfirmation surcharge zero-leak: `{data.isHomeVisit && (data.service?.homeVisitSurcharge ?? 0) > 0 && (...)}`; extract `BookingActions` component used by both mobile card + desktop row in admin bookings page.
- [ ] `npx vitest run` + `npm run build` PASS → commit `refactor: shared helpers, dead-code removal, wire google-reviews + AI blog buttons`.

---

## Review & close

- [ ] Dispatch TWO independent reviewer subagents over `git diff <pre-cluster-A-commit>..HEAD` with this plan as the spec: reviewer 1 = correctness/regressions (booking flows, timezone math, RTL); reviewer 2 = security + project-rules compliance (CLAUDE.md 5 layers, Zod coverage, toasts).
- [ ] Fix accepted findings via a fix subagent; re-run build; commit `fix: address review findings`.
- [ ] Final verify: `npx vitest run`, `npm run build`, `git status` clean.

## Deploy Notes (NOT executed now — user runs later with "תעלה")

1. Rotate ALL secrets (Neon password, NEXTAUTH_SECRET, GOOGLE_CLIENT_SECRET, RESEND_API_KEY, BLOB_READ_WRITE_TOKEN, CALENDAR_FEED_TOKEN) in Vercel env vars; re-subscribe the calendar feed URL with the new token.
2. `vercel env pull` fresh DATABASE_URL, then `DATABASE_URL="..." npx prisma db push` — drops the `[startAt,endAt]` unique index (non-destructive) — BEFORE deploying code.
3. `vercel --prod --yes`.
4. Existing FUTURE bookings created via the admin before this fix are stored in the old wall-clock frame and will display 2-3h late; list them (`startAt > now`) and fix times manually in the admin. Past bookings: cosmetic only, leave.
5. The booking-create routes now use interactive Serializable `$transaction` — first time in this app's production config. Production DATABASE_URL uses Neon's pooler host; PgBouncer transaction-mode should pin BEGIN…COMMIT correctly, but verify ONE real booking end-to-end right after deploy. If P2028 timeouts appear: add `pgbouncer=true` to the URL or point these routes at the direct (non-pooler) host.

## Explicitly deferred (report to user)

- Full `apiFetch` sweep of ~26 admin fetch call sites (huge mechanical diff; do after nitpick round).
- `group-yoga` slug special-case → needs `Service.isGroup/maxParticipants` schema field + admin UI (schema change; separate task).
- Middleware defense-in-depth (per-route session re-checks) — middleware matcher remains the single gate; commented blocks are being deleted, decision documented here.
- Real rate-limiting infra (Upstash/KV) — DB-count throttle is the no-new-deps stopgap; `/api/upload` has size+magic-byte checks but no request throttle.
- GitHub history scrub of leaked secrets (BFG + force push) — blocked on broken GitHub auth; rotation is the real mitigation.
