import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import {
  computePlantBingoTotals,
  getPlantBingoPricing,
} from "@/lib/company-themes/company-site-plant-bingo-checkout";
import { resolveCompanySiteStripe } from "@/lib/company-themes/company-site-stripe";
import { findCompanyOwnerIdByPublicSlug } from "@/lib/company-themes/company-website-host-resolver";
import { isCompanyWebsiteAccessBlocked } from "@/lib/company-themes/company-website-password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  customerEmail: z.string().trim().email().max(320).optional(),
  tickets: z.number().int().min(1).max(20),
  extraCards: z.number().int().min(0).max(100).default(0),
});

type Ctx = { params: Promise<{ companySlug: string; eventSlug: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { companySlug, eventSlug } = await params;
  const ownerId = await findCompanyOwnerIdByPublicSlug(companySlug);
  if (!ownerId) {
    return NextResponse.json({ ok: false, message: "Company site not found." }, { status: 404 });
  }

  if (await isCompanyWebsiteAccessBlocked(ownerId, companySlug, req)) {
    return NextResponse.json({ ok: false, message: "Password required." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const pricing = await getPlantBingoPricing(ownerId, eventSlug);
  if (!pricing) {
    return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
  }
  if (pricing.soldOut) {
    return NextResponse.json({ ok: false, message: "This event is sold out." }, { status: 400 });
  }
  if (parsed.data.tickets > pricing.seatsLeft) {
    return NextResponse.json(
      { ok: false, message: `Only ${pricing.seatsLeft} tickets remaining.` },
      { status: 400 },
    );
  }

  const totals = computePlantBingoTotals({
    tickets: parsed.data.tickets,
    extraCards: parsed.data.extraCards,
    ticketPrice: pricing.ticketPrice,
    extraCardPrice: pricing.extraCardPrice,
    cardFeePercent: pricing.cardFeePercent,
  });
  const amountCents = Math.round(totals.total * 100);
  const allowMockPayment = process.env.NODE_ENV !== "production";
  const paymentsNotConfigured = NextResponse.json(
    { ok: false, message: "Payments are not configured." },
    { status: 503 },
  );

  let cfg;
  try {
    cfg = await resolveCompanySiteStripe(ownerId);
  } catch {
    return allowMockPayment
      ? NextResponse.json({ ok: true, mockPayment: true, ...totals })
      : paymentsNotConfigured;
  }

  if (!cfg.enabled || !cfg.secretKey || !cfg.publishableKey) {
    return allowMockPayment
      ? NextResponse.json({ ok: true, mockPayment: true, ...totals })
      : paymentsNotConfigured;
  }

  if (amountCents < 50 && amountCents > 0) {
    return NextResponse.json({ ok: false, message: "Order total is too small for card payment." }, { status: 400 });
  }

  // Free events: skip Stripe and return mock/succeed path.
  if (amountCents === 0) {
    return NextResponse.json({ ok: true, mockPayment: true, ...totals });
  }

  try {
    const stripe = new Stripe(cfg.secretKey, { typescript: true });
    const customerEmail = parsed.data.customerEmail?.trim();
    const idempotencyKey = `pb_${ownerId}_${pricing.eventId}_${parsed.data.tickets}_${parsed.data.extraCards}_${amountCents}`;

    const pi = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        description: `Plant Bingo — ${pricing.title}`,
        metadata: {
          source: "plant_bingo_checkout",
          companySlug,
          ownerId: ownerId.toString(),
          eventId: pricing.eventId,
          eventSlug: pricing.slug,
          tickets: String(parsed.data.tickets),
          extraCards: String(parsed.data.extraCards),
          ...(customerEmail ? { customerEmail: customerEmail.slice(0, 200) } : {}),
        },
      },
      { idempotencyKey },
    );

    return NextResponse.json({
      ok: true,
      mockPayment: false,
      clientSecret: pi.client_secret,
      publishableKey: cfg.publishableKey,
      paymentIntentId: pi.id,
      amount: amountCents,
      ...totals,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start payment";
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
