import { describe, it, expect } from "vitest";
import { giftCardOrderSchema } from "./validations";

const base = {
  serviceId: "cmf0service12345",
  purchaserName: "דנה לוי",
  purchaserPhone: "050-1234567",
  recipientName: "נועה כהן",
  message: "מזל טוב!",
  template: "botanical",
};

describe("giftCardOrderSchema date/startTime pair refine", () => {
  it("accepts both present and both absent", () => {
    expect(
      giftCardOrderSchema.safeParse({
        ...base,
        date: "2026-09-15",
        startTime: "10:00",
      }).success
    ).toBe(true);
    expect(giftCardOrderSchema.safeParse(base).success).toBe(true);
  });

  it("rejects date without startTime", () => {
    expect(
      giftCardOrderSchema.safeParse({ ...base, date: "2026-09-15" }).success
    ).toBe(false);
  });

  it("rejects startTime without date", () => {
    expect(
      giftCardOrderSchema.safeParse({ ...base, startTime: "10:00" }).success
    ).toBe(false);
  });
});
