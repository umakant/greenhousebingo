import { NextResponse, type NextRequest } from "next/server";

import { guardCompanyMarketplaceBySlug } from "@/lib/marketplace-company-guard-slug";
import { prisma } from "@/lib/prisma";
import { serializeCompanyVendor } from "@/lib/marketplace-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  const guard = await guardCompanyMarketplaceBySlug(req, companySlug, "marketplace.view");
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
