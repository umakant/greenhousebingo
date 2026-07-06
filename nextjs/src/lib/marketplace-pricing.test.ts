import { afterEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    marketplaceConfig: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_MARKETPLACE_PRICING,
  computeTotals,
  getMarketplacePricingConfig,
} from "@/lib/marketplace-pricing";

const configFindMany = prisma.marketplaceConfig.findMany as unknown as Mock;

const cfg = { taxRate: 0.08, deliveryFee: 25, minBuckets: 6 };

describe("computeTotals (cart math)", () => {
  it("sums subtotal and bucket count across quantities", () => {
    const totals = computeTotals(
      [
        { unitPrice: 10, quantity: 2, bucketCountValue: 3 }, // 20 / 6 buckets
        { unitPrice: 5.5, quantity: 4, bucketCountValue: 1 }, // 22 / 4 buckets
      ],
      cfg,
    );
    expect(totals.subtotal).toBe(42);
    expect(totals.totalBucketCount).toBe(10);
  });

  it("applies tax to the subtotal and a flat delivery fee", () => {
    const totals = computeTotals([{ unitPrice: 10, quantity: 2, bucketCountValue: 3 }], cfg);
    expect(totals.subtotal).toBe(20);
    expect(totals.tax).toBeCloseTo(1.6, 2);
    expect(totals.deliveryFee).toBe(25);
    expect(totals.total).toBeCloseTo(46.6, 2);
  });

  it("does not charge a delivery fee for an empty/zero cart", () => {
    const totals = computeTotals([], cfg);
    expect(totals.subtotal).toBe(0);
    expect(totals.deliveryFee).toBe(0);
    expect(totals.total).toBe(0);
    expect(totals.totalBucketCount).toBe(0);
  });

  it("floors fractional/negative quantities and bucket values", () => {
    const totals = computeTotals(
      [{ unitPrice: 10, quantity: 2.9, bucketCountValue: 3.9 }],
      cfg,
    );
    expect(totals.subtotal).toBe(20); // qty floored to 2
    expect(totals.totalBucketCount).toBe(6); // bucket floored to 3, ×2
  });

  it("rounds money to cents", () => {
    const totals = computeTotals(
      [{ unitPrice: 3.333, quantity: 3, bucketCountValue: 1 }],
      cfg,
    );
    expect(totals.subtotal).toBe(10); // 9.999 → 10
  });
});

describe("getMarketplacePricingConfig", () => {
  afterEach(() => vi.clearAllMocks());

  it("reads overrides from MarketplaceConfig", async () => {
    configFindMany.mockResolvedValue([
      { key: "marketplace_tax_rate", value: "0.05" },
      { key: "marketplace_delivery_fee", value: "30" },
      { key: "marketplace_min_buckets", value: "6" },
    ]);
    const out = await getMarketplacePricingConfig();
    expect(out).toEqual({ taxRate: 0.05, deliveryFee: 30, minBuckets: 6 });
  });

  it("falls back to defaults when config rows are missing", async () => {
    configFindMany.mockResolvedValue([]);
    const out = await getMarketplacePricingConfig();
    expect(out).toEqual(DEFAULT_MARKETPLACE_PRICING);
  });

  it("falls back to defaults when the query throws", async () => {
    configFindMany.mockRejectedValue(new Error("db down"));
    const out = await getMarketplacePricingConfig();
    expect(out).toEqual(DEFAULT_MARKETPLACE_PRICING);
  });
});
