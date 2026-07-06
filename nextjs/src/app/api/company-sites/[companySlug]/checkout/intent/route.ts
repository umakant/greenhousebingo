import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";

import { normalizeCompanySiteCheckoutItems } from "@/lib/company-themes/company-site-checkout-pricing";
import { resolveCompanySiteStripe } from "@/lib/company-themes/company-site-stripe";
import { findCompanyOwnerIdByPublicSlug } from "@/lib/company-themes/company-website-host-resolver";
import { isCompanyWebsiteAccessBlocked } from "@/lib/company-themes/company-website-password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  customerEmail: z.string().trim().email().max(320).optional(),
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

  const normalized = normalizeCompanySiteCheckoutItems(parsed.data.items);
  if (!normalized.ok) {
    return NextResponse.json({ ok: false, message: normalized.message }, { status: 400 });
  }

  const { total, items } = normalized;
  const amountCents = Math.round(total * 100);
  const allowMockPayment = process.env.NODE_ENV !== "production";
  const paymentsNotConfigured = NextResponse.json(
    { ok: false, message: "Payments are not configured." },
    { status: 503 },
  );

  let cfg;
  try {
    cfg = await resolveCompanySiteStripe(ownerId);
  } catch {
    return allowMockPayment ? NextResponse.json({ ok: true, mockPayment: true, total }) : paymentsNotConfigured;
  }

  if (!cfg.enabled || !cfg.secretKey || !cfg.publishableKey) {
    return allowMockPayment ? NextResponse.json({ ok: true, mockPayment: true, total }) : paymentsNotConfigured;
  }

  if (amountCents < 50) {
    return NextResponse.json({ ok: false, message: "Order total is too small for card payment." }, { status: 400 });
  }

  try {
    const stripe = new Stripe(cfg.secretKey, { typescript: true });
    const itemIds = items
      .map((i) => i.id)
      .sort()
      .join("-");
    const idempotencyKey = `cs_${ownerId}_${itemIds}_${amountCents}`;
    const customerEmail = parsed.data.customerEmail?.trim();

    const pi = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        description: "Company website checkout",
        metadata: {
          source: "company_website",
          companySlug,
          ownerId: ownerId.toString(),
          itemCount: String(items.reduce((s, i) => s + i.quantity, 0)),
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
      total,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start payment";
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
