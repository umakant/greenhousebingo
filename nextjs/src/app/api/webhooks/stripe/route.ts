import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { markStorefrontOrderPaid, markStorefrontOrderPaymentFailed } from "@/lib/storefront/checkout-order-service";
import { getStorefrontStripe, storefrontStripeWebhookSecret } from "@/lib/storefront/stripe-storefront";

export const dynamic = "force-dynamic";

/**
 * Day 28 — Storefront PaymentIntent webhooks (metadata.orderId + metadata.organizationId).
 * Configure endpoint in Stripe Dashboard; use STRIPE_WEBHOOK_SECRET from `stripe listen` or dashboard.
 */
export async function POST(req: NextRequest) {
  const stripe = getStorefrontStripe();
  const secret = storefrontStripeWebhookSecret();
  if (!stripe || !secret) {
    return NextResponse.json({ ok: false, error: "Stripe webhook not configured" }, { status: 501 });
  }

  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const handledSources = new Set(["storefront", "waterice"]);

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    if (!handledSources.has(pi.metadata?.source ?? "")) {
      return NextResponse.json({ received: true, ignored: true });
    }
    const orderId = pi.metadata?.orderId;
    const orgId = pi.metadata?.organizationId;
    if (!orderId || !orgId) return NextResponse.json({ received: true, ignored: true });
    try {
      await markStorefrontOrderPaid({
        orderId: BigInt(orderId),
        organizationId: BigInt(orgId),
        paymentSource: "stripe",
        stripePaymentIntentId: pi.id,
      });
    } catch {
      /* already paid or missing order */
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    if (!handledSources.has(pi.metadata?.source ?? "")) {
      return NextResponse.json({ received: true, ignored: true });
    }
    const orderId = pi.metadata?.orderId;
    const orgId = pi.metadata?.organizationId;
    if (!orderId || !orgId) return NextResponse.json({ received: true, ignored: true });
    const msg = pi.last_payment_error?.message ?? undefined;
    try {
      await markStorefrontOrderPaymentFailed({
        orderId: BigInt(orderId),
        organizationId: BigInt(orgId),
        stripePaymentIntentId: pi.id,
        message: msg,
      });
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({ received: true });
}
