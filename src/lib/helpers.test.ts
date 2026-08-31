import { describe, it, expect } from "vitest";
import { escapeICal, formatICalUTC } from "@/lib/ics";
import {
  normalizeIdentifier,
  normalizeWhatsAppNumber,
  waMeLink,
} from "@/lib/phone";
import { escapeCsvCell } from "@/lib/csv";
import {
  adminContactSchema,
  adminContactLenientSchema,
  adminContactPatchSchema,
  adminContactLenientPatchSchema,
} from "@/lib/validations";

describe("escapeICal", () => {
  it("escapes commas and semicolons", () => {
    expect(escapeICal("a,b;c")).toBe("a\\,b\\;c");
  });

  it("escapes newlines (\\n, \\r\\n and \\r)", () => {
    expect(escapeICal("line1\nline2")).toBe("line1\\nline2");
    expect(escapeICal("line1\r\nline2")).toBe("line1\\nline2");
    expect(escapeICal("line1\rline2")).toBe("line1\\nline2");
  });

  it("escapes backslashes first (no double-escaping of inserted backslashes)", () => {
    expect(escapeICal("back\\slash")).toBe("back\\\\slash");
    expect(escapeICal("\\,")).toBe("\\\\\\,");
  });
});

describe("formatICalUTC", () => {
  it("formats a fixed instant as YYYYMMDDTHHMMSSZ in UTC", () => {
    expect(formatICalUTC(new Date(Date.UTC(2026, 7, 29, 14, 5, 9)))).toBe(
      "20260829T140509Z"
    );
  });

  it("zero-pads month, day, hours, minutes and seconds", () => {
    expect(formatICalUTC(new Date(Date.UTC(2026, 0, 2, 3, 4, 5)))).toBe(
      "20260102T030405Z"
    );
  });
});

describe("normalizeIdentifier", () => {
  it("lowercases and trims emails", () => {
    expect(normalizeIdentifier("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });

  it("strips non-digits from phones (dashes, spaces)", () => {
    expect(normalizeIdentifier("054-313-5182")).toBe("0543135182");
    expect(normalizeIdentifier(" 054 3135182 ")).toBe("0543135182");
  });

  it("leaves an already-normalized phone unchanged", () => {
    expect(normalizeIdentifier("0543135182")).toBe("0543135182");
  });
});

describe("normalizeWhatsAppNumber", () => {
  it("strips non-digits, drops the leading 0 and prefixes 972", () => {
    expect(normalizeWhatsAppNumber("054-3135182")).toBe("972543135182");
    expect(normalizeWhatsAppNumber("0543135182")).toBe("972543135182");
  });

  it("keeps an already-international number unchanged", () => {
    expect(normalizeWhatsAppNumber("972502919918")).toBe("972502919918");
  });

  it("maps empty/non-digit input to an empty string", () => {
    expect(normalizeWhatsAppNumber("")).toBe("");
    expect(normalizeWhatsAppNumber(" - ")).toBe("");
  });
});

describe("waMeLink", () => {
  it("strips the leading 0 and prefixes 972", () => {
    expect(waMeLink("0543135182")).toBe("https://wa.me/972543135182");
    expect(waMeLink("054-3135182")).toBe("https://wa.me/972543135182");
  });

  it("does not double-prefix numbers already starting with 972", () => {
    expect(waMeLink("972502919918")).toBe("https://wa.me/972502919918");
  });
});

describe("escapeCsvCell", () => {
  it("wraps cells in quotes and doubles inner quotes", () => {
    expect(escapeCsvCell('He said "hi"')).toBe('"He said ""hi"""');
    expect(escapeCsvCell("plain")).toBe('"plain"');
  });

  it("stringifies numbers and maps null/undefined to empty", () => {
    expect(escapeCsvCell(42)).toBe('"42"');
    expect(escapeCsvCell(null)).toBe('""');
    expect(escapeCsvCell(undefined)).toBe('""');
  });

  it("neutralizes formula-leading cells (=, +, -, @) with a leading quote", () => {
    expect(escapeCsvCell("=SUM(A1)")).toBe("\"'=SUM(A1)\"");
    expect(escapeCsvCell("+972")).toBe("\"'+972\"");
    expect(escapeCsvCell("-cmd")).toBe("\"'-cmd\"");
    expect(escapeCsvCell("@user")).toBe("\"'@user\"");
  });

  it("does not touch cells with those characters mid-string", () => {
    expect(escapeCsvCell("a=b")).toBe('"a=b"');
  });
});

describe("adminContactLenientSchema (contacts overlay for keys with derived history)", () => {
  it("accepts a legacy/foreign phone the strict schema rejects", () => {
    const body = { name: "John Doe", phone: "+1 212 555 0100", email: "" };
    expect(adminContactSchema.safeParse(body).success).toBe(false);
    expect(adminContactLenientSchema.safeParse(body).success).toBe(true);
  });

  it("accepts an empty phone for an email-only card", () => {
    const body = { name: "Jane Doe", phone: "", email: "jane@example.com" };
    expect(adminContactSchema.safeParse(body).success).toBe(false);
    expect(adminContactLenientSchema.safeParse(body).success).toBe(true);
  });

  it("still caps phone at 30 chars and keeps the strict schema strict", () => {
    expect(
      adminContactLenientSchema.safeParse({
        name: "Long Phone",
        phone: "1".repeat(31),
        email: "",
      }).success
    ).toBe(false);
    expect(
      adminContactSchema.safeParse({
        name: "Valid Local",
        phone: "050-1234567",
        email: "",
      }).success
    ).toBe(true);
  });
});

describe("adminContactLenientPatchSchema", () => {
  it("accepts a partial patch with a legacy phone the strict patch schema rejects", () => {
    const body = { id: "abc123", phone: "+1 212 555 0100" };
    expect(adminContactPatchSchema.safeParse(body).success).toBe(false);
    expect(adminContactLenientPatchSchema.safeParse(body).success).toBe(true);
  });

  it("still requires id and caps phone at 30 chars", () => {
    expect(
      adminContactLenientPatchSchema.safeParse({ phone: "" }).success
    ).toBe(false);
    expect(
      adminContactLenientPatchSchema.safeParse({
        id: "abc123",
        phone: "1".repeat(31),
      }).success
    ).toBe(false);
  });
});
