# WhatsApp Automation via ManyChat — Implementation Plan

> **For agentic workers:** subagent-driven; two clusters (WA-A server/automation, WA-B admin/manual+content) run in PARALLEL (disjoint files; the shared contracts (see WA-A's cross-cluster block: the wa-stamp PATCH extension owned by WA-A; wa-messages.ts owned by WA-B) are coded against as written here). Standing guardrails: explicit `git add` paths, no checkout/stash, WA-A runs the single final `npm run build`, WA-B verifies with vitest+tsc only. User approved the full design incl. the two extra messages (reminder-day-before, gift-approved) on 2026-08-30.

**Goal:** Automatic WhatsApp messages to customers at booking lifecycle points (request received / approved / rejected-cancelled / post-treatment review request / day-before reminder) plus gift-order-approved to the purchaser — via ManyChat (Phase 2), with always-available manual wa.me buttons in the admin (Phase 1) as the day-one path and permanent fallback.

**Source architecture:** the battle-tested badfos playbook (provided by the user; its iron rules are BINDING): ManyChat is the only send arm; token server-only; approved-template Flows triggered by `flow_ns`; every send returns `{ sent: boolean; reason?: string }` and NEVER throws; idempotency via DB timestamps checked server-side; silent skip with reason when env vars are missing; the wa_phone custom-field minefield handling verbatim (search bare `972...` before `+972...`; findByCustomField wa_phone first; "already exists" recovery extracting wa_id; findByName + last-9-digits + self-heal wa_phone write; permission-denied-import is an account setting, not code).

**Verified context (explored):** email touchpoints & exact fire sites — public POST `src/app/api/bookings/route.ts:178-181`; admin PATCH CONFIRMED/REJECTED/CANCELLED `src/app/api/admin/bookings/[id]/route.ts:107-110`; auto-reject cascade `:48-94`; customer self-cancel `cancel/route.ts:73-81`; auto-COMPLETED sweep lives in the dashboard GET `src/app/api/admin/dashboard/route.ts:55-62` (runs only when Hila opens /admin — non-deterministic timing); COMPLETED is currently silent. No `*SentAt` fields exist on Booking. Cron: 1 of 2 Hobby slots used (blog-reminder, weekly); Hobby = daily granularity minimum. No Google review link exists anywhere; `GOOGLE_PLACES_API_KEY` is unset in all envs, so a Place-ID lookup cannot be relied on — the review link is a SiteContent setting Hila pastes (Google Business Profile → "בקש ביקורות" → short link), with a Maps-search fallback. `waMeLink(phone)` exists in `src/lib/phone.ts:34` (no text param — extend at call site). BookingActions is shared by both admin layouts (`admin/bookings/page.tsx:82-177`), insertion point after the notes button. TERMS_VERSION is `2026-08-29.1`; consent microcopy at `StepMedicalForm.tsx:322-333`.

**Schema change (ONE db push at deploy, additive):**
```prisma
// Booking — WhatsApp send stamps (idempotency lives here, per playbook)
waReceivedSentAt  DateTime?
waApprovedSentAt  DateTime?
waRejectedSentAt  DateTime?
waReviewSentAt    DateTime?
waReminderSentAt  DateTime?
// GiftCard
waApprovedSentAt  DateTime?   // purchaser notified the card is ready
```

**Env vars (all optional — missing → silent skip with reason):**
```
MANYCHAT_API_TOKEN
MANYCHAT_FLOW_RECEIVED / _APPROVED / _REJECTED / _REVIEW / _REMINDER / _GIFT_APPROVED
CRON_SECRET (exists)
```

---

## Cluster WA-A: ManyChat lib + server triggers + cron (Phase 2 engine)

**Files:** `prisma/schema.prisma`, NEW `src/lib/manychat.ts`, NEW `src/lib/manychat.test.ts`, `src/app/api/bookings/route.ts`, `src/app/api/admin/bookings/[id]/route.ts` (its INLINE `patchBookingSchema` lives here, lines ~10-15 — NOT in validations.ts), `src/app/api/admin/gift-cards/[id]/route.ts`, NEW `src/app/api/cron/wa-daily/route.ts`, `vercel.json`, `src/lib/validations.ts` (ONLY the `giftCardPatchSchema` extension for waMark — lives at ~:87-90)

**Cross-cluster contracts (WA-B codes against these):** (1) the `waMark` PATCH extension (step 5 below); (2) `src/lib/wa-messages.ts` is OWNED BY WA-B (client-safe, pure — see WA-B step 0); WA-A does not need it at runtime (ManyChat sends pre-approved templates). `manychat.ts` importing `TERMS_VERSION` from the pre-existing `terms-content.ts` is a benign read of an existing file.

1. **Schema** — fields above; `npx prisma generate` only.
2. **`src/lib/manychat.ts`** — starts with `import "server-only";` (mechanically enforces the token-server-only iron rule) and exports `getGoogleReviewLink(): Promise<string | null>` (SiteContent settings/google_review_link via prisma — server-side only). The rest is the playbook verbatim, adapted:
   - `normalizeIlPhone(phone): string | null` (exact playbook impl: 00972 strip, `05\d{8}` → `+972...`, `9725\d{8}` → `+...`, else null).
   - `findOrCreateSubscriber(phone, firstName, lastName)` implementing the FULL minefield order (wa_phone custom field first with bare-then-plus variants; system phone; create with `has_opt_in_whatsapp: true`, `consent_phrase: "אישור קבלת עדכוני תורים בקביעת תור באתר (תקנון v<TERMS_VERSION>)"`; already-exists wa_id extraction; findByName + last-9 match + wa_phone self-heal). Custom-field id for wa_phone resolved once via `getCustomFields` and memo-cached (module scope, 1h TTL).
   - `sendWaFlow(kind, phone, firstName, lastName, fields?: Record<string,string>): Promise<{sent: boolean; reason?: string}>` — kind → env flow_ns map; missing token/flow_ns → `{sent:false, reason:"not_configured"}`; sets personalization custom fields via setCustomField BEFORE sendFlow; checks `status === 'success'` on every response body, not just HTTP; 5s AbortSignal per call; NEVER throws.
   - Personalization custom fields (document in the Hila setup doc; created in ManyChat by her): `booking_service`, `booking_datetime`, `review_link`, `cancel_link`, `card_url` (for the giftApproved template) — plus `wa_phone` (the minefield field). First name is a ManyChat system field.
   - Unit tests for `normalizeIlPhone` + the variant-ordering logic (pure parts; API calls not tested).
3. **Server triggers** (each: check stamp → send → on `sent` stamp timestamp; AWAITED via Promise.allSettled next to the existing email sends; failures logged, never fail the request; send only on a genuine status TRANSITION where the route can tell — the stamp makes every kind once-only regardless):
   - Public POST create: `sendWaFlow("received", ...)` → stamp `waReceivedSentAt`. Gift-linked bookings are structurally excluded — they are created in `/api/gift-cards`, a different route; NO exclusion code is needed here (state this in a comment).
   - Admin PATCH → CONFIRMED: "approved" (+ fields booking_service/booking_datetime/cancel_link) → `waApprovedSentAt`. → REJECTED or CANCELLED: "rejected" → `waRejectedSentAt`. Auto-reject cascade: "rejected" per overlapping booking (stamp each). Gift-linked bookings DO get approved/rejected/reminder (the purchaser holds the appointment — acceptable and useful).
   - Admin PATCH → COMPLETED: call shared `maybeSendReviewRequest(booking)`.
   - **`maybeSendReviewRequest` rules:** skip when `endAt > now - 2h`; skip when NO configured review link (`getGoogleReviewLink()` null — the Maps fallback is for Phase-1 MANUAL buttons only; auto-sends wait for a real link — INTENTIONAL, do not wire the fallback here); **skip when a GiftCard references this booking** (`giftCard.findFirst({ where: { bookingId } })` — the purchaser must not get a review request for the RECIPIENT's treatment); idempotency is an **atomic claim**: after the config/eligibility checks, `updateMany({ where: { id, waReviewSentAt: null }, data: { waReviewSentAt: now } })` and send ONLY when `count === 1` (lost-on-transient-failure beats double-nag).
   - **NO dashboard-sweep hook** — deliberately dropped (racy under concurrent GETs and can push the dashboard past Vercel's 10s timeout); the daily cron's [now-7d, now-2h] window covers sweep-completed bookings within a day, which is fine for review requests.
   - **Customer self-cancel: deliberately NO WhatsApp** (customer initiated it, sees on-screen confirmation; Hila gets the email; saves a Meta template).
   - Gift approval (`admin/gift-cards/[id]` PATCH): capture the PENDING-guarded `updateMany`'s `count`; when `count === 1` (genuine approval) → `sendWaFlow("giftApproved", purchaserPhone, ...)` → stamp GiftCard.`waApprovedSentAt`; the count gate IS the idempotency (re-PATCH matches 0). Null purchaserPhone → skip with reason.
4. **PATCH wa-stamp contract (consumed by WA-B):** extend the INLINE `patchBookingSchema` in the route file with optional `waMark: z.enum(["received","approved","rejected","review","reminder"])` — when `waMark` is present the route **handles it and EARLY-RETURNS before the status path** (stamps the corresponding `wa*SentAt` to now, idempotent overwrite, returns the updated booking; `{status, waMark}` together can NEVER trigger emails/cascade). Same contract style on the gift `[id]` route: `waMark: "giftApproved"` → stamp GiftCard.waApprovedSentAt, early-return.
5. **Cron `src/app/api/cron/wa-daily/route.ts`** (2nd and LAST Hobby slot; `0 16 * * *` — Hobby fires within the hour, so ~18:00-20:00 Israel across DST; acceptable evening window; CRON_SECRET Bearer guard identical to blog-reminder; force-dynamic). Two jobs, both idempotent, Israel windows built with the time.ts helpers (israelWallToUtc/addDaysToKey):
   - **Reminders:** CONFIRMED bookings with `startAt` in [tomorrow 00:00, day-after 00:00) Israel, `!waReminderSentAt` → atomic-claim stamp (updateMany where null, count===1) → `sendWaFlow("reminder", ...)`.
   - **Review requests:** COMPLETED bookings with `endAt` in [now-7d, now-2h], `!waReviewSentAt` → `maybeSendReviewRequest` (its own atomic claim). Respond `{ reminders: n, reviews: m, skipped: [...reasons] }`.
   - `vercel.json`: add `{ "path": "/api/cron/wa-daily", "schedule": "0 16 * * *" }`.
7. Verify: vitest (86 + new manychat tests) + tsc + ONE build. Commit: `feat(whatsapp): ManyChat automation engine — lifecycle sends, stamps, daily cron`.

## Cluster WA-B: Phase-1 manual buttons + review-link setting + terms bump + Hila docs

**Files:** NEW `src/lib/wa-messages.ts` (OWNED here — client-safe), `src/app/admin/bookings/page.tsx`, `src/app/admin/content/page.tsx`, `src/app/admin/help/page.tsx`, `src/lib/terms-content.ts`, NEW `docs/superpowers/specs/2026-08-30-manychat-setup.md`, `src/app/admin/gift-cards/page.tsx` (small)

0. **`src/lib/wa-messages.ts`** — PURE and CLIENT-SAFE (no prisma, no env, follow time.ts's "client-safe" precedent): `waText(kind, params: { firstName, serviceName?, dateTimeStr?, cancelUrl?, reviewLink?, cardUrl? }): string` returning the Hebrew message per kind (received/approved/rejected/review/reminder/giftApproved). `reviewLink` is a PARAM; export `MAPS_REVIEW_FALLBACK = "https://www.google.com/maps/search/?api=1&query=Halo+Yoga+Massage+הילה+חלפון"` for callers.
1. **BookingActions WhatsApp button** (both variants, after the notes button, ≥40px): opens wa.me with the status-appropriate prefilled `waText(...)`. **Review-link mechanism (pinned):** the bookings page fetches `/api/admin/site-content` ONCE on mount (auth-gated by middleware; returns settings too), extracts `settings/google_review_link`, falls back to `MAPS_REVIEW_FALLBACK`, and passes the resolved string down to `BookingActions` as a prop. **Popup-blocker rule from the playbook is BINDING:** `const win = window.open('', '_blank')` synchronously, then set `win.location.href`. After opening, PATCH `{ waMark: <kind> }` (contract in WA-A step 4) and render a ✓ state on the button when the matching stamp exists. The admin bookings GET has no `select` (findMany+include), so the new `wa*SentAt` fields flow automatically once WA-A's schema lands — only the `BookingRow` interface needs extending; before WA-A merges the fields are simply `undefined` → no checkmark, button still works. Kind by status: PENDING→received, CONFIRMED→approved, REJECTED/CANCELLED→rejected, COMPLETED→review.
2. **Gift-cards page**: same pattern — WhatsApp button on ACTIVE cards with purchaser phone: prefilled `waText("giftApproved", ...)` + the card link; stamp via the gift PATCH `waMark: "giftApproved"` (WA-A owns the route; contract in WA-A step 4).
3. **Review-link setting:** new card in `/admin/content` — "קישור ביקורת בגוגל" (single URL input, `dir="ltr"`, writes SiteContent settings/google_review_link via the existing admin POST) with step-by-step Hebrew helper: אפליקציית Google Business Profile → "בקש ביקורות" → העתקת הקישור. Note shown when empty: "עד שיוגדר — ההודעות ישתמשו בקישור חיפוש במפות".
4. **Terms bump:** append to clause 7 (הסכמה) in `terms-content.ts`: "מסירת מספר הטלפון בקביעת התור מהווה הסכמה לקבלת עדכונים תפעוליים על התור (אישור, תזכורת, שינוי) בוואטסאפ או בדוא\"ל; ניתן לבקש הפסקת עדכונים בכל עת." → bump `TERMS_VERSION = "2026-08-30.1"`. NO liability language. StepMedicalForm microcopy unchanged (the consent line already references the terms).
5. **Hila setup doc** `docs/superpowers/specs/2026-08-30-manychat-setup.md` (Hebrew): the one-time checklist (token; wa_phone field + Rule copying wa_id; phone-import permission; the 5+1 custom fields for personalization) + the SIX template texts ready to submit to Meta (category Utility for all except review-request — mark review as Utility with the service-follow-up rationale; reminder Utility), each with its placeholders mapped to the custom fields, and where to paste each resulting `flow_ns` in Vercel env. Mirror the checklist (condensed) into a new `SECTIONS` entry in `/admin/help` (the page is a static SECTIONS Card array, not an accordion).
6. Verify: vitest + tsc (NO build). Commit: `feat(whatsapp): manual send buttons, review-link setting, consent bump, setup docs`.

## Review & close

Two-stage review workflow (spec → quality; quality focus: minefield fidelity vs the playbook, idempotency under the auto-reject cascade and double-PATCH, the atomic-claim pattern, cron query correctness in Israel time, popup-blocker pattern, no token/PII leaks client-side incl. `server-only` enforcement, terms wording contains no forbidden legal language) → fixes → verify → merge → orchestrator: db push → **backfill** `waReviewSentAt = now` on all pre-existing COMPLETED bookings (one SQL/prisma statement — prevents a day-one review-request blast to old customers) → deploy → smoke (cron route 401; PATCH waMark stamps; buttons render).

## Deferred
- Inbound webhooks from ManyChat (customer replies) — out of scope.
- Marketing/re-engagement broadcasts — Utility-only for now.
- Per-customer opt-out flag (Blacklist covers hard cases; ManyChat unsubscribe handles channel opt-out).
