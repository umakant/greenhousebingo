import { NextResponse, type NextRequest } from "next/server";

import { guardMarketplaceAdmin } from "@/lib/marketplace-admin-api-guard";
import {
  encodeCityStateParam,
  normalizeCityState,
  QUEUE_STATUS_READY,
} from "@/lib/marketplace/deliveryQueue";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const COUNTED_ORDER_STATUSES = ["paid", "scheduled"];

/**
 * City delivery-queue board. One row per vendor+city+state accumulation queue,
 * enriched with revenue collected and unique company count derived from orders.
 */
export async function GET(req: NextRequest) {
  const denied = await guardMarketplaceAdmin(req, "marketplace.delivery_queue.view");
  if (denied) return denied;

  const [queues, orders] = await Promise.all([
    prisma.deliveryCityQueue.findMany({
      orderBy: [{ queueStatus: "asc" }, { city: "asc" }],
      include: { vendor: { select: { name: true } } },
    }),
    prisma.marketplaceOrder.findMany({
      where: {
        OR: [
          { paymentStatus: "paid" },
          { status: { in: COUNTED_ORDER_STATUSES } },
          { orderStatus: { in: COUNTED_ORDER_STATUSES } },
        ],
      },
      select: {
        vendorId: true,
        city: true,
        state: true,
        total: true,
        totalAmount: true,
        currency: true,
        companyId: true,
        buyerOrganizationId: true,
      },
    }),
  ]);

  // Aggregate revenue + unique companies per normalized vendor/city/state key.
  type Agg = { revenue: number; companies: Set<string>; currency: string };
  const byKey = new Map<string, Agg>();
  for (const o of orders) {
    if (o.vendorId == null) continue;
    const norm = normalizeCityState(o.city ?? "", o.state ?? "");
    const key = `${o.vendorId.toString()}~${norm.city}~${norm.state}`;
    const agg = byKey.get(key) ?? { revenue: 0, companies: new Set<string>(), currency: o.currency || "USD" };
    agg.revenue += Number(o.totalAmount ?? o.total ?? 0);
    agg.companies.add(o.companyId ? o.companyId.toString() : `org:${o.buyerOrganizationId.toString()}`);
    byKey.set(key, agg);
  }

  const events = await prisma.deliveryEvent.findMany({
    where: { deliveryDate: { not: null } },
    orderBy: [{ deliveryDate: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      vendorId: true,
      city: true,
      state: true,
      deliveryDate: true,
      startTime: true,
      endTime: true,
      status: true,
    },
  });

  const eventByKey = new Map<string, (typeof events)[number]>();
  for (const e of events) {
    const norm = normalizeCityState(e.city, e.state);
    const key = `${e.vendorId.toString()}~${norm.city}~${norm.state}`;
    if (!eventByKey.has(key)) eventByKey.set(key, e);
  }

  const items = queues.map((q) => {
    const key = `${q.vendorId.toString()}~${q.city}~${q.state}`;
    const agg = byKey.get(key);
    const required = q.requiredBucketMinimum || 0;
    const progressPercent = required > 0 ? Math.min(100, Math.round((q.currentBucketTotal / required) * 100)) : 100;
    const evt = eventByKey.get(key);
    return {
      id: q.id.toString(),
      param: encodeCityStateParam(q.vendorId, q.city, q.state),
      vendorId: q.vendorId.toString(),
      vendorName: q.vendor?.name ?? null,
      city: q.city,
      state: q.state,
      bucketsOrdered: q.currentBucketTotal,
      requiredBucketMinimum: q.requiredBucketMinimum,
      progressPercent,
      companyCount: agg ? agg.companies.size : q.companyCount,
      totalRevenue: agg ? Math.round(agg.revenue * 100) / 100 : 0,
      currency: agg?.currency ?? "USD",
      queueStatus: q.queueStatus,
      isReady: q.queueStatus === QUEUE_STATUS_READY,
      nextDeliveryEvent: evt
        ? {
            id: evt.id.toString(),
            deliveryDate: evt.deliveryDate?.toISOString() ?? null,
            startTime: evt.startTime,
            endTime: evt.endTime,
            status: evt.status,
          }
        : null,
    };
  });

  const totalRevenue = Math.round(items.reduce((s, i) => s + i.totalRevenue, 0) * 100) / 100;
  const companyTotal = items.reduce((s, i) => s + i.companyCount, 0);
  const deliveryMinimum = items[0]?.requiredBucketMinimum ?? 50;

  return NextResponse.json({
    ok: true,
    items,
    summary: {
      totalCities: items.length,
      ready: items.filter((i) => i.queueStatus === "ready_to_schedule").length,
      waiting: items.filter((i) => i.queueStatus === "waiting").length,
      scheduled: items.filter((i) => i.queueStatus === "scheduled").length,
      totalRevenue,
      companyTotal,
      deliveryMinimum,
    },
  });
}
