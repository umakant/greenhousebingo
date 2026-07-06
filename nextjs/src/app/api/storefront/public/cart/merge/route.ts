import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { CART_COOKIE } from "@/lib/storefront/cart-service";
import { mergeGuestCartIntoCustomerCart } from "@/lib/storefront/cart-merge";
import { getPublicStorefrontContextFromHost } from "@/lib/storefront/public-host-context";
import { verifyStorefrontCustomerSessionToken } from "@/lib/storefront-customer-session";
import { STOREFRONT_CUSTOMER_SESSION_COOKIE } from "@/lib/storefront-customer-constants";

export const dynamic = "force-dynamic";

/** Day 25 — After B2C login, merge guest `sf_cart` into the customer cart. */
export async function POST(req: NextRequest) {
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const ctx = await getPublicStorefrontContextFromHost(host);
    if (!ctx) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

    const cookieStore = await cookies();
    const rawSfc = cookieStore.get(STOREFRONT_CUSTOMER_SESSION_COOKIE)?.value;
    const session = await verifyStorefrontCustomerSessionToken(rawSfc);
    if (!session) {
      return NextResponse.json({ ok: false, error: "Not signed in as a store customer" }, { status: 401 });
    }
    if (session.websiteId !== ctx.websiteId) {
      return NextResponse.json({ ok: false, error: "Wrong store session" }, { status: 403 });
    }

    const guestCartId = cookieStore.get(CART_COOKIE)?.value;
    if (!guestCartId) {
      return NextResponse.json({ ok: true, merged: false, message: "No guest cart" });
    }

    try {
      const { cartId } = await mergeGuestCartIntoCustomerCart({
        organizationId: ctx.organizationId,
        websiteId: ctx.websiteId,
        guestCartId,
        customerId: session.customerId,
      });
      const res = NextResponse.json({ ok: true, merged: true, cartId: String(cartId) });
      res.cookies.set(CART_COOKIE, String(cartId), {
        path: "/",
        maxAge: 60 * 60 * 24 * 90,
        sameSite: "lax",
      });
      return res;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Merge failed";
      return NextResponse.json({ ok: false, error: msg }, { status: 400 });
    }
  } catch (e) {
    console.error("[storefront/public/cart/merge] POST failed:", e);
    const message = e instanceof Error ? e.message : "Cart merge failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
