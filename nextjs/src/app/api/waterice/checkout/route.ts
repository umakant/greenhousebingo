import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";

import { sanitizeItems, computeTotal } from "@/lib/waterice/checkout-pricing";
import { resolveWaterIceStripe } from "@/lib/waterice/waterice-stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { items?: unknown; promoApplied?: unknown; customerEmail?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const items = sanitizeItems(body.items);
  if (items.length === 0) {
    return NextResponse.json({ ok: false, error: "Cart is empty" }, { status: 400 });
  }

  const promoApplied = body.promoApplied === true;
  const { total } = computeTotal(items, promoApplied);
  const amountCents = Math.round(total * 100);

  // Stripe credentials: storefront (phillywaterice → Payments) → platform → env.
  let cfg;
  try {
    cfg = await resolveWaterIceStripe(req.headers.get("host"));
  } catch {
    // Settings DB unavailable (e.g. local dev without a DB) — fall back to mock checkout.
    return NextResponse.json({ ok: true, mockPayment: true, total });
  }

  // If Stripe isn't configured/enabled anywhere, let the client use the mock flow.
  if (!cfg || !cfg.enabled || !cfg.secretKey || !cfg.publishableKey) {
    return NextResponse.json({ ok: true, mockPayment: true, total });
  }
  const { secretKey, publishableKey } = cfg;

  if (amountCents < 50) {
    return NextResponse.json(
      { ok: false, error: "Order total is too small for card payment." },
      { status: 400 },
    );
  }

  try {
    const stripe = new Stripe(secretKey, { typescript: true });
    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      description: "Water Ice Express order",
      metadata: {
        source: "waterice",
        itemCount: String(items.reduce((s, i) => s + i.qty, 0)),
        ...(typeof body.customerEmail === "string" && body.customerEmail.trim()
          ? { customerEmail: body.customerEmail.trim().slice(0, 200) }
          : {}),
      },
    });

    return NextResponse.json({
      ok: true,
      mockPayment: false,
      clientSecret: pi.client_secret,
      publishableKey,
      paymentIntentId: pi.id,
      amount: amountCents,
      total,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start payment";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
