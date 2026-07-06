import { NextResponse, type NextRequest } from "next/server";

import { guardMarketplaceCompany } from "@/lib/marketplace-company-api-guard";
import { serializeCompanyVendor } from "@/lib/marketplace-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await guardMarketplaceCompany(req, "marketplace.view");
  if (!guard.ok) return guard.response;

  const vendors = await prisma.marketplaceVendor.findMany({
    where: { status: "active" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logo: true,
      logoUrl: true,
      bannerImage: true,
      status: true,
      _count: { select: { products: { where: { isActive: true, status: "active" } } } },
    },
  });

  return NextResponse.json({ ok: true, items: vendors.map(serializeCompanyVendor) });
}
