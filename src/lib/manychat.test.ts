import { describe, it, expect } from "vitest";
import {
  normalizeIlPhone,
  phoneVariants,
  extractWaIdFromError,
  retryVariants,
  splitName,
  blacklistIdentifiers,
  countMatchesByIdentifier,
} from "./manychat";

describe("normalizeIlPhone", () => {
  it("normalizes a local 05X number", () => {
    expect(normalizeIlPhone("0521234567")).toBe("+972521234567");
  });

  it("strips hyphens and spaces", () => {
    expect(normalizeIlPhone("052-123-4567")).toBe("+972521234567");
    expect(normalizeIlPhone("052 123 4567")).toBe("+972521234567");
  });

  it("accepts E.164 with plus", () => {
    expect(normalizeIlPhone("+972521234567")).toBe("+972521234567");
    expect(normalizeIlPhone("+972 52 123 4567")).toBe("+972521234567");
  });

  it("accepts bare 972 form", () => {
    expect(normalizeIlPhone("972521234567")).toBe("+972521234567");
  });

  it("accepts international 00972 prefix", () => {
    expect(normalizeIlPhone("00972521234567")).toBe("+972521234567");
  });

  it("rejects landlines", () => {
    expect(normalizeIlPhone("031234567")).toBeNull();
    expect(normalizeIlPhone("97231234567")).toBeNull();
  });

  it("rejects wrong lengths", () => {
    expect(normalizeIlPhone("052123456")).toBeNull(); // too short
    expect(normalizeIlPhone("05212345678")).toBeNull(); // too long
    expect(normalizeIlPhone("9725212345678")).toBeNull();
  });

  it("rejects empty and non-IL numbers", () => {
    expect(normalizeIlPhone("")).toBeNull();
    expect(normalizeIlPhone("+14155551234")).toBeNull();
  });
});

describe("phoneVariants", () => {
  it("puts the bare 972 form FIRST (ManyChat wa_id format), plus second", () => {
    expect(phoneVariants("+972521234567")).toEqual([
      "972521234567",
      "+972521234567",
    ]);
  });

  it("handles an already-bare input", () => {
    expect(phoneVariants("972521234567")).toEqual([
      "972521234567",
      "+972521234567",
    ]);
  });
});

describe("extractWaIdFromError", () => {
  it("extracts the wa_id from the create error body", () => {
    expect(
      extractWaIdFromError(
        "ManyChat /fb/subscriber/createSubscriber failed (400): This WhatsApp ID already exists: 972549213258"
      )
    ).toBe("972549213258");
  });

  it("is case-insensitive", () => {
    expect(extractWaIdFromError("Already Exists — 972521234567")).toBe(
      "972521234567"
    );
  });

  it("returns null when no wa_id is present", () => {
    expect(extractWaIdFromError("This WhatsApp ID already exists")).toBeNull();
    expect(extractWaIdFromError("some other error")).toBeNull();
  });
});

describe("retryVariants", () => {
  const variants = ["972521234567", "+972521234567"];

  it("prefers the exact wa_id from the error (bare then plus) before the originals", () => {
    expect(retryVariants("972549213258", variants)).toEqual([
      "972549213258",
      "+972549213258",
      "972521234567",
      "+972521234567",
    ]);
  });

  it("keeps the original variants when no wa_id was extracted", () => {
    expect(retryVariants(null, variants)).toEqual(variants);
  });
});

describe("blacklistIdentifiers", () => {
  it("normalizes the phone to digits", () => {
    expect(blacklistIdentifiers("052-123-4567")).toEqual(["0521234567"]);
  });

  it("adds the lowercased trimmed email when present", () => {
    expect(blacklistIdentifiers("0521234567", " Dana@Example.COM ")).toEqual([
      "0521234567",
      "dana@example.com",
    ]);
  });

  it("drops a null/empty email", () => {
    expect(blacklistIdentifiers("0521234567", null)).toEqual(["0521234567"]);
    expect(blacklistIdentifiers("0521234567", "")).toEqual(["0521234567"]);
  });

  it("drops an empty phone (no digits)", () => {
    expect(blacklistIdentifiers("", "dana@example.com")).toEqual([
      "dana@example.com",
    ]);
    expect(blacklistIdentifiers("---")).toEqual([]);
  });
});

describe("countMatchesByIdentifier", () => {
  const rows = [
    { customerPhone: "0521234567" },
    { customerPhone: "052-123-4567" }, // same number, formatted
    { customerPhone: "0549999999" }, // different customer
    { customerPhone: "" },
  ];

  it("counts rows matching by normalized digits, across formats", () => {
    expect(countMatchesByIdentifier(rows, "0521234567")).toBe(2);
    expect(countMatchesByIdentifier(rows, "052 123 4567")).toBe(2);
  });

  it("does not match a different number", () => {
    expect(countMatchesByIdentifier(rows, "0549999999")).toBe(1);
    expect(countMatchesByIdentifier(rows, "0500000000")).toBe(0);
  });

  it("returns 0 for an empty/digitless phone (never matches empty rows)", () => {
    expect(countMatchesByIdentifier(rows, "")).toBe(0);
    expect(countMatchesByIdentifier(rows, "---")).toBe(0);
  });

  it("returns 0 for an empty row set", () => {
    expect(countMatchesByIdentifier([], "0521234567")).toBe(0);
  });
});

describe("splitName", () => {
  it("splits first and last name", () => {
    expect(splitName("הילה חלפון")).toEqual({
      firstName: "הילה",
      lastName: "חלפון",
    });
  });

  it("joins multi-part last names", () => {
    expect(splitName("שרה כהן לוי")).toEqual({
      firstName: "שרה",
      lastName: "כהן לוי",
    });
  });

  it("handles a single name and empty input", () => {
    expect(splitName("הילה")).toEqual({ firstName: "הילה", lastName: "" });
    expect(splitName("  ")).toEqual({ firstName: "", lastName: "" });
  });
});
