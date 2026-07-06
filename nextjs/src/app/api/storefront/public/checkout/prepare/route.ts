import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { CART_COOKIE, cartTotals, getOrCreateCart } from "@/lib/storefront/cart-service";
import { createCheckoutSessionWithReservations } from "@/lib/storefront/stock-reservation";
import { getPublicStorefrontContextFromHost } from "@/lib/storefront/public-host-context";
import { computeDiscountForCode } from "@/lib/storefront/storefront-discount-service";
import { resolveStorefrontShippingAmount } from "@/lib/storefront/storefront-shipping-service";
import { computeStorefrontTax } from "@/lib/storefront/storefront-tax-service";

export const dynamic = "force-dynamic";

/**
 * Day 22 / 26 / 31–33 — Lock cart + checkout session totals (server-side).
 */
export async function POST(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const ctx = await getPublicStorefrontContextFromHost(host);
  if (!ctx) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

  const cookieStore = await cookies();
  let cartId = cookieStore.get(CART_COOKIE)?.value ?? null;
  const cart = await getOrCreateCart({
    organizationId: ctx.organizationId,
    websiteId: ctx.websiteId,
    cartId,
    guestToken: null,
  });
  cartId = cart.id;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const shippingMethodKey = body?.shippingMethodKey != null ? String(body.shippingMethodKey) : "standard";
  const couponCode = body?.couponCode != null ? String(body.couponCode) : "";
  const shipCountry = body?.shippingCountry != null ? String(body.shippingCountry) : "US";
  const shipRegion = body?.shippingRegion != null ? String(body.shippingRegion) : "";

  if (!cart.lines.length) {
    return NextResponse.json({ ok: false, error: "Cart is empty" }, { status: 400 });
  }

  const lines = cart.lines.filter((l) => l.product);
  const subtotal = cartTotals(lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice }))).subtotal;
  const productIds = lines.map((l) => l.product!.id);

  const disc = await computeDiscountForCode({
    organizationId: ctx.organizationId,
    websiteId: ctx.websiteId,
    code: couponCode,
    subtotal,
    productIdsInCart: productIds,
  });
  const discountAmount = disc.amount;
  const discountCodeId = disc.codeRow?.id ?? null;

  const shippingAmount = await resolveStorefrontShippingAmount({
    organizationId: ctx.organizationId,
    websiteId: ctx.websiteId,
    country: shipCountry,
    shippingMethodKey,
  });

  const taxableBase = Math.max(0, subtotal - discountAmount);
  const tax = await computeStorefrontTax({
    organizationId: ctx.organizationId,
    websiteId: ctx.websiteId,
    country: shipCountry,
    region: shipRegion || null,
    taxableSubtotal: taxableBase,
  });
  const taxAmount = tax.taxTotal;

  const total = Math.max(0, taxableBase + shippingAmount + taxAmount);

  try {
    const { sessionId, expiresAt } = await createCheckoutSessionWithReservations({
      organizationId: ctx.organizationId,
      websiteId: ctx.websiteId,
      cartId,
      shippingMethodKey,
      shippingAmount,
      taxAmount,
      discountAmount,
      discountCodeId,
    });

    const res = NextResponse.json({
      ok: true,
      checkoutSessionId: sessionId,
      expiresAt: expiresAt.toISOString(),
      subtotal,
      shippingAmount,
      taxAmount,
      taxLines: tax.lines,
      discountAmount,
      total,
      currency: "USD",
      couponMessage: disc.reason,
    });
    res.cookies.set(CART_COOKIE, cartId, { path: "/", maxAge: 60 * 60 * 24 * 90, sameSite: "lax" });
    return res;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Prepare failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
