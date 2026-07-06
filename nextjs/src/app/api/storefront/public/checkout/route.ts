import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSettingsForOwner } from "@/lib/settings-service";
import { CART_COOKIE } from "@/lib/storefront/cart-service";
import { createStorefrontOrderFromCart } from "@/lib/storefront/checkout-order-service";
import { getPublicStorefrontContextFromHost } from "@/lib/storefront/public-host-context";
import { getStorefrontStripeForCheckout } from "@/lib/storefront/stripe-storefront";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const ctx = await getPublicStorefrontContextFromHost(host);
  if (!ctx) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

  const cookieStore = await cookies();
  const cartId = cookieStore.get(CART_COOKIE)?.value;
  if (!cartId) return NextResponse.json({ ok: false, error: "No cart" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const customerEmail = body?.customerEmail != null ? String(body.customerEmail).trim() : "";
  const customerFirstName = body?.customerFirstName != null ? String(body.customerFirstName).trim() : "";
  const customerLastName = body?.customerLastName != null ? String(body.customerLastName).trim() : "";
  const legacyCustomerName = body?.customerName != null ? String(body.customerName).trim() : "";
  let customerName: string;
  if (customerFirstName && customerLastName) {
    customerName = `${customerFirstName} ${customerLastName}`.trim();
  } else if (legacyCustomerName) {
    customerName = legacyCustomerName;
  } else if (customerFirstName || customerLastName) {
    return NextResponse.json(
      { ok: false, error: "First name and last name are required" },
      { status: 400 },
    );
  } else {
    return NextResponse.json({ ok: false, error: "Name required" }, { status: 400 });
  }
  const shippingAddress = body?.shippingAddress;
  const billingAddress = body?.billingAddress;
  const checkoutSessionId =
    body?.checkoutSessionId != null && String(body.checkoutSessionId).trim() !== ""
      ? String(body.checkoutSessionId).trim()
      : null;

  if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return NextResponse.json({ ok: false, error: "Valid email required" }, { status: 400 });
  }
  if (!shippingAddress || typeof shippingAddress !== "object") {
    return NextResponse.json({ ok: false, error: "shippingAddress required" }, { status: 400 });
  }

  try {
    const order = await createStorefrontOrderFromCart({
      cartId,
      organizationId: ctx.organizationId,
      websiteId: ctx.websiteId,
      customerEmail,
      customerName: customerName.trim() || null,
      shippingAddress: shippingAddress as object,
      billingAddress: billingAddress && typeof billingAddress === "object" ? (billingAddress as object) : null,
      checkoutSessionId,
    });

    const ownerSettings = await getSettingsForOwner(ctx.organizationId);
    const stripe = getStorefrontStripeForCheckout(ownerSettings);
    const stripeMode =
      (ownerSettings.sf_stripe_mode ?? "").trim().toLowerCase() === "live" ? "live" : "sandbox";
    let clientSecret: string | null = null;
    let paymentIntentId: string | null = null;

    if (stripe) {
      const amountCents = Math.round(Number(order.total) * 100);
      if (amountCents < 50) {
        return NextResponse.json({ ok: false, error: "Order total too small for card payment" }, { status: 400 });
      }
      const pi = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: (order.currency || "usd").toLowerCase(),
          metadata: {
            orderId: order.id.toString(),
            organizationId: ctx.organizationId.toString(),
            websiteId: ctx.websiteId.toString(),
            source: "storefront",
            stripeMode,
          },
          automatic_payment_methods: { enabled: true },
        },
        { idempotencyKey: `sf-order-${order.id}` },
      );
      clientSecret = pi.client_secret;
      paymentIntentId = pi.id;
      await prisma.storefrontOrder.update({
        where: { id: order.id },
        data: { stripePaymentIntentId: pi.id },
      });
    }

    const res = NextResponse.json({
      ok: true,
      orderId: order.id.toString(),
      orderNumber: order.orderNumber,
      total: Number(order.total),
      currency: order.currency,
      mockPayment: !stripe,
      clientSecret,
      paymentIntentId,
    });
    res.cookies.set(CART_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Checkout failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
