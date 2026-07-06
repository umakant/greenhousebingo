import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";

import { getMembershipPlan } from "@/lib/waterice/membership-plans";
import { resolveWaterIceStripe } from "@/lib/waterice/waterice-stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { slug?: unknown; customerEmail?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const plan = getMembershipPlan(body.slug);
  if (!plan) {
    return NextResponse.json({ ok: false, error: "Unknown membership plan." }, { status: 400 });
  }

  const amountCents = plan.priceCents;

  // Stripe credentials: storefront (phillywaterice → Payments) → platform → env.
  let cfg;
  try {
    cfg = await resolveWaterIceStripe(req.headers.get("host"));
  } catch {
    // Settings DB unavailable (local dev without a DB) — let the client use the mock flow.
    return NextResponse.json({ ok: true, mockPayment: true, total: plan.price });
  }

  if (!cfg || !cfg.enabled || !cfg.secretKey || !cfg.publishableKey) {
    return NextResponse.json({ ok: true, mockPayment: true, total: plan.price });
  }

  if (amountCents < 50) {
    return NextResponse.json(
      { ok: false, error: "Membership price is too small for card payment." },
      { status: 400 },
    );
  }

  try {
    const stripe = new Stripe(cfg.secretKey, { typescript: true });
    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      description: `Water Ice Express membership — ${plan.name}`,
      metadata: {
        source: "waterice_membership",
        membershipSlug: plan.slug,
        membershipName: plan.name,
        ...(typeof body.customerEmail === "string" && body.customerEmail.trim()
          ? { customerEmail: body.customerEmail.trim().slice(0, 200) }
          : {}),
      },
    });

    return NextResponse.json({
      ok: true,
      mockPayment: false,
      clientSecret: pi.client_secret,
      publishableKey: cfg.publishableKey,
      paymentIntentId: pi.id,
      amount: amountCents,
      total: plan.price,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start payment";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
