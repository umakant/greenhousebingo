import { NextResponse, type NextRequest } from "next/server";

import { guardCompanyMarketplaceBySlug } from "@/lib/marketplace-company-guard-slug";
import { prisma } from "@/lib/prisma";
import { serializeOrderV2 } from "@/lib/marketplace-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companySlug: string; orderId: string }> },
) {
  const { companySlug, orderId } = await params;
  const guard = await guardCompanyMarketplaceBySlug(req, companySlug, "marketplace.orders.view");
  if (!guard.ok) return guard.response;

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
