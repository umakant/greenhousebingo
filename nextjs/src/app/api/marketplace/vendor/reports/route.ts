import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardMarketplaceVendor } from "@/lib/marketplace-vendor-api-guard";

export async function GET(req: NextRequest) {
  const session = await guardMarketplaceVendor(req, "marketplace.vendor_portal.reports.view");
  if (session instanceof NextResponse) return session;

  const vendorId = session.vendorId;

  const [byStatus, byPayment, revenueAgg, orderCount, topProducts] = await Promise.all([
    prisma.marketplaceOrder.groupBy({
      by: ["status"],
      where: { vendorId },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.marketplaceOrder.groupBy({
      by: ["paymentStatus"],
      where: { vendorId },
      _count: { _all: true },
    }),
    prisma.marketplaceOrder.aggregate({
      _sum: { total: true },
      where: { vendorId, status: { not: "cancelled" } },
    }),
    prisma.marketplaceOrder.count({ where: { vendorId } }),
    prisma.marketplaceOrderLine.groupBy({
      by: ["productId"],
      where: { vendorId },
      _sum: { lineTotal: true, quantity: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 5,
    }),
  ]);

  const productIds = topProducts.map((p) => p.productId).filter((id): id is bigint => id != null);
  const products = productIds.length
    ? await prisma.marketplaceProduct.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(products.map((p) => [p.id.toString(), p.name]));

  return NextResponse.json({
    ok: true,
    summary: {
      grossRevenue: Number(revenueAgg._sum.total ?? 0),
      orderCount,
    },
    ordersByStatus: byStatus.map((r) => ({
      status: r.status,
      count: r._count._all,
      total: Number(r._sum.total ?? 0),
    })),
    ordersByPayment: byPayment.map((r) => ({
      paymentStatus: r.paymentStatus,
      count: r._count._all,
    })),
    topVendors: topProducts.map((p) => ({
      vendorId: vendorId.toString(),
      vendorName: p.productId ? nameById.get(p.productId.toString()) ?? "Product" : "Unknown",
      revenue: Number(p._sum.lineTotal ?? 0),
      unitsSold: Number(p._sum.quantity ?? 0),
    })),
  });
}
