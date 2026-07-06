import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardMarketplaceAdmin } from "@/lib/marketplace-admin-api-guard";
import { MARKETPLACE_DELIVERY_STATUSES, serializeDelivery } from "@/lib/marketplace-service";

function parseId(id: string): bigint | null {
  try {
    return BigInt(id);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardMarketplaceAdmin(req, "marketplace.delivery_events.create");
  if (denied) return denied;

  const { id } = await ctx.params;
  const deliveryId = parseId(id);
  if (!deliveryId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const delivery = await prisma.marketplaceDelivery.findFirst({
    where: { id: deliveryId },
    select: { id: true },
  });
  if (!delivery) return NextResponse.json({ ok: false, message: "Delivery not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const status = String(body.status ?? "").trim();
  if (!MARKETPLACE_DELIVERY_STATUSES.includes(status as (typeof MARKETPLACE_DELIVERY_STATUSES)[number])) {
    return NextResponse.json({ ok: false, message: "Invalid delivery status." }, { status: 400 });
  }
  const note = String(body.note ?? "").trim() || null;

  const uidRaw = req.cookies.get("pf_user_id")?.value?.trim();
  let createdByUserId: bigint | null = null;
  if (uidRaw) {
    try {
      createdByUserId = BigInt(uidRaw);
    } catch {
      createdByUserId = null;
    }
  }

  await prisma.marketplaceDeliveryEvent.create({
    data: { deliveryId, status, note, createdByUserId },
  });

  // Keep the delivery's current status in sync with the latest event.
  await prisma.marketplaceDelivery.update({
    where: { id: deliveryId },
    data: {
      status,
      deliveredAt: status === "delivered" ? new Date() : undefined,
      updatedAt: new Date(),
    },
  });

  const updated = await prisma.marketplaceDelivery.findFirst({
    where: { id: deliveryId },
    include: {
      order: { select: { orderNumber: true } },
      queue: { select: { name: true } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });

  return NextResponse.json({ ok: true, item: updated ? serializeDelivery(updated) : null }, { status: 201 });
}
