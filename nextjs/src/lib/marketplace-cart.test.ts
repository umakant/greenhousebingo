import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    marketplaceProduct: { findMany: vi.fn() },
    // getMarketplacePricingConfig reads this; default to no overrides.
    marketplaceConfig: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import { prisma } from "@/lib/prisma";
import { validateCart } from "@/lib/marketplace-cart";

const productFindMany = prisma.marketplaceProduct.findMany as unknown as Mock;

function product(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1n,
    vendorId: 7n,
    name: "Cherry Water Ice",
    price: 10,
    currency: "USD",
    bucketCountValue: 1,
    vendor: { name: "Water Ice Express" },
    ...over,
  };
}

describe("validateCart", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an empty cart", async () => {
    const res = await validateCart([]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(400);
  });

  it("only loads active products from active vendors (inactive hidden)", async () => {
    productFindMany.mockResolvedValue([]);
    const res = await validateCart([{ productId: "99", quantity: 1 }]);

    expect(productFindMany).toHaveBeenCalledTimes(1);
    const where = productFindMany.mock.calls[0][0].where;
    expect(where.isActive).toBe(true);
    expect(where.status).toBe("active");
    expect(where.vendor).toEqual({ status: "active" });

    // No active rows → unavailable.
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/no longer available/i);
  });

  it("computes subtotal and bucket count correctly", async () => {
    productFindMany.mockResolvedValue([
      product({ id: 1n, price: 10, bucketCountValue: 2 }),
      product({ id: 2n, price: 5, bucketCountValue: 1 }),
    ]);
    const res = await validateCart([
      { productId: "1", quantity: 2 },
      { productId: "2", quantity: 2 },
    ]);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.totals.subtotal).toBe(30); // 10*2 + 5*2
      expect(res.totals.totalBucketCount).toBe(6); // 2*2 + 1*2
    }
  });

  it("blocks checkout below the 6-bucket minimum", async () => {
    productFindMany.mockResolvedValue([product({ id: 1n, bucketCountValue: 1 })]);
    const res = await validateCart([{ productId: "1", quantity: 5 }]); // 5 buckets

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.totals.totalBucketCount).toBe(5);
      expect(res.meetsMinimum).toBe(false);
    }
  });

  it("allows checkout at exactly 6 buckets", async () => {
    productFindMany.mockResolvedValue([product({ id: 1n, bucketCountValue: 1 })]);
    const res = await validateCart([{ productId: "1", quantity: 6 }]); // 6 buckets

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.totals.totalBucketCount).toBe(6);
      expect(res.meetsMinimum).toBe(true);
    }
  });

  it("rejects carts spanning multiple vendors", async () => {
    productFindMany.mockResolvedValue([
      product({ id: 1n, vendorId: 7n }),
      product({ id: 2n, vendorId: 8n }),
    ]);
    const res = await validateCart([
      { productId: "1", quantity: 1 },
      { productId: "2", quantity: 1 },
    ]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toMatch(/one vendor/i);
  });
});
