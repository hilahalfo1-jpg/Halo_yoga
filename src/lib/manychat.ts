import "server-only";
import { prisma } from "@/lib/prisma";
import { normalizeIdentifier } from "@/lib/phone";
import { TERMS_VERSION } from "@/lib/terms-content";

/**
 * ManyChat API helpers (server-only) — automatic WhatsApp messages at booking
 * lifecycle points, per the battle-tested badfos playbook.
 *
 * Iron rules:
 * - ManyChat is the only send arm; the token never leaves the server
 *   (mechanically enforced by `import "server-only"` above).
 * - Approved-template Flows triggered by `flow_ns` env vars.
 * - Every send returns { sent, reason? } and NEVER throws.
 * - Missing env vars → silent skip with reason ("not_configured").
 * - Idempotency lives in DB `wa*SentAt` stamps, checked by the callers.
 *
 * All ManyChat responses look like { status: 'success', data: ... }.
 */

const MANYCHAT_API = "https://api.manychat.com";
const MC_TIMEOUT_MS = 5000;
// Mirror TEXT custom field populated by a ManyChat Rule with the WhatsApp ID
// for every new contact. Needed because WhatsApp-only contacts store the number
// as wa_id and their `phone` SYSTEM field is empty, so findBySystemField can
// never find them (known ManyChat limitation).
const WA_PHONE_FIELD_NAME = "wa_phone";

export type WaKind =
  | "received"
  | "approved"
  | "rejected"
  | "review"
  | "reminder"
  | "giftApproved";

const FLOW_ENV: Record<WaKind, string> = {
  received: "MANYCHAT_FLOW_RECEIVED",
  approved: "MANYCHAT_FLOW_APPROVED",
  rejected: "MANYCHAT_FLOW_REJECTED",
  review: "MANYCHAT_FLOW_REVIEW",
  reminder: "MANYCHAT_FLOW_REMINDER",
  giftApproved: "MANYCHAT_FLOW_GIFT_APPROVED",
};

export interface WaSendResult {
  sent: boolean;
  reason?: string;
}

// ─── Pure helpers (unit-tested) ─────────────────────────────────────────────

/**
 * Normalize an Israeli mobile number to E.164 (+9725XXXXXXXX).
 * Accepts '05X-XXXXXXX', '9725XXXXXXXX', '+972 5X ...', '009725XXXXXXXX'.
 * Returns null if it doesn't look like an IL mobile.
 */
export function normalizeIlPhone(phone: string): string | null {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("00972")) digits = digits.slice(2);
  if (/^05\d{8}$/.test(digits)) return `+972${digits.slice(1)}`;
  if (/^9725\d{8}$/.test(digits)) return `+${digits}`;
  return null;
}

/**
 * Lookup variants for an E.164 phone, in search order: bare '972...' FIRST
 * (that's the ManyChat wa_id format the mirror Rule writes), then '+972...'.
 */
export function phoneVariants(phone: string): string[] {
  const bare = phone.replace(/^\+/, "");
  return [bare, `+${bare}`];
}

/**
 * Extract the wa_id from a ManyChat "already exists" error message
 * (e.g. "This WhatsApp ID already exists: 972549213258").
 */
export function extractWaIdFromError(msg: string): string | null {
  return msg.match(/already exists\D*(\d{10,15})/i)?.[1] ?? null;
}

/**
 * Retry variants after an "already exists" create failure: the exact wa_id
 * from the error body first (bare then plus), then the original variants.
 */
export function retryVariants(waId: string | null, variants: string[]): string[] {
  return waId ? [waId, `+${waId}`, ...variants] : variants;
}

/** Split a full customer name into ManyChat first/last name parts. */
export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

/**
 * Blacklist lookup identifiers for a customer: normalized phone digits plus
 * (when present) the lowercased email — the exact normalizeIdentifier forms
 * the Blacklist model stores in its unique `identifier` column. Empty values
 * are dropped.
 */
export function blacklistIdentifiers(
  phone: string,
  email?: string | null
): string[] {
  const ids = [normalizeIdentifier(phone || "")];
  if (email) ids.push(normalizeIdentifier(email));
  return ids.filter(Boolean);
}

/**
 * Count rows whose customerPhone matches `phone` under normalizeIdentifier
 * (digit-strip comparison — same fetch-then-compare matching as
 * keyHasDerivedHistory in the contacts route). Pure; unit-tested.
 */
export function countMatchesByIdentifier(
  rows: Array<{ customerPhone: string }>,
  phone: string
): number {
  const key = normalizeIdentifier(phone || "");
  if (!key) return 0;
  return rows.filter((r) => normalizeIdentifier(r.customerPhone || "") === key)
    .length;
}

/** Format a UTC instant as an Israel wall-clock Hebrew date+time string. */
export function formatWaDateTime(d: Date): string {
  const date = new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Jerusalem",
  }).format(d);
  const time = new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jerusalem",
  }).format(d);
  return `${date} בשעה ${time}`;
}

// ─── Settings ───────────────────────────────────────────────────────────────

/**
 * The Google review link Hila pasted in /admin/content
 * (SiteContent settings/google_review_link). Null until configured.
 */
export async function getGoogleReviewLink(): Promise<string | null> {
  const row = await prisma.siteContent.findUnique({
    where: { section_key: { section: "settings", key: "google_review_link" } },
  });
  const value = row?.value?.trim();
  return value ? value : null;
}

// ─── ManyChat API plumbing ──────────────────────────────────────────────────

interface McResponse {
  status?: string;
  data?: unknown;
}

async function mcFetch(path: string, init?: RequestInit): Promise<McResponse> {
  const token = process.env.MANYCHAT_API_TOKEN;
  if (!token) throw new Error("MANYCHAT_API_TOKEN not configured");

  const res = await fetch(`${MANYCHAT_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(MC_TIMEOUT_MS),
  });
  const text = await res.text();
  let json: McResponse | null = null;
  try {
    json = JSON.parse(text) as McResponse;
  } catch {
    // non-JSON response — handled below
  }
  if (!res.ok || json?.status !== "success") {
    throw new Error(`ManyChat ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return json;
}

// Custom-field ids resolved via getCustomFields and memo-cached
// (module scope, 1h TTL). Never negatively cached — see getFieldIdByName.
const FIELD_CACHE_TTL_MS = 60 * 60 * 1000;
let fieldCache: { byName: Map<string, number | string>; fetchedAt: number } | null =
  null;

async function fetchFieldMap(): Promise<Map<string, number | string>> {
  const fields = await mcFetch("/fb/page/getCustomFields");
  const list = (Array.isArray(fields.data) ? fields.data : []) as Array<{
    id?: number | string;
    name?: string;
  }>;
  const byName = new Map<string, number | string>();
  for (const f of list) {
    if (f?.name && f?.id != null) byName.set(f.name, f.id);
  }
  return byName;
}

/**
 * Resolve a ManyChat custom field id by name via getCustomFields (memoized).
 * A miss is NEVER cached: the map is stored only when it contains the
 * requested field; on a miss the cache is bypassed and refetched once before
 * giving up — a field Hila creates mid-setup (or recreates) is picked up on
 * the next call, not after 1h.
 */
async function getFieldIdByName(name: string): Promise<number | string | null> {
  if (fieldCache && Date.now() - fieldCache.fetchedAt <= FIELD_CACHE_TTL_MS) {
    const cached = fieldCache.byName.get(name);
    if (cached != null) return cached;
  }
  const byName = await fetchFieldMap();
  const id = byName.get(name) ?? null;
  if (id != null) {
    fieldCache = { byName, fetchedAt: Date.now() };
  } else {
    fieldCache = null; // do not let a missing field stick for the TTL
  }
  return id;
}

async function setCustomField(
  subscriberId: string,
  fieldName: string,
  value: string
): Promise<void> {
  const fieldId = await getFieldIdByName(fieldName);
  if (!fieldId) throw new Error(`ManyChat custom field '${fieldName}' not found`);
  await mcFetch("/fb/subscriber/setCustomField", {
    method: "POST",
    body: JSON.stringify({
      subscriber_id: subscriberId,
      field_id: fieldId,
      field_value: value,
    }),
  });
}

// ─── Subscriber lookup minefield (playbook order, verbatim) ─────────────────

/**
 * Look up a subscriber via the `wa_phone` mirror custom field
 * (findByCustomField), trying each phone format in order (bare '972...'
 * first — that's what the ManyChat Rule writes). Best-effort: any failure
 * (field missing, API error, no match) is a miss, never an error.
 * Response shape: { status: 'success', data: [ ...subscribers ] }.
 */
async function findSubscriberByWaPhone(variants: string[]): Promise<string | null> {
  try {
    const fieldId = await getFieldIdByName(WA_PHONE_FIELD_NAME);
    if (!fieldId) return null;
    for (const variant of variants) {
      try {
        const found = await mcFetch(
          `/fb/subscriber/findByCustomField?field_id=${encodeURIComponent(String(fieldId))}&field_value=${encodeURIComponent(variant)}`
        );
        const list = (Array.isArray(found.data) ? found.data : []) as Array<{
          id?: number | string;
        }>;
        const id = list[0]?.id;
        if (id != null) return String(id);
      } catch {
        // miss — try next format
      }
    }
  } catch {
    // getCustomFields failed — fall back to system-field lookup
  }
  return null;
}

/**
 * Try findBySystemField with each phone format in order. ManyChat stores the
 * WhatsApp wa_id WITHOUT a plus ('972...'), so bare-972 must be tried first.
 * "Not found"-style non-success responses are treated as a miss, not an error.
 * NOTE: only finds contacts whose `phone` SYSTEM field is set — WhatsApp-only
 * contacts won't match here; that's what findSubscriberByWaPhone is for.
 */
async function findSubscriberByPhone(variants: string[]): Promise<string | null> {
  for (const variant of variants) {
    try {
      const found = await mcFetch(
        `/fb/subscriber/findBySystemField?phone=${encodeURIComponent(variant)}`
      );
      const id = (found.data as { id?: number | string } | undefined)?.id;
      if (id != null) return String(id);
    } catch {
      // miss (ManyChat returns non-success when not found) — try next format
    }
  }
  return null;
}

/** Full lookup: wa_phone mirror custom field first, then the phone system field. */
async function findSubscriber(variants: string[]): Promise<string | null> {
  return (await findSubscriberByWaPhone(variants)) ?? (await findSubscriberByPhone(variants));
}

/**
 * Last-resort lookup: search subscribers by name (findByName does substring
 * matching) and return the one whose WhatsApp identity matches the given
 * wa_id by last-9-digits comparison (handles '05X' vs '9725X' forms).
 * Needed for contacts that messaged the business BEFORE the wa_phone mirror
 * automation existed: their wa_phone custom field AND phone system field are
 * both empty, so the two phone lookups can never find them.
 * Best-effort: any API error or missing field is a miss (null), never throws.
 */
async function findByNameMatchingWaId(
  fullName: string,
  waId: string
): Promise<string | null> {
  try {
    const name = fullName.trim();
    const last9 = (waId || "").replace(/\D/g, "").slice(-9);
    if (!name || last9.length < 9) return null;

    const found = await mcFetch(
      `/fb/subscriber/findByName?name=${encodeURIComponent(name)}`
    );
    const candidates = (
      Array.isArray(found.data) ? found.data : found.data ? [found.data] : []
    ) as Array<{
      id?: number | string;
      whatsapp_phone?: unknown;
      wa_id?: unknown;
      phone?: unknown;
    }>;

    for (const candidate of candidates) {
      const matches = [candidate?.whatsapp_phone, candidate?.wa_id, candidate?.phone].some(
        (p) => {
          const digits = String(p ?? "").replace(/\D/g, "");
          return digits.length >= 9 && digits.slice(-9) === last9;
        }
      );
      if (matches && candidate?.id != null) return String(candidate.id);
    }
  } catch {
    // best-effort — treated as a miss
  }
  return null;
}

/**
 * Find a ManyChat subscriber by phone, or create one (with WhatsApp opt-in).
 * Returns the subscriber id.
 *
 * Lookup order: `wa_phone` mirror custom field → `phone` system field → create.
 * Searches with both '972...' (ManyChat wa_id format, no plus) and '+972...'.
 * Creation uses whatsapp_phone + WhatsApp opt-in only, and mirrors the number
 * into `wa_phone` for future lookups.
 * If createSubscriber says the WhatsApp ID already exists, re-finds instead
 * of failing (the create error body usually carries the exact wa_id); if that
 * still misses, falls back to findByName + wa_id verification (and self-heals
 * wa_phone on match).
 */
export async function findOrCreateSubscriber(
  phone: string,
  firstName: string,
  lastName: string
): Promise<string> {
  const variants = phoneVariants(phone); // bare '972...' first — ManyChat wa_id format
  const bare = variants[0];

  const existing = await findSubscriber(variants);
  if (existing) return existing;

  try {
    const created = await mcFetch("/fb/subscriber/createSubscriber", {
      method: "POST",
      body: JSON.stringify({
        whatsapp_phone: phone,
        first_name: firstName,
        last_name: lastName,
        has_opt_in_whatsapp: true,
        consent_phrase: `אישור קבלת עדכוני תורים בקביעת תור באתר (תקנון v${TERMS_VERSION})`,
      }),
    });
    const id = (created.data as { id?: number | string } | undefined)?.id;
    if (id == null) throw new Error("ManyChat createSubscriber returned no subscriber id");
    // Mirror the number into the wa_phone custom field so future lookups
    // (which check wa_phone first) find this contact. Non-fatal on failure —
    // the subscriber was created successfully either way.
    try {
      await setCustomField(String(id), WA_PHONE_FIELD_NAME, bare);
    } catch {
      // best-effort mirror — ignore
    }
    return String(id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);

    // Contact exists in ManyChat but the initial find missed it — retry the
    // find, preferring the exact wa_id from the error body
    // (e.g. "This WhatsApp ID already exists: 972549213258")
    if (/already exists/i.test(msg)) {
      const waId = extractWaIdFromError(msg);
      const refound = await findSubscriber(retryVariants(waId, variants));
      if (refound) return refound;

      // Third fallback: contact predates the wa_phone mirror automation, so
      // both phone lookups miss — search by name and verify by wa_id.
      const byName = await findByNameMatchingWaId(`${firstName} ${lastName}`, waId ?? bare);
      if (byName) {
        // Self-heal: mirror the wa_id into wa_phone so future lookups find
        // this contact directly. Non-fatal on failure.
        try {
          await setCustomField(byName, WA_PHONE_FIELD_NAME, waId ?? bare);
        } catch {
          // best-effort mirror — ignore
        }
        return byName;
      }

      throw new Error(
        `ManyChat says WhatsApp ID already exists but subscriber not findable — ${msg}`
      );
    }

    // New contact blocked by ManyChat account permissions — not a code bug
    if (/permission denied to import phone/i.test(msg)) {
      throw new Error(
        `ManyChat account permission blocks importing new phone contacts ("Permission denied to import phone") — enable phone import in ManyChat settings. ${msg}`
      );
    }

    throw e;
  }
}

// ─── Sending ────────────────────────────────────────────────────────────────

/**
 * Best-effort WhatsApp send: find/create subscriber, set personalization
 * custom fields (BEFORE triggering the flow, so the template reads fresh
 * values), trigger the approved-template flow for `kind`. NEVER throws.
 *
 * Blacklist suppression: a blacklisted customer (by normalized phone or, when
 * `email` is passed, normalized email) receives NO automatic WhatsApp of any
 * kind — checked here, in the single automatic-send gate, before any ManyChat
 * network work. Manual admin wa.me buttons are deliberately unaffected
 * (Hila's explicit action).
 *
 * Personalization custom fields (created in ManyChat by Hila per the setup
 * doc): `booking_service`, `booking_datetime`, `review_link`, `cancel_link`
 * (first name comes from the ManyChat system field — no custom field needed).
 */
export async function sendWaFlow(
  kind: WaKind,
  phone: string,
  firstName: string,
  lastName: string,
  fields?: Record<string, string>,
  email?: string | null
): Promise<WaSendResult> {
  try {
    if (!process.env.MANYCHAT_API_TOKEN) {
      return { sent: false, reason: "not_configured" };
    }
    const flowNs = process.env[FLOW_ENV[kind]];
    if (!flowNs) {
      console.log(`[MANYCHAT] ${kind} skipped: ${FLOW_ENV[kind]} not set`);
      return { sent: false, reason: "not_configured" };
    }
    const normalized = normalizeIlPhone(phone);
    if (!normalized) {
      return { sent: false, reason: `unparseable IL phone: ${phone}` };
    }

    // Blacklist check — bounded: findFirst over the unique-indexed
    // `identifier` column with at most two values (phone digits + email).
    const identifiers = blacklistIdentifiers(phone, email);
    if (identifiers.length > 0) {
      const blocked = await prisma.blacklist.findFirst({
        where: { identifier: { in: identifiers } },
      });
      if (blocked) {
        console.log(
          `[MANYCHAT] ${kind} suppressed: blacklisted (${blocked.identifier})`
        );
        return { sent: false, reason: "blacklisted" };
      }
    }

    const subscriberId = await findOrCreateSubscriber(normalized, firstName, lastName);

    for (const [name, value] of Object.entries(fields ?? {})) {
      await setCustomField(subscriberId, name, value);
    }

    await mcFetch("/fb/sending/sendFlow", {
      method: "POST",
      body: JSON.stringify({ subscriber_id: subscriberId, flow_ns: flowNs }),
    });

    console.log(`[MANYCHAT] ${kind} WhatsApp sent to ${normalized}`);
    return { sent: true };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error(`[MANYCHAT] ${kind} send failed:`, reason);
    return { sent: false, reason };
  }
}

/**
 * Bound a WhatsApp send task with an 8s overall timeout (Promise.race, timer
 * cleared when the task wins) so a degraded ManyChat can never hold a
 * customer-facing or admin response. On timeout this path just logs — no
 * stamp is written by it, though a late-completing task may still stamp
 * afterwards (benign: the stamp only follows a real send); the manual admin
 * WhatsApp button remains the fallback.
 */
export async function boundWaSend(
  task: Promise<unknown>,
  label: string
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = await Promise.race([
    task.then(() => false),
    new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(true), 8000);
    }),
  ]);
  clearTimeout(timer);
  if (timedOut) console.log(`[MANYCHAT] ${label} timed out`);
}

// ─── Repeat-rejection suppression ───────────────────────────────────────────

/**
 * Skip the automatic "rejected" WhatsApp when the customer already has ≥ 2
 * PRIOR bookings (excluding the current one) with status REJECTED or
 * CANCELLED — a repeatedly-rejected customer shouldn't get an automatic
 * rejection message every time. Matching is by normalized phone over the
 * candidate rows' customerPhone (fetch-then-compare, same pattern as
 * keyHasDerivedHistory in the contacts route) because stored phone formats
 * vary. The findMany fetches only customerPhone of REJECTED/CANCELLED rows —
 * a full scan of those statuses, acceptable at this business's scale.
 *
 * Callers must NOT stamp waRejectedSentAt on suppression, so the manual
 * admin WhatsApp button still shows unsent. Never throws; on a DB error the
 * send proceeds (fail-open — existing behavior preserved).
 */
export async function shouldSuppressRejectedWa(booking: {
  id: string;
  customerPhone: string;
}): Promise<boolean> {
  try {
    const rows = await prisma.booking.findMany({
      where: {
        id: { not: booking.id },
        status: { in: ["REJECTED", "CANCELLED"] },
      },
      select: { customerPhone: true },
    });
    return countMatchesByIdentifier(rows, booking.customerPhone) >= 2;
  } catch (e) {
    console.error("[MANYCHAT] repeat-rejection check failed:", e);
    return false;
  }
}

// ─── Review request (shared by admin PATCH → COMPLETED and the daily cron) ──

/**
 * Send the post-treatment review request for a COMPLETED booking, if eligible.
 * Never throws.
 *
 * Rules:
 * - Skip while the treatment ended less than 2h ago (customer is still winding
 *   down — the daily cron retries later).
 * - Skip when no Google review link is configured in /admin/content.
 *   INTENTIONAL: the Maps-search fallback is for the Phase-1 MANUAL buttons
 *   only — automatic sends wait for a real link. Do not wire the fallback here.
 * - Skip when a GiftCard references this booking — the purchaser holds the
 *   appointment and must not get a review request for the RECIPIENT's treatment.
 * - Idempotency is an ATOMIC CLAIM: stamp waReviewSentAt where it is still
 *   null and send only when exactly one row was claimed
 *   (lost-on-transient-failure beats double-nag).
 */
export async function maybeSendReviewRequest(booking: {
  id: string;
  endAt: Date;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
}): Promise<WaSendResult> {
  try {
    // Config check BEFORE the atomic claim — with ManyChat unconfigured, a
    // claim followed by a "not_configured" skip would permanently burn the
    // waReviewSentAt stamp (false ✓ in the admin, lost auto-request).
    if (!process.env.MANYCHAT_API_TOKEN || !process.env.MANYCHAT_FLOW_REVIEW) {
      return { sent: false, reason: "not_configured" };
    }

    const now = new Date();
    if (booking.endAt.getTime() > now.getTime() - 2 * 60 * 60 * 1000) {
      return { sent: false, reason: "ended_less_than_2h_ago" };
    }

    const reviewLink = await getGoogleReviewLink();
    if (!reviewLink) {
      return { sent: false, reason: "no_review_link_configured" };
    }

    const linkedGift = await prisma.giftCard.findFirst({
      where: { bookingId: booking.id },
    });
    if (linkedGift) {
      return { sent: false, reason: "gift_linked" };
    }

    const { count } = await prisma.booking.updateMany({
      where: { id: booking.id, waReviewSentAt: null },
      data: { waReviewSentAt: now },
    });
    if (count !== 1) {
      return { sent: false, reason: "already_sent" };
    }

    const { firstName, lastName } = splitName(booking.customerName);
    return await sendWaFlow(
      "review",
      booking.customerPhone,
      firstName,
      lastName,
      { review_link: reviewLink },
      booking.customerEmail
    );
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.error("[MANYCHAT] review request failed:", reason);
    return { sent: false, reason };
  }
}
