import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import {
  completePlantBingoCheckout,
  computePlantBingoTotals,
  getPlantBingoPricing,
} from "@/lib/company-themes/company-site-plant-bingo-checkout";
import { resolveCompanySiteStripe } from "@/lib/company-themes/company-site-stripe";
import { findCompanyOwnerIdByPublicSlug } from "@/lib/company-themes/company-website-host-resolver";
import { isCompanyWebsiteAccessBlocked } from "@/lib/company-themes/company-website-password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  paymentIntentId: z.string().trim().max(120).optional(),
  customer: z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(320),
    phone: z.string().trim().max(40).optional(),
  }),
  tickets: z.number().int().min(1).max(20),
  extraCards: z.number().int().min(0).max(100).default(0),
  takeHomePlantIds: z.array(z.string().trim().min(1)).min(1).max(20),
  winningPlantIds: z.array(z.string().trim().min(1)).max(5).default([]),
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

  const { customer, tickets, extraCards, takeHomePlantIds, winningPlantIds, paymentIntentId } =
    parsed.data;

  if (takeHomePlantIds.length !== tickets) {
    return NextResponse.json(
      {
        ok: false,
        message: `Select exactly ${tickets} free take-home plant${tickets === 1 ? "" : "s"}.`,
      },
      { status: 400 },
    );
  }

  const pricing = await getPlantBingoPricing(ownerId, eventSlug);
  if (!pricing) {
    return NextResponse.json({ ok: false, message: "Event not found." }, { status: 404 });
  }

  const totals = computePlantBingoTotals({
    tickets,
    extraCards,
    ticketPrice: pricing.ticketPrice,
    extraCardPrice: pricing.extraCardPrice,
    cardFeePercent: pricing.cardFeePercent,
  });
  const amountCents = Math.round(totals.total * 100);

  let paymentMode: "none" | "stripe" | "mock" = "none";
  let verifiedPaymentIntentId: string | undefined;

  const cfg = await resolveCompanySiteStripe(ownerId).catch(() => null);
  const stripeEnabled = Boolean(cfg?.enabled && cfg.secretKey && cfg.publishableKey);

  if (amountCents === 0) {
    paymentMode = "mock";
  } else if (paymentIntentId) {
    if (!stripeEnabled || !cfg) {
      return NextResponse.json({ ok: false, message: "Card payments are not enabled." }, { status: 400 });
    }
    try {
      const stripe = new Stripe(cfg.secretKey, { typescript: true });
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (pi.status !== "succeeded") {
        return NextResponse.json({ ok: false, message: "Payment has not completed." }, { status: 402 });
      }
      if (pi.metadata?.source !== "plant_bingo_checkout") {
        return NextResponse.json({ ok: false, message: "Payment mismatch." }, { status: 400 });
      }
      if (pi.metadata?.companySlug && pi.metadata.companySlug !== companySlug) {
        return NextResponse.json({ ok: false, message: "Payment mismatch." }, { status: 400 });
      }
      if (pi.metadata?.eventId && pi.metadata.eventId !== pricing.eventId) {
        return NextResponse.json({ ok: false, message: "Payment mismatch." }, { status: 400 });
      }
      if (typeof pi.amount === "number" && pi.amount !== amountCents) {
        return NextResponse.json(
          { ok: false, message: "Order total does not match the payment." },
          { status: 400 },
        );
      }
      paymentMode = "stripe";
      verifiedPaymentIntentId = paymentIntentId;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not verify payment.";
      return NextResponse.json({ ok: false, message }, { status: 502 });
    }
  } else if (stripeEnabled) {
    return NextResponse.json({ ok: false, message: "Payment required." }, { status: 402 });
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, message: "Payments are not configured." }, { status: 503 });
  } else {
    paymentMode = "mock";
  }

  try {
    const result = await completePlantBingoCheckout({
      ownerId,
      companySlug,
      publicSlug: eventSlug,
      customer,
      tickets,
      extraCards,
      takeHomePlantIds,
      winningPlantIds,
      paid: paymentMode === "stripe" || paymentMode === "mock",
      paymentMode,
      paymentIntentId: verifiedPaymentIntentId,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      reference: result.reference,
      total: result.total,
      registrationIds: result.registrationIds,
      tickets: result.tickets,
      ticketUrl: result.ticketUrl,
      message: "You're registered. Your plant selections are saved.",
    });
  } catch (e: unknown) {
    console.error("[POST plant-bingo checkout]", e);
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Checkout failed." },
      { status: 500 },
    );
  }
}
