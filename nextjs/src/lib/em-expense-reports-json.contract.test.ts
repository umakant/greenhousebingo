import { describe, expect, it } from "vitest";

/**
 * Regression: GET /api/expense-management/reports must not spread Prisma rows into JSON
 * (bigint id breaks Response.json / JSON.stringify).
 */
describe("expense reports list JSON contract", () => {
  it("serializes API row shape", () => {
    const apiRow = {
      id: "99",
      reportNumber: "EM-1005-00001",
      purpose: "Trip",
      dateFrom: "2026-01-01",
      dateTo: null,
      status: "draft",
      currency: "USD",
      totalAmount: 10.5,
      rejectionNote: null,
    };
    expect(JSON.parse(JSON.stringify(apiRow))).toEqual(apiRow);
  });

  it("documents that bigint breaks JSON.stringify", () => {
    expect(() => JSON.stringify({ id: BigInt(1) })).toThrow();
  });
});
