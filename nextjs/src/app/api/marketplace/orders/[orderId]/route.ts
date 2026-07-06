import { NextResponse, type NextRequest } from "next/server";

import { guardMarketplaceCompany } from "@/lib/marketplace-company-api-guard";
import { serializeOrderV2 } from "@/lib/marketplace-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const guard = await guardMarketplaceCompany(req, "marketplace.orders.view");
  if (!guard.ok) return guard.response;

  const { orderId } = await params;
  let id: bigint;
  try {
    id = BigInt(orderId);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid order id" }, { status: 400 });
  }

  const order = await prisma.marketplaceOrder.findFirst({
    where: { id, buyerOrganizationId: guard.ctx.organizationId },
    include: { items: true, vendor: { select: { name: true } } },
  });
  if (!order) {
    return NextResponse.json({ ok: false, message: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item: serializeOrderV2(order) });
}
