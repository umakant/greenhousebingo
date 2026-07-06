import { prisma } from "@/lib/prisma";

/**
 * Days 46–48 — map paid storefront orders into accounting `revenues` (modular; skips if row exists).
 */
export async function syncStorefrontPaidOrderToRevenue(opts: {
  orderId: bigint;
  organizationId: bigint;
}): Promise<bigint | null> {
  const order = await prisma.storefrontOrder.findFirst({
    where: {
      id: opts.orderId,
      organizationId: opts.organizationId,
      status: "paid",
    },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      currency: true,
      crmCustomerId: true,
      paidAt: true,
      accountingRevenueId: true,
      paymentRecords: {
        where: { status: "succeeded" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { provider: true },
      },
    },
  });
  if (!order || order.accountingRevenueId) return order?.accountingRevenueId ?? null;

  const ref = `SF-${order.orderNumber}`;
  const existing = await prisma.revenue.findFirst({
    where: { referenceNumber: ref },
    select: { id: true },
  });
  if (existing) {
    await prisma.storefrontOrder.update({
      where: { id: order.id },
      data: { accountingRevenueId: existing.id },
    });
    return existing.id;
  }

  const provider = order.paymentRecords[0]?.provider ?? "storefront";
  const paymentMethod = provider === "stripe" ? "stripe" : provider === "test" ? "test" : String(provider);

  const revenue = await prisma.revenue.create({
    data: {
      referenceNumber: ref,
      customerId: order.crmCustomerId ?? undefined,
      date: order.paidAt ?? new Date(),
      amount: order.total,
      category: "storefront",
      description: `Storefront order ${order.orderNumber} (${order.currency})`,
      paymentMethod,
      status: "completed",
      notes: `Synced from storefront_orders.id=${order.id.toString()}`,
    },
  });

  await prisma.storefrontOrder.update({
    where: { id: order.id },
    data: { accountingRevenueId: revenue.id },
  });

  await prisma.storefrontOrderEvent.create({
    data: {
      orderId: order.id,
      kind: "accounting_sync",
      message: "Revenue recorded in accounting module",
      metadata: { revenueId: revenue.id.toString(), referenceNumber: ref },
    },
  });

  return revenue.id;
}
