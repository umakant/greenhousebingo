import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardMarketplaceAdmin } from "@/lib/marketplace-admin-api-guard";

export async function GET(req: NextRequest) {
  const denied = await guardMarketplaceAdmin(req, "marketplace.reports.view");
  if (denied) return denied;

  const [byStatus, byPayment, revenueAgg, orderCount, topVendors] = await Promise.all([
    prisma.marketplaceOrder.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.marketplaceOrder.groupBy({
      by: ["paymentStatus"],
      _count: { _all: true },
    }),
    prisma.marketplaceOrder.aggregate({
      _sum: { total: true },
      where: { status: { not: "cancelled" } },
    }),
    prisma.marketplaceOrder.count(),
    prisma.marketplaceOrderLine.groupBy({
      by: ["vendorId"],
      _sum: { lineTotal: true, quantity: true },
      orderBy: { _sum: { lineTotal: "desc" } },
      take: 5,
    }),
  ]);

  const vendorIds = topVendors
    .map((v) => v.vendorId)
    .filter((v): v is bigint => v != null);
  const vendorNames = vendorIds.length
    ? await prisma.marketplaceVendor.findMany({
        where: { id: { in: vendorIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(vendorNames.map((v) => [v.id.toString(), v.name]));

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
    topVendors: topVendors.map((v) => ({
      vendorId: v.vendorId == null ? null : v.vendorId.toString(),
      vendorName: v.vendorId == null ? "Unassigned" : nameById.get(v.vendorId.toString()) ?? "Unknown",
      revenue: Number(v._sum.lineTotal ?? 0),
      unitsSold: Number(v._sum.quantity ?? 0),
    })),
  });
}
