import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { CART_COOKIE, cartTotals, getOrCreateCart } from "@/lib/storefront/cart-service";
import { computeDiscountForCode } from "@/lib/storefront/storefront-discount-service";
import { resolveStorefrontShippingAmount } from "@/lib/storefront/storefront-shipping-service";
import { computeStorefrontTax } from "@/lib/storefront/storefront-tax-service";
import { getPublicStorefrontContextFromHost } from "@/lib/storefront/public-host-context";

export const dynamic = "force-dynamic";

/**
 * Day 27 / 31–33 — Authoritative totals: cart + DB shipping + tax rules + discount codes.
 */
export async function POST(req: NextRequest) {
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const ctx = await getPublicStorefrontContextFromHost(host);
    if (!ctx) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

    const cookieStore = await cookies();
    const cartId = cookieStore.get(CART_COOKIE)?.value ?? null;
    const cart = await getOrCreateCart({
      organizationId: ctx.organizationId,
      websiteId: ctx.websiteId,
      cartId,
      guestToken: null,
    });

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const shippingMethodKey = body?.shippingMethodKey != null ? String(body.shippingMethodKey) : "standard";
    const couponCode = body?.couponCode != null ? String(body.couponCode) : "";
    const shipCountry = body?.shippingCountry != null ? String(body.shippingCountry) : "US";
    const shipRegion = body?.shippingRegion != null ? String(body.shippingRegion) : "";

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

    const total = Math.max(0, taxableBase + shippingAmount + tax.taxTotal);

    const res = NextResponse.json({
      ok: true,
      currency: "USD",
      subtotal,
      shippingAmount,
      shippingMethodKey,
      taxAmount: tax.taxTotal,
      taxLines: tax.lines,
      taxMode: tax.mode,
      discountAmount,
      couponMessage: disc.reason,
      couponApplied: Boolean(disc.codeRow),
      total,
      lineCount: lines.length,
    });
    if (!cartId || cartId !== cart.id) {
      res.cookies.set(CART_COOKIE, String(cart.id), { path: "/", maxAge: 60 * 60 * 24 * 90, sameSite: "lax" });
    }
    return res;
  } catch (e) {
    console.error("[storefront/public/checkout/quote] POST failed:", e);
    const message = e instanceof Error ? e.message : "Failed to quote checkout.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
