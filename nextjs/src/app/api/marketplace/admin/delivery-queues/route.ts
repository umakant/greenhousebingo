import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardMarketplaceAdmin } from "@/lib/marketplace-admin-api-guard";
import { serializeQueue } from "@/lib/marketplace-service";

export async function GET(req: NextRequest) {
  const denied = await guardMarketplaceAdmin(req, "marketplace.delivery_queue.view");
  if (denied) return denied;

  const queues = await prisma.marketplaceDeliveryQueue.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { deliveries: true } } },
  });

  return NextResponse.json({ ok: true, items: queues.map(serializeQueue) });
}

export async function POST(req: NextRequest) {
  const denied = await guardMarketplaceAdmin(req, "marketplace.delivery_queue.manage");
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ ok: false, message: "Queue name is required." }, { status: 400 });
  }

  const queue = await prisma.marketplaceDeliveryQueue.create({
    data: {
      name,
      description: String(body.description ?? "").trim() || null,
      region: String(body.region ?? "").trim() || null,
      status: String(body.status ?? "active").trim() || "active",
    },
    include: { _count: { select: { deliveries: true } } },
  });

  return NextResponse.json({ ok: true, item: serializeQueue(queue) }, { status: 201 });
}
