import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardMarketplaceVendor } from "@/lib/marketplace-vendor-api-guard";

export async function GET(req: NextRequest) {
  const session = await guardMarketplaceVendor(req, "marketplace.vendor_portal.dashboard.view");
  if (session instanceof NextResponse) return session;

  const vendorId = session.vendorId;

  const [vendor, productCount, orderCount, revenueAgg, openDeliveries, queueCount] = await Promise.all([
    prisma.marketplaceVendor.findFirst({
      where: { id: vendorId },
      select: { name: true, status: true },
    }),
    prisma.marketplaceProduct.count({ where: { vendorId } }),
    prisma.marketplaceOrder.count({ where: { vendorId, status: { not: "cancelled" } } }),
    prisma.marketplaceOrder.aggregate({
      where: { vendorId, status: { not: "cancelled" } },
      _sum: { total: true },
    }),
    prisma.marketplaceDelivery.count({
      where: {
        order: { vendorId },
        status: { notIn: ["delivered", "failed"] },
      },
    }),
    prisma.deliveryCityQueue.count({ where: { vendorId } }),
  ]);

  return NextResponse.json({
    ok: true,
    vendorName: vendor?.name ?? null,
    stats: {
      productCount,
      orderCount,
      openDeliveries,
      queueCount,
      grossRevenue: Number(revenueAgg._sum.total ?? 0),
    },
  });
}
