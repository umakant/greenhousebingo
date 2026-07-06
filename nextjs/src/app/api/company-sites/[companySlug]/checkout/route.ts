import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import Stripe from "stripe";
import { z } from "zod";

import { normalizeCompanySiteCheckoutItems } from "@/lib/company-themes/company-site-checkout-pricing";
import { resolveCompanySiteStripe } from "@/lib/company-themes/company-site-stripe";
import { registerCompanySiteWorkshops } from "@/lib/company-themes/company-site-workshop-service";
import { sendCompanySiteWorkshopTicketEmailAsync } from "@/lib/company-themes/send-company-site-workshop-email";
import { findCompanyOwnerIdByPublicSlug } from "@/lib/company-themes/company-website-host-resolver";
import { isCompanyWebsiteAccessBlocked } from "@/lib/company-themes/company-website-password";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  mode: z.enum(["checkout", "reserve"]).default("checkout"),
  paymentIntentId: z.string().trim().max(120).optional(),
  customer: z.object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(320),
    phone: z.string().trim().max(40).optional(),
    notes: z.string().trim().max(2000).optional(),
  }),
  items: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(120),
        quantity: z.number().int().min(1).max(20),
        price: z.number().min(0).optional(),
        title: z.string().trim().min(1).max(300).optional(),
      }),
    )
    .min(1)
    .max(20),
});

async function nextOrderId(): Promise<bigint> {
  const agg = await prisma.order.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

function makeReference(): string {
  const part = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CS-${Date.now().toString(36).toUpperCase()}-${part}`;
}

type Ctx = { params: Promise<{ companySlug: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { companySlug } = await params;
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

  const { mode, customer, items, paymentIntentId } = parsed.data;
  const normalized = normalizeCompanySiteCheckoutItems(items);
  if (!normalized.ok) {
    return NextResponse.json({ ok: false, message: normalized.message }, { status: 400 });
  }

  const { total, items: normalizedItems } = normalized;
  const amountCents = Math.round(total * 100);
  const reference = makeReference();
  const fullName = `${customer.firstName} ${customer.lastName}`.trim();

  let paymentMode: "none" | "stripe" | "mock" = "none";
  let verifiedPaymentIntentId: string | undefined;

  if (mode === "checkout") {
    const cfg = await resolveCompanySiteStripe(ownerId);
    const stripeEnabled = cfg.enabled && Boolean(cfg.secretKey && cfg.publishableKey);

    if (paymentIntentId) {
      if (!stripeEnabled) {
        return NextResponse.json({ ok: false, message: "Card payments are not enabled." }, { status: 400 });
      }
      try {
        const stripe = new Stripe(cfg.secretKey, { typescript: true });
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (pi.status !== "succeeded") {
          return NextResponse.json({ ok: false, message: "Payment has not completed." }, { status: 402 });
        }
        if (pi.metadata?.source !== "company_website") {
          return NextResponse.json({ ok: false, message: "Payment mismatch." }, { status: 400 });
        }
        if (pi.metadata?.companySlug && pi.metadata.companySlug !== companySlug) {
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
  }

  const orderId = await nextOrderId();
  const paid = paymentMode === "stripe" || paymentMode === "mock";

  const workshopTickets = await registerCompanySiteWorkshops({
    ownerId,
    companySlug,
    orderReference: reference,
    orderId,
    mode,
    paid,
    customer,
    items: normalizedItems,
  }).catch((err) => {
    console.error("[company-site/checkout] workshop registration failed:", err);
    return [];
  });

  await prisma.order.create({
    data: {
      id: orderId,
      orderId: reference,
      name: fullName,
      email: customer.email,
      amount: new Prisma.Decimal(total),
      price: new Prisma.Decimal(total),
      status: mode === "reserve" ? "reserved" : paid ? "completed" : "pending",
      paymentStatus: mode === "reserve" ? "pending" : paid ? "succeeded" : "pending",
      paymentType: mode === "reserve" ? "company_site_reserve" : "company_site_checkout",
      paymentMethod: paymentMode === "stripe" ? "stripe" : paymentMode === "mock" ? "test" : "company_website",
      transactionId: verifiedPaymentIntentId ?? null,
      txnId: verifiedPaymentIntentId ?? null,
      currency: "USD",
      createdBy: ownerId,
      metadata: JSON.stringify({
        source: "company_website",
        companySlug,
        mode,
        paymentMode,
        customer,
        items: normalizedItems,
        reference,
        workshopTickets,
        ...(verifiedPaymentIntentId ? { paymentIntentId: verifiedPaymentIntentId } : {}),
      }),
    },
  });

  if (verifiedPaymentIntentId) {
    try {
      const cfg = await resolveCompanySiteStripe(ownerId);
      if (cfg.secretKey) {
        const stripe = new Stripe(cfg.secretKey, { typescript: true });
        await stripe.paymentIntents.update(verifiedPaymentIntentId, {
          metadata: {
            source: "company_website",
            companySlug,
            ownerId: ownerId.toString(),
            orderId: orderId.toString(),
            reference,
          },
        });
      }
    } catch {
      /* metadata tagging is best-effort */
    }
  }

  if (workshopTickets.length > 0) {
    sendCompanySiteWorkshopTicketEmailAsync({
      ownerId,
      companySlug,
      to: customer.email,
      attendeeName: fullName,
      orderReference: reference,
      mode,
      tickets: workshopTickets,
      customerNotes: customer.notes,
    });
  }

  return NextResponse.json({
    ok: true,
    reference,
    workshopTickets,
    ticketUrl: workshopTickets.length > 0 ? `/sites/${encodeURIComponent(companySlug)}/ticket/${encodeURIComponent(reference)}` : undefined,
    message:
      mode === "reserve"
        ? workshopTickets.length > 0
          ? "Seat reserved. Your workshop QR ticket is ready."
          : "Seat reserved successfully."
        : paid
          ? workshopTickets.length > 0
            ? "Payment received. Your workshop QR ticket is ready."
            : "Payment received. Your registration is confirmed."
          : "Checkout submitted successfully.",
  });
}
