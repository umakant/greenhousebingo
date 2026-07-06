import "server-only";

import { prisma } from "@/lib/prisma";
import { getSuperadminId } from "@/lib/settings-service";

/** Reference prefixes keep marketplace rows identifiable and idempotent in the accounting tables. */
const REVENUE_REF_PREFIX = "MP-";
const PAYMENT_REF_PREFIX = "MP-PAY-";

function genCustomerCode(): string {
  return `MP-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Find-or-create the accounting `Customer` representing a buying company, scoped to the
 * platform accounting owner. Matches on the company's email within that owner's books.
 */
async function findOrCreateMarketplaceCustomer(opts: {
  ownerId: bigint;
  companyUserId: bigint;
  name: string | null;
  email: string | null;
}): Promise<bigint | null> {
  const email = (opts.email ?? "").trim().toLowerCase();
  if (email) {
    const existing = await prisma.customer.findFirst({
      where: { createdBy: opts.ownerId, contactPersonEmail: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) return existing.id;
  } else {
    // No email — fall back to matching a previously linked customer for this company user.
    const existing = await prisma.customer.findFirst({
      where: { createdBy: opts.ownerId, userId: opts.companyUserId },
      select: { id: true },
    });
    if (existing) return existing.id;
  }

  const created = await prisma.customer.create({
    data: {
      userId: opts.companyUserId,
      customerCode: genCustomerCode(),
      companyName: opts.name?.trim() || (email ? email.split("@")[0] : "Marketplace company") || "Marketplace company",
      contactPersonName: opts.name?.trim() || "Company",
      contactPersonEmail: email || `company-${opts.companyUserId.toString()}@marketplace.local`,
      contactPersonMobile: null,
      createdBy: opts.ownerId,
    },
    select: { id: true },
  });
  return created.id;
}

export type MarketplaceAccountingResult = {
  revenueId: bigint | null;
  customerPaymentId: bigint | null;
};

/**
 * Record accounting entries for a PAID marketplace order:
 * - a `Revenue` row (category "marketplace"), and
 * - a `CustomerPayment` row that stores the Stripe payment reference.
 *
 * Idempotent (keyed on the `MP-`/`MP-PAY-` reference numbers and the order's link columns) and
 * best-effort — designed to be wrapped in try/catch so it never breaks checkout. Only call for
 * orders whose `paymentStatus === "paid"`.
 */
export async function syncMarketplacePaidOrderToAccounting(opts: {
  orderId: bigint;
}): Promise<MarketplaceAccountingResult> {
  const order = await prisma.marketplaceOrder.findFirst({
    where: { id: opts.orderId },
    select: {
      id: true,
      orderNumber: true,
      buyerOrganizationId: true,
      paymentStatus: true,
      total: true,
      totalAmount: true,
      currency: true,
      stripePaymentIntentId: true,
      accountingRevenueId: true,
      accountingCustomerPaymentId: true,
      createdAt: true,
      vendor: { select: { name: true } },
    },
  });
  if (!order) return { revenueId: null, customerPaymentId: null };
  if (order.paymentStatus !== "paid") {
    return { revenueId: order.accountingRevenueId, customerPaymentId: order.accountingCustomerPaymentId };
  }
  if (order.accountingRevenueId && order.accountingCustomerPaymentId) {
    return { revenueId: order.accountingRevenueId, customerPaymentId: order.accountingCustomerPaymentId };
  }

  const ownerId = await getSuperadminId();
  const amount = order.totalAmount == null ? order.total : order.totalAmount;
  const paymentMethod = order.stripePaymentIntentId ? "stripe" : "marketplace";
  const revenueRef = `${REVENUE_REF_PREFIX}${order.orderNumber}`;
  const paymentRef = `${PAYMENT_REF_PREFIX}${order.orderNumber}`;

  const buyer = await prisma.user.findFirst({
    where: { id: order.buyerOrganizationId },
    select: { name: true, email: true },
  });

  const customerId = await findOrCreateMarketplaceCustomer({
    ownerId,
    companyUserId: order.buyerOrganizationId,
    name: buyer?.name ?? null,
    email: buyer?.email ?? null,
  });

  // Revenue (idempotent on referenceNumber).
  let revenueId = order.accountingRevenueId ?? null;
  if (!revenueId) {
    const existing = await prisma.revenue.findFirst({ where: { referenceNumber: revenueRef }, select: { id: true } });
    if (existing) {
      revenueId = existing.id;
    } else {
      const revenue = await prisma.revenue.create({
        data: {
          referenceNumber: revenueRef,
          customerId: customerId ?? undefined,
          date: order.createdAt ?? new Date(),
          amount,
          category: "marketplace",
          description: `Marketplace order ${order.orderNumber}${order.vendor?.name ? ` · ${order.vendor.name}` : ""} (${order.currency})`,
          paymentMethod,
          status: "completed",
          notes: `Synced from marketplace_orders.id=${order.id.toString()}${order.stripePaymentIntentId ? ` · stripe_pi=${order.stripePaymentIntentId}` : ""}`,
          createdBy: ownerId,
        },
        select: { id: true },
      });
      revenueId = revenue.id;
    }
  }

  // Customer payment — stores the Stripe reference (idempotent on referenceNumber).
  let customerPaymentId = order.accountingCustomerPaymentId ?? null;
  if (!customerPaymentId && customerId) {
    const existingPay = await prisma.customerPayment.findFirst({
      where: { referenceNumber: paymentRef },
      select: { id: true },
    });
    if (existingPay) {
      customerPaymentId = existingPay.id;
    } else {
      const payment = await prisma.customerPayment.create({
        data: {
          referenceNumber: paymentRef,
          customerId,
          paymentDate: order.createdAt ?? new Date(),
          amount,
          paymentMethod,
          reference: order.stripePaymentIntentId ?? null,
          status: "completed",
          notes: `Marketplace order ${order.orderNumber}`,
          createdBy: ownerId,
        },
        select: { id: true },
      });
      customerPaymentId = payment.id;
    }
  }

  await prisma.marketplaceOrder.update({
    where: { id: order.id },
    data: {
      accountingRevenueId: revenueId ?? undefined,
      accountingCustomerPaymentId: customerPaymentId ?? undefined,
      updatedAt: new Date(),
    },
  });

  return { revenueId, customerPaymentId };
}
