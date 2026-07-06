import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardMarketplaceVendor } from "@/lib/marketplace-vendor-api-guard";
import { serializeDelivery, serializeOrder } from "@/lib/marketplace-service";
import { resolveOrderTab } from "@/lib/marketplace-order-status";

function parseId(id: string): bigint | null {
  try {
    return BigInt(id);
  } catch {
    return null;
  }
}

function formatTime12h(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const [hRaw, mRaw] = value.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw ?? 0);
  if (Number.isNaN(h)) return value;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function buildTimeline(order: {
  status: string;
  orderStatus: string | null;
  deliveryStatus: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}) {
  const tab = resolveOrderTab(order);
  const steps = [
    { key: "placed", label: "Order Placed", done: true },
    { key: "accepted", label: "Vendor Accepted", done: tab !== "pending" },
    { key: "processing", label: "Processing", done: ["processing", "out_for_delivery", "completed"].includes(tab) },
    { key: "out_for_delivery", label: "Out for Delivery", done: ["out_for_delivery", "completed"].includes(tab) },
    { key: "delivered", label: "Delivered", done: tab === "completed" },
  ];
  const activeKey =
    tab === "completed"
      ? "delivered"
      : tab === "out_for_delivery"
        ? "out_for_delivery"
        : tab === "processing"
          ? "processing"
          : "placed";
  return steps.map((s) => ({
    ...s,
    active: s.key === activeKey && !s.done,
    current: s.key === activeKey,
  }));
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await guardMarketplaceVendor(req, "marketplace.vendor_portal.orders.view");
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const orderId = parseId(id);
  if (!orderId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const order = await prisma.marketplaceOrder.findFirst({
    where: { id: orderId, vendorId: session.vendorId },
    include: {
      lines: true,
      items: { include: { product: { select: { imageUrl: true, image: true } } } },
      vendor: { select: { name: true, logoUrl: true, logo: true } },
    },
  });
  if (!order) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const [buyer, deliveries, eventLink] = await Promise.all([
    prisma.user.findFirst({
      where: { id: order.buyerOrganizationId },
      select: { id: true, name: true, email: true },
    }),
    prisma.marketplaceDelivery.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
      include: {
        order: { select: { orderNumber: true } },
        queue: { select: { name: true } },
        events: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.deliveryEventOrder.findFirst({
      where: { orderId },
      orderBy: { createdAt: "desc" },
      include: { deliveryEvent: true },
    }),
  ]);

  const delivery = deliveries[0];
  const event = eventLink?.deliveryEvent;
  const deliveryWindow =
    event?.startTime && event?.endTime
      ? `${formatTime12h(event.startTime)} – ${formatTime12h(event.endTime)}`
      : event?.startTime
        ? formatTime12h(event.startTime)
        : null;

  const address =
    event?.deliveryAddress ??
    (delivery?.addressLine
      ? `${delivery.addressLine}${delivery.city ? `, ${delivery.city}` : ""}${delivery.state ? `, ${delivery.state}` : ""}`
      : order.city && order.state
        ? `${order.city}, ${order.state}`
        : null);

  const lineItems = (order.items.length ? order.items : order.lines).map((row) => {
    const isItem = "productName" in row;
    return {
      id: row.id.toString(),
      title: isItem ? row.productName : row.title,
      quantity: row.quantity,
      unitPrice: Number(isItem ? row.unitPrice : row.unitPrice),
      lineTotal: Number(isItem ? row.totalPrice : row.lineTotal),
      imageUrl: isItem && "product" in row ? row.product?.imageUrl ?? row.product?.image ?? null : null,
      sku: null,
    };
  });

  return NextResponse.json({
    ok: true,
    item: {
      ...serializeOrder(order),
      orderStatus: order.orderStatus,
      deliveryStatus: order.deliveryStatus,
      vendorId: order.vendorId?.toString() ?? null,
      vendorName: order.vendor?.name ?? null,
      vendorLogoUrl: order.vendor?.logoUrl ?? order.vendor?.logo ?? null,
      city: order.city,
      state: order.state,
      tax: Number(order.tax ?? 0),
      deliveryFee: Number(order.deliveryFee ?? 0),
      customer: {
        name: buyer?.name ?? buyer?.email ?? "—",
        email: buyer?.email ?? null,
        phone: null,
      },
      deliveryDate: event?.deliveryDate?.toISOString() ?? delivery?.scheduledAt?.toISOString() ?? null,
      deliveryWindow,
      deliveryAddress: address,
      lineItems,
      timeline: buildTimeline(order),
    },
    deliveries: deliveries.map(serializeDelivery),
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await guardMarketplaceVendor(req, "marketplace.vendor_portal.orders.update_status");
  if (session instanceof NextResponse) return session;

  const { id } = await ctx.params;
  const orderId = parseId(id);
  if (!orderId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const existing = await prisma.marketplaceOrder.findFirst({
    where: { id: orderId, vendorId: session.vendorId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status != null) data.status = String(body.status).trim();
  if (body.orderStatus != null) data.orderStatus = String(body.orderStatus).trim();
  if (body.deliveryStatus != null) data.deliveryStatus = String(body.deliveryStatus).trim();

  const order = await prisma.marketplaceOrder.update({
    where: { id: orderId },
    data,
    include: { lines: true },
  });

  return NextResponse.json({ ok: true, item: serializeOrder(order) });
}
