import { NextResponse, type NextRequest } from "next/server";

import { guardMarketplaceCompany } from "@/lib/marketplace-company-api-guard";
import { serializeOrderV2 } from "@/lib/marketplace-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await guardMarketplaceCompany(req, "marketplace.orders.view");
  if (!guard.ok) return guard.response;

  const orders = await prisma.marketplaceOrder.findMany({
    where: { buyerOrganizationId: guard.ctx.organizationId },
    orderBy: { createdAt: "desc" },
    include: { items: true, vendor: { select: { name: true } } },
  });

  return NextResponse.json({ ok: true, items: orders.map(serializeOrderV2) });
}
