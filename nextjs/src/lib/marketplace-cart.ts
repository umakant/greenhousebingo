import "server-only";

import {
  computeTotals,
  getMarketplacePricingConfig,
  type MarketplacePricingConfig,
  type MarketplaceTotals,
  type PriceableItem,
} from "@/lib/marketplace-pricing";
import { prisma } from "@/lib/prisma";

export type IncomingCartItem = { productId?: unknown; quantity?: unknown };

export type ValidatedLine = {
  productId: bigint;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  bucketCountValue: number;
  currency: string;
};

export type CartValidation =
  | {
      ok: false;
      status: number;
      message: string;
    }
  | {
      ok: true;
      vendorId: bigint;
      vendorName: string;
      currency: string;
      lines: ValidatedLine[];
      totals: MarketplaceTotals;
      pricing: MarketplacePricingConfig;
      meetsMinimum: boolean;
    };

/**
 * Loads the requested products, enforces single active vendor, computes totals,
 * and reports whether the bucket minimum is met. Shared by cart/validate and
 * checkout so both apply identical rules.
 */
export async function validateCart(rawItems: IncomingCartItem[]): Promise<CartValidation> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { ok: false, status: 400, message: "Your cart is empty." };
  }

  const qtyById = new Map<string, number>();
  const productIds: bigint[] = [];
  for (const it of rawItems) {
    let pid: bigint;
    try {
      pid = BigInt(String(it.productId));
    } catch {
      continue;
    }
    const qty = Math.max(1, Math.floor(Number(it.quantity ?? 1)) || 1);
    qtyById.set(pid.toString(), qty);
    productIds.push(pid);
  }
  if (productIds.length === 0) {
    return { ok: false, status: 400, message: "No valid items in cart." };
  }

  const products = await prisma.marketplaceProduct.findMany({
    where: { id: { in: productIds }, isActive: true, status: "active", vendor: { status: "active" } },
    select: {
      id: true,
      vendorId: true,
      name: true,
      price: true,
      currency: true,
      bucketCountValue: true,
      vendor: { select: { name: true } },
    },
  });
  if (products.length === 0) {
    return { ok: false, status: 400, message: "These items are no longer available." };
  }

  const vendorIds = new Set(products.map((p) => p.vendorId.toString()));
  if (vendorIds.size > 1) {
    return { ok: false, status: 400, message: "Please order from one vendor at a time." };
  }

  const vendorId = products[0].vendorId;
  const vendorName = products[0].vendor?.name ?? "";
  const currency = products[0].currency || "USD";

  const lines: ValidatedLine[] = products.map((p) => {
    const quantity = qtyById.get(p.id.toString()) ?? 1;
    const unitPrice = Number(p.price);
    return {
      productId: p.id,
      name: p.name,
      quantity,
      unitPrice,
      totalPrice: Math.round(unitPrice * quantity * 100) / 100,
      bucketCountValue: p.bucketCountValue ?? 0,
      currency,
    };
  });

  const pricing = await getMarketplacePricingConfig();
  const priceable: PriceableItem[] = lines.map((l) => ({
    unitPrice: l.unitPrice,
    quantity: l.quantity,
    bucketCountValue: l.bucketCountValue,
  }));
  const totals = computeTotals(priceable, pricing);

  return {
    ok: true,
    vendorId,
    vendorName,
    currency,
    lines,
    totals,
    pricing,
    meetsMinimum: totals.totalBucketCount >= pricing.minBuckets,
  };
}
