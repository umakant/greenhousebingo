import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardMarketplaceCompany } from "@/lib/marketplace-company-api-guard";
import { serializeDelivery, serializeOrder } from "@/lib/marketplace-service";

function parseId(id: string): bigint | null {
  try {
    return BigInt(id);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const guard = await guardMarketplaceCompany(req, "marketplace.orders.view");
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const orderId = parseId(id);
  if (!orderId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const order = await prisma.marketplaceOrder.findFirst({
    where: { id: orderId, buyerOrganizationId: guard.ctx.organizationId },
    include: { lines: true },
  });
  if (!order) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const deliveries = await prisma.marketplaceDelivery.findMany({
    where: { orderId, buyerOrganizationId: guard.ctx.organizationId },
    orderBy: { createdAt: "desc" },
    include: {
      order: { select: { orderNumber: true } },
      queue: { select: { name: true } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });

  return NextResponse.json({
    ok: true,
    item: serializeOrder(order),
    deliveries: deliveries.map(serializeDelivery),
  });
}
