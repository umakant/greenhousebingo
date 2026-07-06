import { prisma } from "@/lib/prisma";
import { resolveVariantStock } from "@/lib/storefront/cart-service";

const DEFAULT_TTL_MS = 15 * 60 * 1000;

/** Sum of non-expired reservation quantities for a product/variant (Day 22). */
export async function sumActiveReservations(
  organizationId: bigint,
  productId: bigint,
  variantKey: string,
): Promise<number> {
  const now = new Date();
  const agg = await prisma.storefrontStockReservation.aggregate({
    where: {
      organizationId,
      productId,
      variantKey,
      expiresAt: { gt: now },
    },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

export async function getEffectiveAvailableStock(
  organizationId: bigint,
  productId: bigint,
  variantKey: string,
  physicalStock: number,
): Promise<number> {
  const reserved = await sumActiveReservations(organizationId, productId, variantKey);
  return Math.max(0, physicalStock - reserved);
}

/** Remove expired rows (call from checkout prepare or a cron). */
export async function deleteExpiredStockReservations(): Promise<number> {
  const r = await prisma.storefrontStockReservation.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  return r.count;
}

export async function releaseReservationsForCart(cartId: string): Promise<void> {
  await prisma.storefrontStockReservation.deleteMany({ where: { cartId } });
}

export async function releaseReservationsForCheckoutSession(checkoutSessionId: string): Promise<void> {
  await prisma.storefrontStockReservation.deleteMany({ where: { checkoutSessionId } });
}

/**
 * Creates checkout session + per-line stock holds. Fails if not enough stock after other holds.
 */
export async function createCheckoutSessionWithReservations(params: {
  organizationId: bigint;
  websiteId: bigint;
  cartId: string;
  shippingMethodKey?: string | null;
  shippingAmount?: number;
  taxAmount?: number;
  discountAmount?: number;
  discountCodeId?: bigint | null;
  ttlMs?: number;
}): Promise<{ sessionId: string; expiresAt: Date }> {
  await deleteExpiredStockReservations();

  const cart = await prisma.storefrontCart.findFirst({
    where: {
      id: params.cartId,
      organizationId: params.organizationId,
      websiteId: params.websiteId,
    },
    include: { lines: { include: { product: true } } },
  });
  if (!cart?.lines.length) throw new Error("Cart is empty");

  const ttl = params.ttlMs ?? DEFAULT_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl);

  await releaseReservationsForCart(params.cartId);

  const session = await prisma.$transaction(async (tx) => {
    const s = await tx.storefrontCheckoutSession.create({
      data: {
        organizationId: params.organizationId,
        websiteId: params.websiteId,
        cartId: params.cartId,
        status: "open",
        expiresAt,
        shippingMethodKey: params.shippingMethodKey ?? null,
        shippingAmount: params.shippingAmount ?? 0,
        taxAmount: params.taxAmount ?? 0,
        discountAmount: params.discountAmount ?? 0,
        discountCodeId: params.discountCodeId ?? undefined,
      },
    });

    for (const line of cart.lines) {
      const p = line.product;
      if (!p) continue;
      const vk = line.variantKey || "";
      const reservedElsewhere = await tx.storefrontStockReservation.aggregate({
        where: {
          organizationId: params.organizationId,
          productId: p.id,
          variantKey: vk,
          expiresAt: { gt: new Date() },
        },
        _sum: { quantity: true },
      });
      const held = reservedElsewhere._sum.quantity ?? 0;
      const available = resolveVariantStock(p, vk);
      if (available < held + line.quantity) {
        throw new Error(`Not enough stock for ${p.name}`);
      }
      await tx.storefrontStockReservation.create({
        data: {
          organizationId: params.organizationId,
          productId: p.id,
          variantKey: vk,
          quantity: line.quantity,
          cartId: params.cartId,
          checkoutSessionId: s.id,
          expiresAt,
        },
      });
    }


    return s;
  });

  return { sessionId: session.id, expiresAt: session.expiresAt };
}
