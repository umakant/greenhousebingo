import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";

import { validateCart, type IncomingCartItem } from "@/lib/marketplace-cart";
import { guardMarketplaceCompany } from "@/lib/marketplace-company-api-guard";
import {
  notifyMarketplaceCityReadyAdmin,
  notifyMarketplaceOrderConfirmation,
} from "@/lib/marketplace-notification-service";
import { syncMarketplacePaidOrderToAccounting } from "@/lib/marketplace-accounting-sync";
import { encodeCityStateParam, normalizeCityState } from "@/lib/marketplace/deliveryQueue";
import { generateOrderNumber, serializeOrderV2 } from "@/lib/marketplace-service";
import { finalizePartnerMarketplaceCommission } from "@/lib/partner-marketplace-commission-service";
import { prisma } from "@/lib/prisma";
import { resolveWaterIceStripe } from "@/lib/waterice/waterice-stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUEUE_READY = "ready_to_schedule";
const QUEUE_WAITING = "waiting";
const ORDER_DELIVERY_STATUS = "waiting_for_city_minimum";

export async function POST(req: NextRequest) {
  const guard = await guardMarketplaceCompany(req, "marketplace.orders.manage");
  if (!guard.ok) return guard.response;
  const { organizationId, userId } = guard.ctx;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const rawItems = (Array.isArray(body.items) ? body.items : []) as IncomingCartItem[];
  const rawCity = String(body.city ?? "").trim();
  const rawState = String(body.state ?? "").trim();
  const notes = String(body.notes ?? "").trim() || null;
  const paymentMethodId = typeof body.paymentMethodId === "string" ? body.paymentMethodId.trim() : "";
  const paymentIntentId = typeof body.paymentIntentId === "string" ? body.paymentIntentId.trim() : "";

  if (!rawCity || !rawState) {
    return NextResponse.json({ ok: false, message: "Delivery city and state are required." }, { status: 400 });
  }
  // Normalize so equivalent spellings share one city queue ("jacksonville"/"florida" === "Jacksonville"/"FL").
  const { city, state } = normalizeCityState(rawCity, rawState);

  // Rule: validate items (active), single active vendor, and minimum bucket count.
  const cart = await validateCart(rawItems);
  if (!cart.ok) {
    return NextResponse.json({ ok: false, message: cart.message }, { status: cart.status });
  }
  if (!cart.meetsMinimum) {
    return NextResponse.json(
      {
        ok: false,
        message: `Minimum order is ${cart.pricing.minBuckets} buckets for delivery. Your cart has ${cart.totals.totalBucketCount}.`,
      },
      { status: 400 },
    );
  }

  const { vendorId, vendorName, currency, totals } = cart;
  const amountCents = Math.round(totals.total * 100);

  // Rule: payment must be collected immediately using Stripe (reuse existing config).
  let stripeConfigured = false;
  let confirmedPaymentIntentId: string | null = null;
  let paymentStatus = "unpaid";

  let cfgStripe = null;
  try {
    cfgStripe = await resolveWaterIceStripe(req.headers.get("host"));
  } catch {
    cfgStripe = null;
  }
  stripeConfigured = !!(cfgStripe && cfgStripe.enabled && cfgStripe.secretKey && cfgStripe.publishableKey);

  if (stripeConfigured) {
    if (amountCents < 50) {
      return NextResponse.json({ ok: false, message: "Order total is too small for card payment." }, { status: 400 });
    }
    const stripe = new Stripe(cfgStripe!.secretKey, { typescript: true });
    try {
      if (paymentIntentId) {
        // Client already confirmed via clientSecret (WaterIceStripeCardForm).
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
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
      } else if (paymentMethodId) {
        // Collect payment immediately, server-side.
        const pi = await stripe.paymentIntents.create({
          amount: amountCents,
          currency: "usd",
          payment_method: paymentMethodId,
          confirm: true,
          description: "Water Ice Express marketplace order",
          automatic_payment_methods: { enabled: true, allow_redirects: "never" },
          metadata: {
            source: "marketplace",
            companyId: organizationId.toString(),
            vendorId: vendorId.toString(),
            bucketCount: String(totals.totalBucketCount),
          },
        });
        if (pi.status === "requires_action") {
          return NextResponse.json(
            { ok: false, requiresAction: true, clientSecret: pi.client_secret, paymentIntentId: pi.id },
            { status: 200 },
          );
        }
        if (pi.status !== "succeeded") {
          return NextResponse.json({ ok: false, message: "Payment was not completed." }, { status: 402 });
        }
        confirmedPaymentIntentId = pi.id;
        paymentStatus = "paid";
      } else {
        return NextResponse.json({ ok: false, message: "Payment information is required." }, { status: 402 });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed.";
      return NextResponse.json({ ok: false, message }, { status: 402 });
    }
  } else if (process.env.NODE_ENV !== "production") {
    // Dev/sandbox only: no Stripe configured, treat as paid so the flow is testable.
    paymentStatus = "paid";
  } else {
    return NextResponse.json({ ok: false, message: "Payments are not configured." }, { status: 503 });
  }

  const itemData = cart.lines.map((l) => ({
    productId: l.productId,
    productName: l.name,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    totalPrice: l.totalPrice,
    bucketCountValue: l.bucketCountValue,
  }));

  // Partnership: if the buying company was referred by a partner, stamp it on the order.
  const buyerAttribution = await prisma.user.findUnique({
    where: { id: organizationId },
    select: { partnerId: true, referralSource: true },
  });
  const orderPartnerId = buyerAttribution?.partnerId ?? null;
  const orderReferralSource = buyerAttribution?.referralSource ?? null;

  // Rule: create order + items, set statuses, and add buckets to the city queue.
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
        city,
        state,
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

    const existing = await tx.deliveryCityQueue.findUnique({
      where: { vendorId_city_state: { vendorId, city, state } },
    });
    let queueReady: {
      becameReady: boolean;
      currentBucketTotal: number;
      requiredBucketMinimum: number;
      companyCount: number;
    };
    if (existing) {
      const newTotal = existing.currentBucketTotal + totals.totalBucketCount;
      const companyCount = existing.companyCount + 1;
      const isReady = newTotal >= existing.requiredBucketMinimum;
      await tx.deliveryCityQueue.update({
        where: { id: existing.id },
        data: {
          currentBucketTotal: newTotal,
          companyCount,
          // Rule: queue becomes ready_to_schedule once the city minimum is reached.
          queueStatus: isReady ? QUEUE_READY : QUEUE_WAITING,
          updatedAt: new Date(),
        },
      });
      queueReady = {
        // Only alert on the transition into ready (not on every order once ready).
        becameReady: isReady && existing.queueStatus !== QUEUE_READY,
        currentBucketTotal: newTotal,
        requiredBucketMinimum: existing.requiredBucketMinimum,
        companyCount,
      };
    } else {
      const DEFAULT_MIN = 50; // matches DeliveryCityQueue.requiredBucketMinimum default
      const isReady = totals.totalBucketCount >= DEFAULT_MIN;
      await tx.deliveryCityQueue.create({
        data: {
          vendorId,
          city,
          state,
          currentBucketTotal: totals.totalBucketCount,
          companyCount: 1,
          queueStatus: isReady ? QUEUE_READY : QUEUE_WAITING,
        },
      });
      queueReady = {
        becameReady: isReady,
        currentBucketTotal: totals.totalBucketCount,
        requiredBucketMinimum: DEFAULT_MIN,
        companyCount: 1,
      };
    }

    return { order: created, queueReady };
  });

  // Rule: send order confirmation email via the Paper Flight templated email system.
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
        vendorName: vendorName || order.vendor?.name || null,
        products: itemData.map((i) => ({ productName: i.productName, quantity: i.quantity })),
        amountPaid: totals.total,
        currency,
        bucketCount: totals.totalBucketCount,
        city,
        state,
      }).catch(() => undefined);
    }
  } catch {
    /* email is best-effort */
  }

  // Rule: alert Water Ice Express admins when this order pushes the city to its minimum.
  if (queueReady.becameReady) {
    void notifyMarketplaceCityReadyAdmin({
      vendorName: vendorName || order.vendor?.name || null,
      city,
      state,
      currentBucketTotal: queueReady.currentBucketTotal,
      requiredMinimum: queueReady.requiredBucketMinimum,
      companyCount: queueReady.companyCount,
      cityStateParam: encodeCityStateParam(vendorId, city, state),
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
      console.warn("[marketplace/checkout] partner commission skipped:", (err as Error)?.message ?? err),
    );
  }

  // Accounting: record revenue + customer payment for the paid order (best-effort).
  if (paymentStatus === "paid") {
    void syncMarketplacePaidOrderToAccounting({ orderId: order.id }).catch((err) =>
      console.warn("[marketplace/checkout] accounting sync skipped:", (err as Error)?.message ?? err),
    );
  }

  return NextResponse.json(
    { ok: true, orderId: order.id.toString(), item: serializeOrderV2(order) },
    { status: 201 },
  );
}
