import { NextResponse, type NextRequest } from "next/server";

import { guardMarketplaceAdmin } from "@/lib/marketplace-admin-api-guard";
import {
  decodeCityStateParam,
  getCityQueueProgress,
  getOrdersForCityQueue,
} from "@/lib/marketplace/deliveryQueue";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * City queue detail: queue progress, the orders accumulating in it, a product-level
 * breakdown, the unique companies involved, and any already-scheduled delivery event.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ cityState: string }> }) {
  const denied = await guardMarketplaceAdmin(req, "marketplace.delivery_queue.view");
  if (denied) return denied;

  const { cityState } = await params;
  const decoded = decodeCityStateParam(cityState);
  if (!decoded) {
    return NextResponse.json({ ok: false, message: "Invalid city/state." }, { status: 400 });
  }
  const { vendorId, city, state } = decoded;

  const [vendor, progress, orders] = await Promise.all([
    prisma.marketplaceVendor.findFirst({ where: { id: vendorId }, select: { id: true, name: true } }),
    getCityQueueProgress(vendorId, city, state),
    getOrdersForCityQueue(vendorId, city, state, undefined, { alreadyNormalized: true }),
  ]);

  if (!vendor) {
    return NextResponse.json({ ok: false, message: "Vendor not found." }, { status: 404 });
  }

  const orderIds = orders.map((o) => BigInt(o.id));

  // Load items + buyer emails for the orders in this queue.
  const [items, buyers, existingEvents] = await Promise.all([
    orderIds.length
      ? prisma.marketplaceOrderItem.findMany({
          where: { orderId: { in: orderIds } },
          select: {
            orderId: true,
            productId: true,
            productName: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            bucketCountValue: true,
          },
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: { id: { in: orders.map((o) => BigInt(o.buyerOrganizationId)) } },
      select: { id: true, name: true, email: true },
    }),
    prisma.deliveryEvent.findMany({
      where: { vendorId, city, state },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { eventOrders: true } } },
    }),
  ]);

  const buyerById = new Map(buyers.map((b) => [b.id.toString(), b]));

  // Product breakdown: aggregate quantity + buckets + revenue per product.
  type Breakdown = { productName: string; quantity: number; buckets: number; revenue: number };
  const breakdownByName = new Map<string, Breakdown>();
  for (const it of items) {
    const b = breakdownByName.get(it.productName) ?? {
      productName: it.productName,
      quantity: 0,
      buckets: 0,
      revenue: 0,
    };
    b.quantity += it.quantity;
    b.buckets += (it.bucketCountValue ?? 0) * it.quantity;
    b.revenue += Number(it.totalPrice ?? 0);
    breakdownByName.set(it.productName, b);
  }

  const orderRows = orders.map((o) => {
    const buyer = buyerById.get(o.buyerOrganizationId);
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      companyId: o.companyId,
      companyName: buyer?.name ?? null,
      companyEmail: buyer?.email ?? null,
      orderStatus: o.orderStatus ?? o.status,
      deliveryStatus: o.deliveryStatus,
      totalBucketCount: o.totalBucketCount,
      createdAt: o.createdAt.toISOString(),
    };
  });

  const currency = "USD";
  const revenueCollected = await prisma.marketplaceOrder
    .aggregate({
      where: { id: { in: orderIds.length ? orderIds : [BigInt(-1)] } },
      _sum: { totalAmount: true, total: true },
    })
    .then((r) => Number(r._sum.totalAmount ?? r._sum.total ?? 0));

  const uniqueCompanies = new Set(orders.map((o) => o.companyId ?? `org:${o.buyerOrganizationId}`));

  return NextResponse.json({
    ok: true,
    vendor: { id: vendor.id.toString(), name: vendor.name },
    queue: {
      city: progress.city,
      state: progress.state,
      bucketsOrdered: progress.currentBucketTotal,
      requiredBucketMinimum: progress.requiredBucketMinimum,
      progressPercent: progress.progressPercent,
      companyCount: uniqueCompanies.size,
      queueStatus: progress.queueStatus,
      exists: progress.exists,
      currency,
    },
    revenueCollected: Math.round(revenueCollected * 100) / 100,
    orders: orderRows,
    productBreakdown: Array.from(breakdownByName.values()).sort((a, b) => b.buckets - a.buckets),
    param: cityState,
    scheduledEvents: existingEvents.map((e) => ({
      id: e.id.toString(),
      status: e.status,
      deliveryDate: e.deliveryDate ? e.deliveryDate.toISOString() : null,
      startTime: e.startTime,
      endTime: e.endTime,
      driverName: e.driverName,
      orderCount: e._count.eventOrders,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
