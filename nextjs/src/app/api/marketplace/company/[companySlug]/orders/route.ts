import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";

import { guardCompanyMarketplaceBySlug } from "@/lib/marketplace-company-guard-slug";
import { computeTotals, getMarketplacePricingConfig, type PriceableItem } from "@/lib/marketplace-pricing";
import { syncMarketplacePaidOrderToAccounting } from "@/lib/marketplace-accounting-sync";
import {
  encodeCityStateParam,
  normalizeCityState,
  updateDeliveryCityQueue,
} from "@/lib/marketplace/deliveryQueue";
import {
  notifyMarketplaceCityReadyAdmin,
  notifyMarketplaceOrderConfirmation,
} from "@/lib/marketplace-notification-service";
import { generateOrderNumber, serializeOrderV2 } from "@/lib/marketplace-service";
import { finalizePartnerMarketplaceCommission } from "@/lib/partner-marketplace-commission-service";
import { prisma } from "@/lib/prisma";
import { resolveWaterIceStripe } from "@/lib/waterice/waterice-stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDER_DELIVERY_STATUS = "waiting_for_city_minimum";

export async function GET(req: NextRequest, { params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  const guard = await guardCompanyMarketplaceBySlug(req, companySlug, "marketplace.orders.view");
  if (!guard.ok) return guard.response;

  const orders = await prisma.marketplaceOrder.findMany({
    where: { buyerOrganizationId: guard.ctx.organizationId },
    orderBy: { createdAt: "desc" },
    include: { items: true, vendor: { select: { name: true } } },
  });
  return NextResponse.json({ ok: true, items: orders.map(serializeOrderV2) });
}

type IncomingItem = { productId?: unknown; quantity?: unknown };

export async function POST(req: NextRequest, { params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  const guard = await guardCompanyMarketplaceBySlug(req, companySlug, "marketplace.orders.manage");
  if (!guard.ok) return guard.response;
  const { organizationId, userId } = guard.ctx;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const rawItems = Array.isArray(body.items) ? (body.items as IncomingItem[]) : [];
  const city = String(body.city ?? "").trim();
  const state = String(body.state ?? "").trim();
  const paymentIntentId = typeof body.paymentIntentId === "string" ? body.paymentIntentId.trim() : "";
  const notes = String(body.notes ?? "").trim() || null;

  if (!city || !state) {
    return NextResponse.json({ ok: false, message: "Delivery city and state are required." }, { status: 400 });
  }
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
    select: { id: true, vendorId: true, name: true, price: true, currency: true, bucketCountValue: true },
  });
  if (products.length === 0) {
    return NextResponse.json({ ok: false, message: "Items are no longer available." }, { status: 400 });
  }

  const vendorIds = new Set(products.map((p) => p.vendorId.toString()));
  if (vendorIds.size > 1) {
    return NextResponse.json({ ok: false, message: "Please order from one vendor at a time." }, { status: 400 });
  }
  const vendorId = products[0].vendorId;
  const currency = products[0].currency || "USD";

  const cfg = await getMarketplacePricingConfig();
  const priceable: PriceableItem[] = products.map((p) => ({
    unitPrice: Number(p.price),
    quantity: qtyById.get(p.id.toString()) ?? 1,
    bucketCountValue: p.bucketCountValue ?? 0,
  }));
  const totals = computeTotals(priceable, cfg);

  if (totals.totalBucketCount < cfg.minBuckets) {
    return NextResponse.json(
      { ok: false, message: `Minimum order is ${cfg.minBuckets} buckets for delivery.` },
      { status: 400 },
    );
  }

  // Normalize so "jacksonville"/"florida" and "Jacksonville"/"FL" share one city queue.
  const { city: normCity, state: normState } = normalizeCityState(city, state);
  const amountCents = Math.round(totals.total * 100);

  // Verify payment. Stripe is the source of truth; the client only relays the PaymentIntent id.
  const allowMockPayment = process.env.NODE_ENV !== "production";
  let paymentStatus = "unpaid";
  let confirmedPaymentIntentId: string | null = null;

  let cfgStripe = null;
  try {
    cfgStripe = await resolveWaterIceStripe(req.headers.get("host"));
  } catch {
    cfgStripe = null;
  }
  const stripeConfigured = !!(cfgStripe && cfgStripe.enabled && cfgStripe.secretKey);

  if (stripeConfigured) {
    if (!paymentIntentId) {
      return NextResponse.json({ ok: false, message: "Payment was not completed." }, { status: 402 });
    }

    // Idempotency: a retry with the same PaymentIntent returns the existing order, never a duplicate.
    const existingOrder = await prisma.marketplaceOrder.findFirst({
      where: { stripePaymentIntentId: paymentIntentId, buyerOrganizationId: organizationId },
      include: { items: true, vendor: { select: { name: true } } },
    });
    if (existingOrder) {
      return NextResponse.json(
        { ok: true, item: serializeOrderV2(existingOrder), orderId: existingOrder.id.toString() },
        { status: 200 },
      );
    }

    let pi: Stripe.PaymentIntent;
    try {
      const stripe = new Stripe(cfgStripe!.secretKey, { typescript: true });
      pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch {
      return NextResponse.json({ ok: false, message: "Could not verify payment." }, { status: 502 });
    }
    if (pi.status !== "succeeded") {
      return NextResponse.json({ ok: false, message: "Payment was not completed." }, { status: 402 });
    }
    // Bind the PaymentIntent to THIS checkout: amount + company must match what we computed.
    if (pi.amount !== amountCents || (pi.currency ?? "usd").toLowerCase() !== "usd") {
      return NextResponse.json({ ok: false, message: "Payment amount mismatch. Please retry checkout." }, { status: 402 });
    }
    if ((pi.metadata?.source ?? "") !== "marketplace") {
      return NextResponse.json({ ok: false, message: "Payment could not be matched to this order." }, { status: 402 });
    }
    if ((pi.metadata?.companyId ?? "") !== organizationId.toString()) {
      return NextResponse.json({ ok: false, message: "Payment does not belong to this company." }, { status: 403 });
    }
    confirmedPaymentIntentId = pi.id;
    paymentStatus = "paid";
  } else if (allowMockPayment) {
    // Dev/sandbox only: no Stripe configured, treat as paid so the flow is testable.
    paymentStatus = "paid";
  } else {
    return NextResponse.json({ ok: false, message: "Payments are not configured." }, { status: 503 });
  }

  const itemData = products.map((p) => {
    const qty = qtyById.get(p.id.toString()) ?? 1;
    const unitPrice = Number(p.price);
    return {
      productId: p.id,
      productName: p.name,
      quantity: qty,
      unitPrice,
      totalPrice: Math.round(unitPrice * qty * 100) / 100,
      bucketCountValue: p.bucketCountValue ?? 0,
    };
  });

  // Partnership: stamp the referring partner (if any) on the order.
  const buyerAttribution = await prisma.user.findUnique({
    where: { id: organizationId },
    select: { partnerId: true, referralSource: true },
  });
  const orderPartnerId = buyerAttribution?.partnerId ?? null;
  const orderReferralSource = buyerAttribution?.referralSource ?? null;

  const { order, queueReady } = await prisma.$transaction(async (tx) => {
    const created = await tx.marketplaceOrder.create({
      data: {
        orderNumber: await generateOrderNumber(),
        buyerOrganizationId: organizationId,
        companyId: organizationId,
        vendorId,
        placedByUserId: userId,
        status: "paid",
        orderStatus: "paid",
        paymentStatus,
        deliveryStatus: ORDER_DELIVERY_STATUS,
        city: normCity,
        state: normState,
        totalBucketCount: totals.totalBucketCount,
        subtotal: totals.subtotal,
        tax: totals.tax,
        deliveryFee: totals.deliveryFee,
        total: totals.total,
        totalAmount: totals.total,
        currency,
        stripePaymentIntentId: confirmedPaymentIntentId,
        partnerId: orderPartnerId,
        referralSource: orderReferralSource,
        notes,
        items: { create: itemData },
      },
      include: { items: true, vendor: { select: { name: true } } },
    });

    // Add the order's buckets to the per-vendor city delivery queue via the shared service:
    // normalized keys, distinct company count, and correct ready_to_schedule status.
    const queueReady = await updateDeliveryCityQueue({
      vendorId,
      city: normCity,
      state: normState,
      bucketCount: totals.totalBucketCount,
      companyId: organizationId,
      tx,
    });

    return { order: created, queueReady };
  });

  // Order confirmation email + in-app notification (best-effort, never breaks checkout).
  try {
    const buyer = await prisma.user.findUnique({
      where: { id: organizationId },
      select: { name: true, email: true },
    });
    const placedBy = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    const to = (buyer?.email ?? placedBy?.email ?? "").trim();
    if (to) {
      void notifyMarketplaceOrderConfirmation({
        organizationId,
        toEmail: to,
        recipientName: placedBy?.name ?? buyer?.name ?? null,
        companyName: buyer?.name ?? null,
        orderId: order.id.toString(),
        orderNumber: order.orderNumber,
        vendorName: order.vendor?.name ?? null,
        products: itemData.map((i) => ({ productName: i.productName, quantity: i.quantity })),
        amountPaid: totals.total,
        currency,
        bucketCount: totals.totalBucketCount,
        city: normCity,
        state: normState,
      }).catch(() => undefined);
    }
  } catch {
    /* email is best-effort */
  }

  // Alert Water Ice Express admins when this order pushes the city to its minimum.
  if (queueReady.becameReady) {
    void notifyMarketplaceCityReadyAdmin({
      vendorName: order.vendor?.name ?? null,
      city: normCity,
      state: normState,
      currentBucketTotal: queueReady.currentBucketTotal,
      requiredMinimum: queueReady.requiredBucketMinimum,
      companyCount: queueReady.companyCount,
      cityStateParam: encodeCityStateParam(vendorId, normCity, normState),
    }).catch(() => undefined);
  }

  // Partnership: marketplace commission for the referring partner (paid orders only; optional rule).
  if (orderPartnerId != null && paymentStatus === "paid") {
    void finalizePartnerMarketplaceCommission({
      companyUserId: organizationId,
      marketplaceOrderId: order.id,
      orderNumber: order.orderNumber,
      amount: totals.total,
      partnerId: orderPartnerId,
    }).catch((err) =>
      console.warn("[marketplace/company/orders] partner commission skipped:", (err as Error)?.message ?? err),
    );
  }

  // Accounting: record revenue + customer payment for the paid order (best-effort).
  if (paymentStatus === "paid") {
    void syncMarketplacePaidOrderToAccounting({ orderId: order.id }).catch((err) =>
      console.warn("[marketplace/company/orders] accounting sync skipped:", (err as Error)?.message ?? err),
    );
  }

  return NextResponse.json({ ok: true, item: serializeOrderV2(order), orderId: order.id.toString() }, { status: 201 });
}
