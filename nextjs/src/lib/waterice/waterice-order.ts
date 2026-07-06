import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { STOREFRONT_EVENTS, publishStorefrontEvent } from "@/lib/storefront/storefront-event-bus";
import type { CleanItem, CheckoutTotals } from "@/lib/waterice/checkout-pricing";

function genOrderNumber(): string {
  return `WIE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * Create a Water Ice Express landing-checkout order as a `StorefrontOrder`
 * (`source: "waterice"`) so it appears in the storefront Orders admin. Line
 * items come from the static ebook/flavor catalog, so they carry no `productId`.
 */
export async function createWaterIceOrder(params: {
  organizationId: bigint;
  websiteId: bigint;
  crmCustomerId: bigint | null;
  customerEmail: string;
  customerName: string | null;
  items: CleanItem[];
  totals: CheckoutTotals;
  shippingAddress: Prisma.InputJsonValue | null;
  billingAddress: Prisma.InputJsonValue | null;
}) {
  const orderNumber = genOrderNumber();

  return prisma.$transaction(async (tx) => {
    const order = await tx.storefrontOrder.create({
      data: {
        organizationId: params.organizationId,
        websiteId: params.websiteId,
        orderNumber,
        source: "waterice",
        status: "pending_payment",
        paymentStatus: "unpaid",
        subtotal: params.totals.subtotal,
        taxTotal: params.totals.tax,
        shippingTotal: params.totals.shipping,
        discountTotal: params.totals.discount,
        total: params.totals.total,
        currency: "USD",
        customerEmail: params.customerEmail.trim(),
        customerName: params.customerName?.trim() || null,
        shippingAddress: params.shippingAddress ?? undefined,
        billingAddress: params.billingAddress ?? params.shippingAddress ?? undefined,
        crmCustomerId: params.crmCustomerId ?? undefined,
        fulfillmentStatus: "unfulfilled",
      },
    });

    for (const item of params.items) {
      const lineTotal = +(item.price * item.qty).toFixed(2);
      await tx.storefrontOrderLine.create({
        data: {
          orderId: order.id,
          productId: null,
          variantKey: item.format || "",
          name: item.title,
          sku: null,
          quantity: item.qty,
          unitPrice: item.price,
          lineTotal,
        },
      });
    }

    await tx.storefrontShipment.create({
      data: { orderId: order.id, status: "pending" },
    });

    await tx.storefrontOrderEvent.create({
      data: {
        orderId: order.id,
        kind: "created",
        message: "Water Ice Express order created — awaiting payment",
      },
    });

    return order;
  }).then(async (order) => {
    await publishStorefrontEvent({
      organizationId: params.organizationId,
      websiteId: params.websiteId,
      eventType: STOREFRONT_EVENTS.ORDER_CREATED,
      resourceType: "storefront_order",
      resourceId: order.id.toString(),
      message: `Order ${order.orderNumber} created`,
      metadata: { orderNumber: order.orderNumber, total: Number(order.total), source: "waterice" },
    });
    return order;
  });
}
