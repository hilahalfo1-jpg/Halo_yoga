# Gift-Card Booking Step + Homepage Promo + Hero Fix — Implementation Plan

> **For agentic workers:** subagent-driven; two clusters (G1 backend+wizard, G2 promo+hero-fix) may run in PARALLEL (disjoint files) with the standing concurrency guardrails: explicit `git add` paths only, no checkout/stash; G1 runs the single `npm run build` at the end, G2 verifies with vitest+tsc only. User approved the design 2026-08-30 ("מאושר — רוץ עד הסוף כולל דיפלוי").

**Goal:** A new step 0 in the booking wizard — "למי התור? לעצמי / מתנה" — where the gift path creates a PENDING gift-card order (Hila approves + collects payment offline, then shares the card link), with optional appointment date, 1-year expiry on all gift cards, a homepage promo section, and the hero empty-content fix.

**Key context (from exploration — verified):** gift cards today are ADMIN-ONLY (no public creation, no payment system, delivery = Hila manually shares `/gift-card/<code>`); admin tab has create/share/toggle-redeemed/delete modals; GiftCard schema has NO expiresAt/purchaser fields/status; the wizard has steps 0-6 with hardcoded `setCurrentStep(5)/(6)` jumps, a `?service=<slug>` preselect effect that jumps to step 1, and a `currentStep < 6` progress guard; homepage sections are ordered in src/app/page.tsx:131-140 with `HowItWorks` as the best pattern for a promo; `useSiteContent`'s `t()` returns `content[s]?.[k] ?? fallback` so stored `""` renders empty (the live hero bug: hero.title/subtitle/buttonText2 are all `""` in prod).

**Hard constraints (standing):** Hebrew RTL; Zod v4; toasts+res.ok on admin mutations; slots.ts rule/exception logic untouchable (reuse its exported functions only); no db push/deploy from agents (orchestrator does both at the end); touch-targets ≥40px; mobile-first per the audit conventions; escapeHtml on user values in emails.

**Schema change (ONE db push at deploy, additive):** on GiftCard —
```prisma
status         String    @default("ACTIVE") // ACTIVE | PENDING (public orders start PENDING until Hila approves)
expiresAt      DateTime?                    // admin-created: set at creation (+1y); public orders: null while PENDING, set at approval (+1y)
purchaserName  String?
purchaserPhone String?
purchaserEmail String?
bookingId      String?                      // PENDING Booking created when the buyer picked a date (plain id, no FK)
```

---

## Cluster G1: Gift order flow (backend + wizard + admin)

**Files:** `prisma/schema.prisma`, `src/lib/validations.ts` (+`giftCardOrderSchema`), NEW `src/app/api/gift-cards/route.ts` (public POST), `src/app/api/admin/gift-cards/route.ts` + `[id]/route.ts`, `src/app/admin/gift-cards/page.tsx`, `src/lib/email.ts` (+`sendNewGiftOrderAdminEmail`), `src/components/booking/BookingWizard.tsx`, NEW `src/components/booking/StepWhoFor.tsx`, NEW `src/components/booking/StepGiftDetails.tsx`, `src/app/gift-card/[code]/page.tsx` + `GiftCardView.tsx`, `src/app/booking/page.tsx` (only if param plumbing requires)

1. **Schema** — add the fields above; `npx prisma generate` only. Existing rows default to ACTIVE with null expiry (old cards never expire — acceptable, they predate the policy).
2. **`giftCardOrderSchema`** (validations.ts): serviceId (string min 10), purchaserName (reuse customerDetailsSchema name rule), purchaserPhone (its phone rule), purchaserEmail optional/nullable, recipientName min 2 max 80, message max 500 (may be empty → default friendly text server-side), template enum of the 5 existing ids, `date`/`startTime` BOTH optional with the same regexes as bookingSchema (both present or both absent — refine).
3. **Public POST `/api/gift-cards`**: Zod → 400; blacklist shadow-ban check on purchaser phone/email (same normalizeIdentifier flow as bookings — fake success `{ data: { ok: true } }`, no writes); throttle (≥3 per purchaser-phone/hr, ≥30 global/hr → 429, same pattern as contact); resolve the service (404 Hebrew if missing/inactive) → serviceName snapshot. **Creation ORDER (avoids slot-blocking orphans):** (a) if date+startTime present, `validateSlotForBooking` first → null → 409 with the standard Hebrew slot message (nothing created); (b) create the GiftCard (status PENDING, purchaser fields, serviceName, template, message — default friendly text if empty, recipientName, senderName = purchaserName, **expiresAt = null while pending** — set at approval, see step 4); (c) if a slot was validated, `createBookingInTransaction` with status PENDING, **customerName = purchaserName** (NOT the recipient — the contacts derived list names cards from the latest booking, and Hila calls the PURCHASER to collect payment), customerPhone = purchaserPhone, customerEmail = purchaserEmail||null, notes = `🎁 מתנה עבור <recipientName> — ממתין לאישור גיפט קארד`; on SlotTakenError/P2034 → delete the just-created card and return the standard 409; (d) on success patch `bookingId` onto the card. Await `sendNewGiftOrderAdminEmail` via Promise.allSettled (escapeHtml everything; purchaser phone, recipient, service, chosen date or "ללא תאריך", deep link to /admin/gift-cards). Response: `{ data: { ok: true } }` — do NOT return the card code/URL (shared only after Hila approves).
4. **Admin gift-cards route(s)**: POST (admin create, immediately ACTIVE) sets `expiresAt = now + 1y` at creation. `[id]` PATCH: accept `status: "ACTIVE"` (approving; Zod-validate) alongside the existing isRedeemed toggle — **approval sets `expiresAt = now + 1y`** (the year runs from approval/payment, not from the order; pending cards display "תוקף: שנה מיום האישור"). **Card DELETE lifecycle:** when deleting a card that has a `bookingId` whose booking is still PENDING, also set that booking's status to REJECTED (frees the slot); the admin delete-confirm modal text says so ("ההזמנה המקושרת תידחה והמועד יתפנה").
5. **Admin gift-cards page**: PENDING cards render first with a prominent "ממתין לאישור" badge + purchaser contact (name, tel: link, email) + chosen date if any (Israel format) + linked-booking hint; an "אשר גיפט קארד" button (≥40px) → PATCH status ACTIVE → success toast → auto-open the EXISTING share modal for that card. **Card approval and booking confirmation are two separate acts by design** — the pending card shows an explicit hint: "💡 יש גם הזמנה מקושרת בטאב ההזמנות — אשרי אותה בנפרד" (only when bookingId set). ACTIVE cards unchanged plus: "בתוקף עד <date>" when expiresAt set, and an "פג תוקף" error Badge when expired (computed client-side). Keep toggle-redeemed/copy as-is.
6. **Wizard — MANDATORY explicit step machine (do NOT "renumber and patch"):**
   - Define `type StepId = "whoFor" | "service" | "date" | "time" | "details" | "confirm" | "medical" | "giftDetails" | "giftConfirm" | "success"` and derive the active sequence from state:
     - self: `["whoFor","service","date","time","details","confirm","medical","success"]`
     - gift with date: `["whoFor","service","date","time","giftDetails","giftConfirm","success"]`
     - gift, date skipped: `["whoFor","service","giftDetails","giftConfirm","success"]` (the "דלגו — ללא תאריך, המקבל/ת יקבעו בעצמם" button on the date step sets `dateSkipped: true`, which changes the derived sequence — no numeric jumping)
   - State is `currentIndex` INTO the derived `stepIds` array; render via a `switch (stepIds[currentIndex])`; `goNext`/`goBack` move the index; back-navigation (mobile bar + desktop circles) operates on positions in the CURRENT sequence only, so a gift user can never land on an orphaned "time" step after skipping the date. Progress bar count/percent/labels come from `stepIds` (success excluded from the progress display, replacing today's `< 6` guard with `stepIds[currentIndex] !== "success"`). The only special transition left is confirm→success (and confirm→medical→success in self mode), expressed as goNext in the sequence — delete the hardcoded `setCurrentStep(5)/(6)` calls.
   - `?service=<slug>` preselect: the effect ONLY sets the service in state (no step jump); step "whoFor" always shows first; after a mode is chosen, "service" is omitted from the derived sequence when a valid preselected service exists (both modes). `?gift=1`: auto-selects gift mode (skips "whoFor") and starts at "service" (or past it if `?service=` also valid).
   - `StepWhoFor`: two large tappable cards (RTL, ≥88px height): "תור לעצמי" / "מתנה למישהו אחר 🎁" + one-line descriptions.
   - `StepGiftDetails`: purchaser name/phone/email, recipient name, message textarea with counter (500), template picker reusing the admin swatch pattern. No medical form in gift mode.
   - Gift confirm screen: summary incl. "ללא תאריך — מקבל/ת המתנה יקבעו בעצמם" when skipped; POST to /api/gift-cards. Gift success screen: "הבקשה נשלחה! הילה תיצור איתך קשר להסדרת התשלום ותשלח לך את כרטיס המתנה 🎁" — no calendar buttons.
   - Self mode = today's exact flow and screens, medical form included. Verify both modes' full paths forward AND backward.
7. **Public card page** (`gift-card/[code]`): status PENDING → `notFound()` (link is only shared after approval); expired (`expiresAt < now` and not redeemed) → render with an "פג תוקף" overlay (reuse the "מומש" overlay styling, gray) and hide the booking CTA; otherwise show "בתוקף עד <Israel date>" under the card. GiftCardView props extended accordingly (templates untouched — overlay handled in the view like the redeemed badge).
8. Verify: `npx vitest run` (83 + add schema tests for giftCardOrderSchema date-pair refine), ONE `npm run build`. Commit: `feat(gift): public gift-card orders — who-for step, pending approval, 1y expiry`.

## Cluster G2: Homepage promo + hero empty-content fix

**Files:** NEW `src/components/home/GiftCardPromo.tsx`, `src/app/page.tsx`, `src/app/admin/content/page.tsx`, `src/lib/hooks/useSiteContent.ts`

1. **GiftCardPromo** — pattern-match `HowItWorks.tsx` exactly ("use client", `<Section bg>` chosen to alternate with neighbors, `useSiteContent().t()` for every string with Hebrew defaults, framer-motion whileInView). Content: gift emoji/icon (lucide Gift), title default "מתנה שמרגישים 🎁", subtitle default "פנקו מישהו שאתם אוהבים בגיפט קארד לטיפול או שיעור — הילה תכין כרטיס מתנה מעוצב אישית", CTA Button → `/booking?gift=1` default label "להזמנת גיפט קארד". Insert in `src/app/page.tsx` between `HowItWorks` and `AboutPreview`.
2. **Admin content**: add section `gift_promo` (title/subtitle/buttonText) to the SECTIONS config with the same defaults.
3. **Hero fix**: in `useSiteContent.ts` `t()` — treat empty/whitespace values as unset: `const v = content[section]?.[key]; return v && v.trim() ? v : fallback;`. This fixes the live empty "שיחת ייעוץ" button AND the empty hero title/subtitle everywhere, and guards every other section against legacy `""` rows (no DB cleanup needed — rows become inert). **Documented tradeoff (decided, do not reopen):** after this change an admin can no longer intentionally hide a text by clearing it to "" — clearing resurfaces the Hebrew default. The user confirmed the live "" rows are bugs, and hiding-by-emptying was never a designed feature.
4. Verify: `npx vitest run` + `npx tsc --noEmit` (NO build — G1 builds). Commit: `fix(home): gift promo section + empty-content fallback`.

## Review & close

- One combined two-stage review workflow after both commits land: spec (both clusters vs this plan) → quality (wizard renumbering is the highest-risk area — verify every step index, jump, guard, preselect, and both modes' full paths; the public POST's shadow-ban/throttle/slot integration; admin approve flow; expiry logic edge cases).
- Fixes → verify → merge to main.
- Orchestrator then: prod `db push` (GiftCard fields — additive), `vercel --prod`, smoke test (booking page loads, gift flow step visible, /api/gift-cards validation 400 on garbage, homepage shows promo, hero button text restored).

## Deferred
- Payment integration (no payment system exists — pending-approval flow is the design).
- Emailing the card link to the recipient automatically (Hila shares manually today; keep).
- Expiry for pre-existing cards (null = never expires).
