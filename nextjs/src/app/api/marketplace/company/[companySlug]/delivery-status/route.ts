import { NextResponse, type NextRequest } from "next/server";

import { guardCompanyMarketplaceBySlug } from "@/lib/marketplace-company-guard-slug";
import { prisma } from "@/lib/prisma";
import { serializeCityQueue, serializeDeliveryEventV2 } from "@/lib/marketplace-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  const guard = await guardCompanyMarketplaceBySlug(req, companySlug, "marketplace.view");
  if (!guard.ok) return guard.response;

  // The org's orders define which vendor/city/state queues are relevant.
  const orders = await prisma.marketplaceOrder.findMany({
    where: { buyerOrganizationId: guard.ctx.organizationId, vendorId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      vendorId: true,
      city: true,
      state: true,
      deliveryStatus: true,
      totalBucketCount: true,
      createdAt: true,
    },
  });

  const triples = new Map<string, { vendorId: bigint; city: string; state: string }>();
  for (const o of orders) {
    if (o.vendorId == null || !o.city || !o.state) continue;
    triples.set(`${o.vendorId.toString()}|${o.city}|${o.state}`, {
      vendorId: o.vendorId,
      city: o.city,
      state: o.state,
    });
  }
  const keys = [...triples.values()];
  const orderIds = orders.map((o) => o.id);

  const [queues, events] = await Promise.all([
    keys.length === 0
      ? Promise.resolve([])
      : prisma.deliveryCityQueue.findMany({
          where: { OR: keys.map((k) => ({ vendorId: k.vendorId, city: k.city, state: k.state })) },
          include: { vendor: { select: { name: true } } },
        }),
    // Tenant isolation: only return delivery events this company's own orders are attached to,
    // never every event in a shared city (which would leak other tenants' driver/address details).
    orderIds.length === 0
      ? Promise.resolve([])
      : prisma.deliveryEvent.findMany({
          where: {
            status: { not: "cancelled" },
            eventOrders: { some: { orderId: { in: orderIds } } },
          },
          orderBy: [{ deliveryDate: "asc" }],
        }),
  ]);

  return NextResponse.json({
    ok: true,
    orders: orders.map((o) => ({
      id: o.id.toString(),
      orderNumber: o.orderNumber,
      city: o.city,
      state: o.state,
      deliveryStatus: o.deliveryStatus ?? "queued",
      totalBucketCount: o.totalBucketCount ?? 0,
      createdAt: o.createdAt.toISOString(),
    })),
    queues: queues.map(serializeCityQueue),
    events: events.map(serializeDeliveryEventV2),
  });
}
