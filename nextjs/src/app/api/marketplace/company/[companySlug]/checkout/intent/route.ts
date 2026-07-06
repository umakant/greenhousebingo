import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";

import { guardCompanyMarketplaceBySlug } from "@/lib/marketplace-company-guard-slug";
import { computeTotals, getMarketplacePricingConfig, type PriceableItem } from "@/lib/marketplace-pricing";
import { prisma } from "@/lib/prisma";
import { resolveWaterIceStripe } from "@/lib/waterice/waterice-stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingItem = { productId?: unknown; quantity?: unknown };

export async function POST(req: NextRequest, { params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  const guard = await guardCompanyMarketplaceBySlug(req, companySlug, "marketplace.orders.manage");
  if (!guard.ok) return guard.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const rawItems = Array.isArray(body.items) ? (body.items as IncomingItem[]) : [];
  if (rawItems.length === 0) {
    return NextResponse.json({ ok: false, message: "Your cart is empty." }, { status: 400 });
  }

  const qtyById = new Map<string, number>();
  const productIds: bigint[] = [];
  for (const it of rawItems) {
    let pid: bigint;
    try {
      pid = BigInt(String(it.productId));
    } catch {
      continue;
    }
    const qty = Math.max(1, Math.floor(Number(it.quantity ?? 1)) || 1);
    qtyById.set(pid.toString(), qty);
    productIds.push(pid);
  }
  if (productIds.length === 0) {
    return NextResponse.json({ ok: false, message: "No valid items." }, { status: 400 });
  }

  const products = await prisma.marketplaceProduct.findMany({
    where: { id: { in: productIds }, isActive: true, status: "active", vendor: { status: "active" } },
    select: { id: true, vendorId: true, price: true, currency: true, bucketCountValue: true },
  });
  if (products.length === 0) {
    return NextResponse.json({ ok: false, message: "Items are no longer available." }, { status: 400 });
  }

  // Single-vendor cart (delivery queue is per vendor+city).
  const vendorIds = new Set(products.map((p) => p.vendorId.toString()));
  if (vendorIds.size > 1) {
    return NextResponse.json(
      { ok: false, message: "Please order from one vendor at a time." },
      { status: 400 },
    );
  }

  const cfg = await getMarketplacePricingConfig();
  const priceable: PriceableItem[] = products.map((p) => ({
    unitPrice: Number(p.price),
    quantity: qtyById.get(p.id.toString()) ?? 1,
    bucketCountValue: p.bucketCountValue ?? 0,
  }));
  const totals = computeTotals(priceable, cfg);

  if (totals.totalBucketCount < cfg.minBuckets) {
    return NextResponse.json(
      {
        ok: false,
        message: `Minimum order is ${cfg.minBuckets} buckets for delivery. Your cart has ${totals.totalBucketCount}.`,
      },
      { status: 400 },
    );
  }

  const amountCents = Math.round(totals.total * 100);
  // Mock payment is only allowed outside production; production must have Stripe configured.
  const allowMockPayment = process.env.NODE_ENV !== "production";
  const paymentsNotConfigured = NextResponse.json(
    { ok: false, message: "Payments are not configured." },
    { status: 503 },
  );

  let cfgStripe;
  try {
    cfgStripe = await resolveWaterIceStripe(req.headers.get("host"));
  } catch {
    return allowMockPayment ? NextResponse.json({ ok: true, mockPayment: true, totals }) : paymentsNotConfigured;
  }
  if (!cfgStripe || !cfgStripe.enabled || !cfgStripe.secretKey || !cfgStripe.publishableKey) {
    return allowMockPayment ? NextResponse.json({ ok: true, mockPayment: true, totals }) : paymentsNotConfigured;
  }
  if (amountCents < 50) {
    return NextResponse.json({ ok: false, message: "Order total is too small for card payment." }, { status: 400 });
  }

  try {
    const stripe = new Stripe(cfgStripe.secretKey, { typescript: true });
    // Idempotency: a double-click reuses the same PaymentIntent instead of creating duplicates.
    const idempotencyKey = `mp_${guard.ctx.organizationId}_${productIds
      .map(String)
      .sort()
      .join("-")}_${amountCents}`;
    const pi = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        description: "Water Ice Express marketplace order",
        metadata: {
          source: "marketplace",
          companyId: guard.ctx.organizationId.toString(),
          vendorId: [...vendorIds][0] ?? "",
          bucketCount: String(totals.totalBucketCount),
        },
      },
      { idempotencyKey },
    );
    return NextResponse.json({
      ok: true,
      mockPayment: false,
      clientSecret: pi.client_secret,
      publishableKey: cfgStripe.publishableKey,
      paymentIntentId: pi.id,
      totals,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start payment";
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
