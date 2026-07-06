import { prisma } from "@/lib/prisma";

/** Days 54–55 — company-scoped storefront commerce aggregates (date range). */
export async function getStorefrontCommerceAnalytics(params: {
  organizationId: bigint;
  from?: Date | null;
  to?: Date | null;
}) {
  const from = params.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = params.to ?? new Date();

  const paidWhere = {
    organizationId: params.organizationId,
    source: "storefront" as const,
    status: "paid" as const,
    paidAt: { gte: from, lte: to },
  };

  const [orderAgg, customerCount, ticketOpen, topProducts] = await Promise.all([
    prisma.storefrontOrder.aggregate({
      where: paidWhere,
      _sum: { total: true },
      _count: { id: true },
      _avg: { total: true },
    }),
    prisma.storefrontCustomer.count({
      where: {
        organizationId: params.organizationId,
        createdAt: { gte: from, lte: to },
      },
    }),
    prisma.stTicket.count({
      where: {
        organizationId: params.organizationId,
        status: { in: ["open", "pending", "waiting"] },
      },
    }),
    prisma.storefrontOrderLine.groupBy({
      by: ["productId"],
      where: {
        order: paidWhere,
        productId: { not: null },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 8,
    }),
  ]);

  const revenue = Number(orderAgg._sum.total ?? 0);
  const orderCount = orderAgg._count.id;
  const aov = orderCount > 0 ? revenue / orderCount : 0;

  const productIds = topProducts.map((r) => r.productId).filter((id): id is bigint => id != null);
  const products =
    productIds.length === 0
      ? []
      : await prisma.posProduct.findMany({
          where: { id: { in: productIds }, organizationId: params.organizationId },
          select: { id: true, name: true, slug: true },
        });
  const productMap = new Map(products.map((p) => [p.id.toString(), p]));

  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    revenue,
    orderCount,
    averageOrderValue: aov,
    newCustomers: customerCount,
    openSupportTickets: ticketOpen,
    topProducts: topProducts.map((row) => {
      const pid = row.productId?.toString();
      const p = pid ? productMap.get(pid) : undefined;
      return {
        productId: pid ?? null,
        name: p?.name ?? "Product",
        slug: p?.slug ?? null,
        quantitySold: Number(row._sum.quantity ?? 0),
      };
    }),
  };
}
