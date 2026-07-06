import { NextResponse, type NextRequest } from "next/server";

import { decodeCityStateParam, getOrdersForCityQueue } from "@/lib/marketplace/deliveryQueue";
import { guardMarketplaceAdmin } from "@/lib/marketplace-admin-api-guard";
import { notifyMarketplaceDeliveryScheduled } from "@/lib/marketplace-notification-service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDER_SCHEDULED = "scheduled";
const DELIVERY_STATUS_SCHEDULED = "scheduled";
const QUEUE_STATUS_SCHEDULED = "scheduled";

/**
 * Schedules a delivery for a city queue:
 *  1. Create a DeliveryEvent from the form.
 *  2. Attach every paid/scheduled order in the city to the event.
 *  3. Mark those orders orderStatus = scheduled, deliveryStatus = scheduled.
 *  4. Mark the city queue queueStatus = scheduled.
 *  5. Email every company in the city that their delivery is scheduled.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ cityState: string }> }) {
  const denied = await guardMarketplaceAdmin(req, "marketplace.delivery_events.create");
  if (denied) return denied;

  const { cityState } = await params;
  const decoded = decodeCityStateParam(cityState);
  if (!decoded) {
    return NextResponse.json({ ok: false, message: "Invalid city/state." }, { status: 400 });
  }
  const { vendorId, city, state } = decoded;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const deliveryDateRaw = String(body.deliveryDate ?? "").trim();
  const startTime = String(body.startTime ?? "").trim() || null;
  const endTime = String(body.endTime ?? "").trim() || null;
  const deliveryAddress = String(body.deliveryAddress ?? "").trim() || null;
  const deliveryNotes = String(body.deliveryNotes ?? "").trim() || null;
  const driverName = String(body.driverName ?? "").trim() || null;
  const driverPhone = String(body.driverPhone ?? "").trim() || null;

  if (!deliveryDateRaw) {
    return NextResponse.json({ ok: false, message: "Delivery date is required." }, { status: 400 });
  }
  const deliveryDate = new Date(deliveryDateRaw);
  if (Number.isNaN(deliveryDate.getTime())) {
    return NextResponse.json({ ok: false, message: "Invalid delivery date." }, { status: 400 });
  }

  const vendor = await prisma.marketplaceVendor.findFirst({
    where: { id: vendorId },
    select: { id: true, name: true },
  });
  if (!vendor) {
    return NextResponse.json({ ok: false, message: "Vendor not found." }, { status: 404 });
  }

  const orders = await getOrdersForCityQueue(vendorId, city, state, undefined, { alreadyNormalized: true });
  if (orders.length === 0) {
    return NextResponse.json(
      { ok: false, message: "There are no paid orders in this city to schedule." },
      { status: 400 },
    );
  }
  const orderIds = orders.map((o) => BigInt(o.id));

  const result = await prisma.$transaction(async (tx) => {
    const cityQueue = await tx.deliveryCityQueue.findUnique({
      where: { vendorId_city_state: { vendorId, city, state } },
      select: { id: true },
    });

    const event = await tx.deliveryEvent.create({
      data: {
        vendorId,
        cityQueueId: cityQueue?.id ?? null,
        city,
        state,
        deliveryDate,
        startTime,
        endTime,
        deliveryAddress,
        deliveryNotes,
        driverName,
        driverPhone,
        status: "scheduled",
      },
    });

    // Attach all city orders to the event.
    await tx.deliveryEventOrder.createMany({
      data: orders.map((o) => ({
        deliveryEventId: event.id,
        orderId: BigInt(o.id),
        companyId: o.companyId ? BigInt(o.companyId) : null,
        status: "pending",
      })),
      skipDuplicates: true,
    });

    // Move the orders to scheduled.
    await tx.marketplaceOrder.updateMany({
      where: { id: { in: orderIds } },
      data: {
        orderStatus: ORDER_SCHEDULED,
        status: ORDER_SCHEDULED,
        deliveryStatus: DELIVERY_STATUS_SCHEDULED,
        updatedAt: new Date(),
      },
    });

    // Flip the city queue to scheduled.
    if (cityQueue) {
      await tx.deliveryCityQueue.update({
        where: { id: cityQueue.id },
        data: { queueStatus: QUEUE_STATUS_SCHEDULED, updatedAt: new Date() },
      });
    }

    return { eventId: event.id.toString() };
  });

  // Notify every unique company in the city (fire-and-forget per recipient).
  try {
    const buyerOrgIds = Array.from(new Set(orders.map((o) => o.buyerOrganizationId)));
    const buyers = await prisma.user.findMany({
      where: { id: { in: buyerOrgIds.map((id) => BigInt(id)) } },
      select: { id: true, name: true, email: true },
    });
    const orderNumbersByOrg = new Map<string, string[]>();
    for (const o of orders) {
      const list = orderNumbersByOrg.get(o.buyerOrganizationId) ?? [];
      list.push(o.orderNumber);
      orderNumbersByOrg.set(o.buyerOrganizationId, list);
    }
    const deliveryDateLabel = deliveryDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const deliveryTimeLabel = [startTime, endTime].filter(Boolean).join(" – ") || null;
    for (const buyer of buyers) {
      const to = (buyer.email ?? "").trim();
      if (!to) continue;
      void notifyMarketplaceDeliveryScheduled({
        organizationId: buyer.id,
        toEmail: to,
        recipientName: buyer.name,
        companyName: buyer.name,
        orderNumbers: orderNumbersByOrg.get(buyer.id.toString()) ?? [],
        vendorName: vendor.name,
        city,
        state,
        deliveryDate: deliveryDateLabel,
        deliveryTime: deliveryTimeLabel,
        deliveryAddress,
        driverName,
        driverPhone,
        deliveryNotes,
      }).catch(() => undefined);
    }
  } catch {
    /* email is best-effort */
  }

  return NextResponse.json(
    { ok: true, eventId: result.eventId, scheduledOrders: orderIds.length },
    { status: 201 },
  );
}
