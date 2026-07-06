import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { cartTotals } from "@/lib/storefront/cart-service";
import { findOrCreateCrmCustomerForStorefrontOrder } from "@/lib/storefront/crm-bridge";
import { decrementStockForProduct, parseInventoryPolicy } from "@/lib/storefront/inventory-storefront";
import { provisionLmsEnrollmentsForPaidStorefrontOrder } from "@/lib/lms-enrollment-service";
import { syncStorefrontPaidOrderToRevenue } from "@/lib/storefront/storefront-accounting-sync";
import { STOREFRONT_EVENTS, publishStorefrontEvent } from "@/lib/storefront/storefront-event-bus";
import { computeStorefrontTax } from "@/lib/storefront/storefront-tax-service";

function genOrderNumber(): string {
  return `SF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function createStorefrontOrderFromCart(params: {
  cartId: string;
  organizationId: bigint;
  websiteId: bigint;
  customerEmail: string;
  customerName: string | null;
  shippingAddress: Prisma.InputJsonValue;
  billingAddress: Prisma.InputJsonValue | null;
  /** From prepare-checkout (Day 22 / 26); links stock holds and totals. */
  checkoutSessionId?: string | null;
}) {
  const cart = await prisma.storefrontCart.findFirst({
    where: { id: params.cartId, organizationId: params.organizationId, websiteId: params.websiteId },
    include: { lines: { include: { product: true } } },
  });
  if (!cart?.lines.length) throw new Error("Cart is empty");

  let shippingTotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;
  if (params.checkoutSessionId) {
    const sess = await prisma.storefrontCheckoutSession.findFirst({
      where: {
        id: params.checkoutSessionId,
        organizationId: params.organizationId,
        websiteId: params.websiteId,
        cartId: params.cartId,
      },
    });
    if (!sess) throw new Error("Checkout session not found");
    if (sess.expiresAt < new Date()) throw new Error("Checkout session expired — refresh and try again");
    shippingTotal = Number(sess.shippingAmount);
    taxTotal = Number(sess.taxAmount);
    discountTotal = Number(sess.discountAmount);
  }

  const lines = cart.lines.filter((l) => l.product);
  const subtotal = cartTotals(
    lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice })),
  ).subtotal;
  const total = Math.max(0, subtotal + shippingTotal + taxTotal - discountTotal);

  const addr = params.shippingAddress as Record<string, unknown>;
  const country = String(addr?.country ?? "US");
  const region = addr?.region != null ? String(addr.region) : "";
  const taxLinesComputed = await computeStorefrontTax({
    organizationId: params.organizationId,
    websiteId: params.websiteId,
    country,
    region: region || null,
    taxableSubtotal: Math.max(0, subtotal - discountTotal),
  });

  let discountCodeIdForOrder: bigint | null = null;
  if (params.checkoutSessionId) {
    const sess = await prisma.storefrontCheckoutSession.findFirst({
      where: {
        id: params.checkoutSessionId,
        organizationId: params.organizationId,
        websiteId: params.websiteId,
        cartId: params.cartId,
      },
      select: { discountCodeId: true },
    });
    discountCodeIdForOrder = sess?.discountCodeId ?? null;
  }

  const orderNumber = genOrderNumber();

  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.storefrontOrder.create({
      data: {
        organizationId: params.organizationId,
        websiteId: params.websiteId,
        orderNumber,
        source: "storefront",
        status: "pending_payment",
        paymentStatus: "unpaid",
        subtotal,
        taxTotal,
        shippingTotal,
        discountTotal,
        total,
        currency: "USD",
        customerEmail: params.customerEmail.trim(),
        customerName: params.customerName?.trim() || null,
        shippingAddress: params.shippingAddress,
        billingAddress: params.billingAddress ?? params.shippingAddress,
        storefrontCustomerId: cart.customerId,
        fulfillmentStatus: "unfulfilled",
        checkoutSessionId: params.checkoutSessionId ?? undefined,
        discountCodeId: discountCodeIdForOrder ?? undefined,
        taxLines: taxLinesComputed.lines.length ? (taxLinesComputed.lines as unknown as object) : undefined,
      },
    });

    for (const line of lines) {
      const p = line.product!;
      const unit = Number(line.unitPrice);
      const lineTotal = unit * line.quantity;
      await tx.storefrontOrderLine.create({
        data: {
          orderId: o.id,
          productId: p.id,
          variantKey: line.variantKey || "",
          name: p.name,
          sku: p.sku,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal,
        },
      });
    }

    await tx.storefrontShipment.create({
      data: {
        orderId: o.id,
        status: "pending",
      },
    });

    await tx.storefrontOrderEvent.create({
      data: {
        orderId: o.id,
        kind: "created",
        message: "Order created — awaiting payment",
      },
    });

    if (params.checkoutSessionId) {
      await tx.storefrontCheckoutSession.update({
        where: { id: params.checkoutSessionId },
        data: { status: "locked" },
      });
    }

    if (discountCodeIdForOrder && discountTotal > 0) {
      await tx.storefrontDiscountRedemption.create({
        data: {
          orderId: o.id,
          codeId: discountCodeIdForOrder,
          amount: discountTotal,
        },
      });
      await tx.storefrontDiscountCode.update({
        where: { id: discountCodeIdForOrder },
        data: { usesCount: { increment: 1 } },
      });
    }

    return o;
  });

  const crmId = await findOrCreateCrmCustomerForStorefrontOrder({
    organizationId: params.organizationId,
    websiteId: params.websiteId,
    email: params.customerEmail,
    name: params.customerName,
    shippingAddress: params.shippingAddress,
  });
  if (crmId) {
    await prisma.storefrontOrder.update({
      where: { id: order.id },
      data: { crmCustomerId: crmId },
    });
    if (cart.customerId) {
      await prisma.storefrontCustomer.updateMany({
        where: { id: cart.customerId, accountingCustomerId: null },
        data: { accountingCustomerId: crmId },
      });
    }
  }

  await publishStorefrontEvent({
    organizationId: params.organizationId,
    websiteId: params.websiteId,
    eventType: STOREFRONT_EVENTS.ORDER_CREATED,
    resourceType: "storefront_order",
    resourceId: order.id.toString(),
    message: `Order ${order.orderNumber} created`,
    metadata: { orderNumber: order.orderNumber, total: Number(order.total) },
  });

  return order;
}

/** Mark paid: inventory decrement, payment record, release stock reservations, timeline (Days 28–29). */
export async function markStorefrontOrderPaid(params: {
  orderId: bigint;
  organizationId: bigint;
  paymentSource: "test" | "stripe";
  stripePaymentIntentId?: string | null;
}) {
  if (params.paymentSource === "test" && process.env.NODE_ENV === "production" && process.env.ALLOW_STOREFRONT_TEST_PAYMENT !== "1") {
    throw new Error("Test payment disabled");
  }

  const order = await prisma.storefrontOrder.findFirst({
    where: { id: params.orderId, organizationId: params.organizationId },
    include: { lines: { include: { product: true } } },
  });
  if (!order) throw new Error("Order not found");
  if (order.status === "paid") {
    return prisma.storefrontOrder.findFirst({
      where: { id: params.orderId },
      include: { lines: true, events: { orderBy: { createdAt: "asc" } }, paymentRecords: true, shipments: true },
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.storefrontOrder.update({
      where: { id: order.id },
      data: {
        status: "paid",
        paymentStatus: "paid",
        paidAt: new Date(),
        ...(params.stripePaymentIntentId
          ? { stripePaymentIntentId: params.stripePaymentIntentId }
          : {}),
      },
    });

    const existingPay = await tx.storefrontPaymentRecord.findFirst({
      where: { orderId: order.id, status: "succeeded" },
    });
    if (!existingPay) {
      await tx.storefrontPaymentRecord.create({
        data: {
          orderId: order.id,
          provider: params.paymentSource === "stripe" ? "stripe" : "test",
          amount: order.total,
          currency: order.currency,
          status: "succeeded",
          stripePaymentIntentId: params.stripePaymentIntentId ?? null,
        },
      });
    }

    for (const line of order.lines) {
      const p = line.product;
      if (!p) continue;
      const policy = parseInventoryPolicy(p.inventoryPolicy);
      await decrementStockForProduct(p.id, line.quantity, policy);
    }

    if (order.checkoutSessionId) {
      await tx.storefrontStockReservation.deleteMany({
        where: { checkoutSessionId: order.checkoutSessionId },
      });
      await tx.storefrontCheckoutSession.updateMany({
        where: { id: order.checkoutSessionId },
        data: { status: "completed" },
      });
    }

    await tx.storefrontOrderEvent.create({
      data: {
        orderId: order.id,
        kind: "payment",
        message:
          params.paymentSource === "stripe"
            ? "Payment received (Stripe)"
            : "Payment recorded (test)",
        metadata: params.stripePaymentIntentId
          ? { stripePaymentIntentId: params.stripePaymentIntentId }
          : undefined,
      },
    });
  });

  await publishStorefrontEvent({
    organizationId: params.organizationId,
    websiteId: order.websiteId,
    eventType: STOREFRONT_EVENTS.ORDER_PAID,
    resourceType: "storefront_order",
    resourceId: order.id.toString(),
    message: `Order ${order.orderNumber} paid`,
    metadata: {
      paymentSource: params.paymentSource,
      stripePaymentIntentId: params.stripePaymentIntentId ?? undefined,
    },
  });

  try {
    await syncStorefrontPaidOrderToRevenue({
      orderId: order.id,
      organizationId: params.organizationId,
    });
  } catch (e) {
    console.warn("[checkout-order-service] accounting sync failed:", e);
  }

  try {
    await provisionLmsEnrollmentsForPaidStorefrontOrder({
      orderId: params.orderId,
      organizationId: params.organizationId,
    });
  } catch (e) {
    console.warn("[checkout-order-service] LMS enrollment provision failed:", e);
  }

  return prisma.storefrontOrder.findFirst({
    where: { id: params.orderId },
    include: { lines: true, events: { orderBy: { createdAt: "asc" } }, paymentRecords: true, shipments: true },
  });
}

/** @deprecated Use markStorefrontOrderPaid({ paymentSource: "test" }) */
export async function markStorefrontOrderPaidTest(orderId: bigint, organizationId: bigint) {
  return markStorefrontOrderPaid({
    orderId,
    organizationId,
    paymentSource: "test",
  });
}

/** Stripe webhook: card declined / authentication failed — timeline + optional failed payment row. */
export async function markStorefrontOrderPaymentFailed(params: {
  orderId: bigint;
  organizationId: bigint;
  stripePaymentIntentId: string;
  message?: string;
}) {
  const order = await prisma.storefrontOrder.findFirst({
    where: { id: params.orderId, organizationId: params.organizationId },
  });
  if (!order) return;
  if (order.status === "paid") return;

  await prisma.$transaction(async (tx) => {
    await tx.storefrontOrder.update({
      where: { id: order.id },
      data: { paymentStatus: "failed" },
    });

    await tx.storefrontOrderEvent.create({
      data: {
        orderId: order.id,
        kind: "payment_failed",
        message: params.message ?? "Card payment failed",
        metadata: { stripePaymentIntentId: params.stripePaymentIntentId },
      },
    });

    const existing = await tx.storefrontPaymentRecord.findUnique({
      where: { stripePaymentIntentId: params.stripePaymentIntentId },
    });
    if (existing) {
      await tx.storefrontPaymentRecord.update({
        where: { stripePaymentIntentId: params.stripePaymentIntentId },
        data: { status: "failed" },
      });
    } else {
      await tx.storefrontPaymentRecord.create({
        data: {
          orderId: order.id,
          provider: "stripe",
          amount: order.total,
          currency: order.currency,
          status: "failed",
          stripePaymentIntentId: params.stripePaymentIntentId,
        },
      });
    }
  });
}
