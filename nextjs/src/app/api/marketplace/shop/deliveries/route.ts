import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardMarketplaceCompany } from "@/lib/marketplace-company-api-guard";
import { serializeDelivery } from "@/lib/marketplace-service";

export async function GET(req: NextRequest) {
  const guard = await guardMarketplaceCompany(req, "marketplace.orders.view");
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") ?? "").trim();

  const where: Record<string, unknown> = { buyerOrganizationId: guard.ctx.organizationId };
  if (status) where.status = status;

  const deliveries = await prisma.marketplaceDelivery.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      order: { select: { orderNumber: true } },
      queue: { select: { name: true } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });

  return NextResponse.json({ ok: true, items: deliveries.map(serializeDelivery) });
}
