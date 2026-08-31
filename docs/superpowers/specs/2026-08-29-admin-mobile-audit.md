# Admin Mobile-Web Responsiveness Audit (iPhone portrait ~390px) — 2026-08-29

Authoritative defect list for Cluster W7 of the batch-2 plan. **This list is the COMPLETE audit** — W7 must fix every P0–P4 item below. Line numbers are as of commit f23875b (main after batch-1 merge); re-locate by content if drifted.

## Global facts (set severity for everything)

- **A.** `src/app/globals.css:28-29` — `html, body { overflow-x: hidden }` + RTL root: overflowing rows clip toward the LEFT with no scroll escape. Also makes `body` a scroll container → **breaks `position: sticky`** on the admin header (`admin/layout.tsx:26`), so the only hamburger scrolls away. Fix: `overflow-x: clip` on `html` only; safety `overflow-x-hidden` on admin `<main>` if needed; VERIFY sticky works after.
- **B.** `src/app/admin/layout.tsx:24` — content flex column lacks `min-w-0` (min-width:auto floors it at children's min-content). Add `min-w-0`.
- Content budget at 390px: main p-4 → 358px; inside Card p-4 → 326px.

## P0 — clipped/unreachable content

1. `src/app/admin/bookings/page.tsx:389-414` — header action row (`flex items-center gap-2`, no wrap): 4 items incl. hard `w-40` status Select ≈569px preferred vs 358px → **status filter clipped off-screen, unreachable**. Fix: `flex-wrap` + `w-full sm:w-40` Select.
2. `src/app/admin/images/page.tsx:206-210` AND `:290-294` — gallery delete buttons `opacity-0 group-hover:opacity-100`: **no hover on iOS → deleting gallery images impossible from mobile**. Fix both grids: `opacity-100 lg:opacity-0 lg:group-hover:opacity-100` + persistent dark scrim behind the icon for contrast.
3. `src/app/admin/services/page.tsx:297-395` — 6-col table only; actions column ~270px off-screen (RTL leftmost). Fix: add `lg:hidden` mobile card layout (bookings-page pattern), table `hidden lg:block`.
4. `src/app/admin/blog/page.tsx:443-527` — 5-col table only; edit/delete ~170px off-screen. Same fix as #3.

## P1 — clipped text / broken modal chrome

5. `src/app/admin/leads/page.tsx:222-231` — email anchor in no-wrap flex, no truncate/min-w-0 → tail clipped. Fix: `min-w-0` + `truncate` (mailto tap preserved).
6. `src/app/admin/blacklist/page.tsx:160` — identifier no break → long emails clipped at ~32 chars. Fix: `break-all`.
7. `src/app/admin/availability/page.tsx:411-419` + `src/components/ui/Modal.tsx:141-149` + `src/components/admin/DayDetailPanel.tsx:212-217` — `title=""` triggers Modal's fallback X at top-left, DayDetailPanel renders its own X at the same spot → **two stacked close buttons**. Fix: pass real title ("פרטי היום") + `hideClose` prop on DayDetailPanel when inside the modal.
8. `src/components/ui/Modal.tsx:121` — `max-h-[90vh]` uses large-viewport vh on iOS; overlay lacks scroll → tall sm/md modals clipped top+bottom (ManualBookingModal submit at :224 unreachable; BulkBlockModal :147; all confirm dialogs). Fix: `max-h-[85dvh]` + `overflow-y-auto` on the panel; overlay `p-4`.
9. `src/app/admin/layout.tsx:26` — sticky header broken by global fact A (fix there).

## P2 — touch targets <40px (fix ALL to ≥40px; sidebar X + hamburger ≥44px)

| Location | Today |
|---|---|
| `admin/contacts/page.tsx:216,222` | 28px "קבע תור", bare-text "להזמנות" |
| `admin/leads/page.tsx:267,274` | 28px notes/delete |
| `admin/reviews/page.tsx:192,212` | 28px approve/delete |
| `admin/gift-cards/page.tsx:272` | 28px delete |
| `admin/availability/page.tsx:584` | 24px delete range (smallest) |
| `admin/availability/page.tsx:501` | ~16px "הוסף טווח" |
| `components/admin/DayDetailPanel.tsx:266,287` | 26px delete/unblock |
| `components/layout/AdminSidebar.tsx:99-104` | 28px drawer X |
| `admin/layout.tsx:27-32` | 36px hamburger |
| `admin/bookings/page.tsx` BookingActions non-compact | 36px medical/notes/delete |

(BulkBlockModal day cells ≈39.4px — leave.)

## P3 — cramped rows (add flex-wrap/gap; stack where noted)

- `admin/reviews/page.tsx:136-153` — sync button + `w-48` select, no wrap.
- `admin/gift-cards/page.tsx:243-276` — 4-item action row, no wrap.
- `admin/blog/page.tsx:414-425` — h1 + 2 buttons, no wrap, no gap.
- `admin/blacklist/page.tsx:104-115` — `justify-between` without `gap`.
- `admin/content/page.tsx:464-483` — FAQ buttons ≈322/326px, no margin.
- `admin/bookings/page.tsx:429-450` — date-filter labels `text-xs` (readability).
- `components/admin/BulkBlockModal.tsx:175-190` — `grid-cols-2` date inputs 157px < native need → `grid-cols-1 sm:grid-cols-2`.
- `admin/availability/page.tsx:524-589` — rule row wraps every row; ensure clean wrap with gap-y (TimeInput stays `w-[100px]`).

## P4 — iOS auto-zoom + tiny text

- Inputs/selects/textarea under 16px trigger iOS focus-zoom (no maximum-scale set — keep it that way for a11y; fix font size instead): `images/page.tsx:220,304` (text-xs — worst), `:396`; `bookings/page.tsx:426,436,446`; `leads/page.tsx:187`; `reports/page.tsx:139`; `gift-cards/page.tsx:391`; `availability/page.tsx:72` (TimeInput); `DayDetailPanel.tsx:345,356,365,406`. Fix: `text-base` on mobile (`text-base sm:text-sm` where density matters). Shared Input/Textarea primitives already inherit 16px — untouched.
- `BulkBlockModal.tsx:218` `text-[10px]` day headers; `AdminSidebar.tsx:127` `text-[10px]` badge — bump to 11-12px where feasible.
- `reports/page.tsx:135-141` — **`<input type="month">` unsupported on iOS Safari** (degrades to free text). Replaced in W3 by prev/next month control; W7 verifies.

## Sidebar (drawer) gaps

`components/layout/AdminSidebar.tsx:81-86` — right-anchored off-canvas drawer, correct RTL. Missing: body scroll-lock while open (Modal has one at `Modal.tsx:71` — reuse), `role="dialog"`/aria, Escape-to-close, 28px X (see P2).

## Medical-form button (context for W4)

`admin/bookings/page.tsx` BookingActions Heart button: reachable in mobile cards but 36×36px, icon-only (`title` never fires on touch), `text-primary` #9db99d on white = **1.98:1 contrast** (fails 3:1 non-text). W4 replaces with labeled chip; W7 verifies size.

## Already-correct (do not churn)

Bookings mobile cards + `hidden lg:block` table; contacts/leads/reviews/gift-cards/blacklist card lists; dashboard grids; availability calendar + mobile modal; images grid; content/help accordions; sidebar nav rows (40px).
