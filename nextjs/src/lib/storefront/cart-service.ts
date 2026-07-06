import type { PosProduct } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { parsePosProductVariants } from "@/lib/storefront/bundle-catalog";
import { storefrontProductPublicLiveWhere } from "@/lib/storefront/storefront-product-public-visibility";
import { parseInventoryPolicy, canSellQty } from "@/lib/storefront/inventory-storefront";

const CART_COOKIE = "sf_cart_id";

export { CART_COOKIE };

/** Day 24 — variant price when `variants` JSON includes `{ id, price }`. */
export function resolveVariantUnitPrice(product: PosProduct, variantKey: string): number {
  const base = Number(product.price);
  if (!variantKey.trim()) return base;
  const raw = product.variants;
  if (!raw || !Array.isArray(raw)) return base;
  for (const v of raw as Array<{ id?: string; sku?: string; price?: number }>) {
    const id = String(v.id ?? v.sku ?? "");
    if (id === variantKey && typeof v.price === "number") return v.price;
  }
  return base;
}

/**
 * Stable `variant_key` for cart merge. Themes may send `""`, Liquid default `"1"`, or stale Shopify ids
 * for the same single-variant SKU — without this, `addCartLine` creates duplicate rows.
 */
export function canonicalVariantKeyForCartProduct(
  product: Pick<PosProduct, "variants">,
  variantKey: string,
): string {
  const raw = (variantKey ?? "").trim();
  const rows = parsePosProductVariants(product.variants);
  if (rows.length === 0) return "";
  if (rows.length === 1) {
    return String(rows[0]!.id ?? "").trim() || "";
  }
  if (!raw) return "";
  const hit = rows.find((r) => r.id === raw);
  return hit && hit.id ? String(hit.id) : raw;
}

export function resolveVariantStock(product: PosProduct, variantKey: string): number {
  if (!variantKey.trim()) return product.stock;
  const raw = product.variants;
  if (!raw || !Array.isArray(raw)) return product.stock;
  for (const v of raw as Array<{ id?: string; sku?: string; stock?: number }>) {
    const id = String(v.id ?? v.sku ?? "");
    if (id === variantKey) {
      if (typeof v.stock === "number" && Number.isFinite(v.stock)) return v.stock;
      return product.stock;
    }
  }
  return product.stock;
}

export async function getOrCreateCart(params: {
  organizationId: bigint;
  websiteId: bigint;
  cartId: string | null;
  guestToken: string | null;
}) {
  const { organizationId, websiteId, cartId, guestToken } = params;
  if (cartId) {
    const existing = await prisma.storefrontCart.findFirst({
      where: { id: cartId, organizationId, websiteId },
      include: {
        lines: { include: { product: { include: { category: true, brand: true } } } },
      },
    });
    if (existing) return existing;
  }
  return prisma.storefrontCart.create({
    data: {
      organizationId,
      websiteId,
      guestToken: guestToken ?? undefined,
    },
    include: {
      lines: { include: { product: { include: { category: true, brand: true } } } },
    },
  });
}

export async function addCartLine(params: {
  cartId: string;
  organizationId: bigint;
  productId: bigint;
  variantKey: string;
  quantity: number;
}) {
  const { cartId, organizationId, productId, variantKey, quantity } = params;
  if (quantity < 1) throw new Error("Invalid quantity");

  const product = await prisma.posProduct.findFirst({
    where: { id: productId, organizationId, ...storefrontProductPublicLiveWhere() },
  });
  if (!product) throw new Error("Product not available");
  const vk = canonicalVariantKeyForCartProduct(product, variantKey);
  const effectiveStock = resolveVariantStock(product, vk);
  const policy = parseInventoryPolicy(product.inventoryPolicy);
  if (!canSellQty(effectiveStock, quantity, policy)) throw new Error("Not enough stock");

  const unit = resolveVariantUnitPrice(product, vk);

  const sameProductLines = await prisma.storefrontCartLine.findMany({
    where: { cartId, productId },
    orderBy: { id: "asc" },
  });
  const existing = sameProductLines.find(
    (row) => canonicalVariantKeyForCartProduct(product, row.variantKey) === vk,
  );
  if (existing) {
    const nextQty = existing.quantity + quantity;
    if (!canSellQty(effectiveStock, nextQty, policy)) throw new Error("Not enough stock");
    return prisma.storefrontCartLine.update({
      where: { id: existing.id },
      data: { quantity: nextQty, unitPrice: unit, variantKey: vk },
      include: { product: true },
    });
  }

  return prisma.storefrontCartLine.create({
    data: {
      cartId,
      productId,
      variantKey: vk,
      quantity,
      unitPrice: unit,
    },
    include: { product: true },
  });
}

export async function setCartLineQuantity(cartId: string, lineId: bigint, quantity: number) {
  if (quantity < 1) {
    await prisma.storefrontCartLine.deleteMany({ where: { id: lineId, cartId } });
    return null;
  }
  const line = await prisma.storefrontCartLine.findFirst({
    where: { id: lineId, cartId },
    include: { product: true },
  });
  if (!line?.product) throw new Error("Line not found");
  const vk = canonicalVariantKeyForCartProduct(line.product, line.variantKey);
  const effectiveStock = resolveVariantStock(line.product, vk);
  const policy = parseInventoryPolicy(line.product.inventoryPolicy);
  if (!canSellQty(effectiveStock, quantity, policy)) throw new Error("Not enough stock");
  return prisma.storefrontCartLine.update({
    where: { id: lineId },
    data: { quantity, variantKey: vk },
    include: { product: true },
  });
}

/**
 * Merges rows that share the same product + canonical variant (e.g. legacy `""` vs `"1"` keys).
 */
export async function consolidateStorefrontCartLines(cartId: string): Promise<void> {
  const lines = await prisma.storefrontCartLine.findMany({
    where: { cartId },
    include: { product: true },
    orderBy: { id: "asc" },
  });
  const groups = new Map<string, typeof lines>();
  for (const line of lines) {
    if (!line.product) continue;
    const canon = canonicalVariantKeyForCartProduct(line.product, line.variantKey);
    const k = `${line.productId.toString()}:${canon}`;
    const arr = groups.get(k);
    if (arr) arr.push(line);
    else groups.set(k, [line]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const keep = group[0]!;
    const product = keep.product!;
    const vk = canonicalVariantKeyForCartProduct(product, keep.variantKey);
    const totalQty = group.reduce((s, l) => s + l.quantity, 0);
    const unit = resolveVariantUnitPrice(product, vk);
    const idsToRemove = group.slice(1).map((l) => l.id);
    await prisma.$transaction([
      prisma.storefrontCartLine.deleteMany({ where: { id: { in: idsToRemove }, cartId } }),
      prisma.storefrontCartLine.update({
        where: { id: keep.id },
        data: { quantity: totalQty, variantKey: vk, unitPrice: unit },
      }),
    ]);
  }
}

export function cartTotals(lines: { quantity: number; unitPrice: { toString(): string } }[]) {
  let sub = 0;
  for (const l of lines) {
    sub += l.quantity * Number(l.unitPrice.toString());
  }
  return { subtotal: sub, total: sub };
}

export async function removeCartLine(params: {
  cartId: string;
  lineId: bigint;
  organizationId: bigint;
  websiteId: bigint;
}): Promise<void> {
  const n = await prisma.storefrontCartLine.deleteMany({
    where: {
      id: params.lineId,
      cartId: params.cartId,
      cart: { organizationId: params.organizationId, websiteId: params.websiteId },
    },
  });
  if (n.count === 0) throw new Error("Line not found");
}
