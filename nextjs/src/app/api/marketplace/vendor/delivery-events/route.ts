import { NextResponse, type NextRequest } from "next/server";

import { guardMarketplaceVendor } from "@/lib/marketplace-vendor-api-guard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await guardMarketplaceVendor(req, "marketplace.vendor_portal.delivery_queue.view");
  if (session instanceof NextResponse) return session;

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") ?? "").trim();

  const where: Record<string, unknown> = { vendorId: session.vendorId };
  if (status) where.status = status;

  const events = await prisma.deliveryEvent.findMany({
    where,
    orderBy: [{ deliveryDate: "desc" }, { createdAt: "desc" }],
    include: {
      vendor: { select: { name: true } },
      _count: { select: { eventOrders: true } },
      eventOrders: {
        select: {
          order: { select: { total: true, totalAmount: true, currency: true } },
        },
      },
    },
  });

  const items = events.map((e) => {
    const revenue = e.eventOrders.reduce(
      (sum, eo) => sum + Number(eo.order?.totalAmount ?? eo.order?.total ?? 0),
      0,
    );
    const currency = e.eventOrders[0]?.order?.currency ?? "USD";
    return {
      id: e.id.toString(),
      vendorId: e.vendorId.toString(),
      vendorName: e.vendor?.name ?? null,
      city: e.city,
      state: e.state,
      deliveryDate: e.deliveryDate ? e.deliveryDate.toISOString() : null,
      startTime: e.startTime,
      endTime: e.endTime,
      deliveryAddress: e.deliveryAddress,
      deliveryNotes: e.deliveryNotes,
      driverName: e.driverName,
      driverPhone: e.driverPhone,
      status: e.status,
      orderCount: e._count.eventOrders,
      totalRevenue: Math.round(revenue * 100) / 100,
      currency,
      createdAt: e.createdAt.toISOString(),
    };
  });

  const totalRevenue = Math.round(items.reduce((s, i) => s + i.totalRevenue, 0) * 100) / 100;

  return NextResponse.json({
    ok: true,
    items,
    summary: {
      total: items.length,
      scheduled: items.filter((i) => i.status === "scheduled").length,
      completed: items.filter((i) => i.status === "completed" || i.status === "delivered").length,
      cancelled: items.filter((i) => i.status === "cancelled").length,
      totalRevenue,
    },
  });
}
