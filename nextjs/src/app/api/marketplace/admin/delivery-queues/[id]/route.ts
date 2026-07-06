import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardMarketplaceAdmin } from "@/lib/marketplace-admin-api-guard";
import { serializeQueue } from "@/lib/marketplace-service";

function parseId(id: string): bigint | null {
  try {
    return BigInt(id);
  } catch {
    return null;
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardMarketplaceAdmin(req, "marketplace.delivery_queue.manage");
  if (denied) return denied;

  const { id } = await ctx.params;
  const queueId = parseId(id);
  if (!queueId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name != null) data.name = String(body.name).trim();
  if (body.description != null) data.description = String(body.description).trim() || null;
  if (body.region != null) data.region = String(body.region).trim() || null;
  if (body.status != null) data.status = String(body.status).trim() || "active";

  const queue = await prisma.marketplaceDeliveryQueue.update({
    where: { id: queueId },
    data,
    include: { _count: { select: { deliveries: true } } },
  });

  return NextResponse.json({ ok: true, item: serializeQueue(queue) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardMarketplaceAdmin(req, "marketplace.delivery_queue.manage");
  if (denied) return denied;

  const { id } = await ctx.params;
  const queueId = parseId(id);
  if (!queueId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  await prisma.marketplaceDeliveryQueue.delete({ where: { id: queueId } });
  return NextResponse.json({ ok: true });
}
