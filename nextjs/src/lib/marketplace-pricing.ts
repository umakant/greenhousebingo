import "server-only";

import { prisma } from "@/lib/prisma";

/** MarketplaceConfig keys for the company-facing storefront pricing rules. */
export const MARKETPLACE_TAX_RATE_KEY = "marketplace_tax_rate";
export const MARKETPLACE_DELIVERY_FEE_KEY = "marketplace_delivery_fee";
export const MARKETPLACE_MIN_BUCKETS_KEY = "marketplace_min_buckets";

export const DEFAULT_MARKETPLACE_PRICING = {
  /** Fractional tax rate applied to the subtotal (0.08 = 8%). */
  taxRate: 0.08,
  /** Flat delivery fee added to every order. */
  deliveryFee: 25,
  /** Per-order minimum bucket count required to check out. */
  minBuckets: 6,
};

export type MarketplacePricingConfig = typeof DEFAULT_MARKETPLACE_PRICING;

function toFiniteNumber(value: string | null | undefined, fallback: number): number {
  if (value == null) return fallback;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : fallback;
}

/** Reads tax/delivery/min config from MarketplaceConfig, falling back to defaults. */
export async function getMarketplacePricingConfig(): Promise<MarketplacePricingConfig> {
  try {
    const rows = await prisma.marketplaceConfig.findMany({
      where: { key: { in: [MARKETPLACE_TAX_RATE_KEY, MARKETPLACE_DELIVERY_FEE_KEY, MARKETPLACE_MIN_BUCKETS_KEY] } },
      select: { key: true, value: true },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value] as const));
    return {
      taxRate: toFiniteNumber(byKey.get(MARKETPLACE_TAX_RATE_KEY), DEFAULT_MARKETPLACE_PRICING.taxRate),
      deliveryFee: toFiniteNumber(byKey.get(MARKETPLACE_DELIVERY_FEE_KEY), DEFAULT_MARKETPLACE_PRICING.deliveryFee),
      minBuckets: Math.max(
        0,
        Math.floor(toFiniteNumber(byKey.get(MARKETPLACE_MIN_BUCKETS_KEY), DEFAULT_MARKETPLACE_PRICING.minBuckets)),
      ),
    };
  } catch {
    return { ...DEFAULT_MARKETPLACE_PRICING };
  }
}

export type PriceableItem = {
  unitPrice: number;
  quantity: number;
  bucketCountValue: number;
};

export type MarketplaceTotals = {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  totalBucketCount: number;
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Computes subtotal, tax, delivery fee, total, and total bucket count for a set of items. */
export function computeTotals(items: PriceableItem[], cfg: MarketplacePricingConfig): MarketplaceTotals {
  let subtotal = 0;
  let totalBucketCount = 0;
  for (const it of items) {
    const qty = Math.max(0, Math.floor(it.quantity || 0));
    subtotal += (Number(it.unitPrice) || 0) * qty;
    totalBucketCount += (Math.max(0, Math.floor(it.bucketCountValue || 0))) * qty;
  }
  subtotal = round2(subtotal);
  const tax = round2(subtotal * cfg.taxRate);
  // Delivery fee only applies when there is something to deliver.
  const deliveryFee = subtotal > 0 ? round2(cfg.deliveryFee) : 0;
  const total = round2(subtotal + tax + deliveryFee);
  return { subtotal, tax, deliveryFee, total, totalBucketCount };
}
