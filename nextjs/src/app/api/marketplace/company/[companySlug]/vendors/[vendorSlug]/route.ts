import { NextResponse, type NextRequest } from "next/server";

import { guardCompanyMarketplaceBySlug } from "@/lib/marketplace-company-guard-slug";
import { getMarketplacePricingConfig } from "@/lib/marketplace-pricing";
import { prisma } from "@/lib/prisma";
import { serializeCompanyProduct, serializeCompanyVendor } from "@/lib/marketplace-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ companySlug: string; vendorSlug: string }> },
) {
  const { companySlug, vendorSlug } = await params;
  const guard = await guardCompanyMarketplaceBySlug(req, companySlug, "marketplace.view");
  if (!guard.ok) return guard.response;

  const vendor = await prisma.marketplaceVendor.findFirst({
    where: { slug: decodeURIComponent(vendorSlug), status: "active" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logo: true,
      logoUrl: true,
      bannerImage: true,
      status: true,
    },
  });
  if (!vendor) {
    return NextResponse.json({ ok: false, message: "Vendor not found" }, { status: 404 });
  }

  const [pricing, categories, products] = await Promise.all([
    getMarketplacePricingConfig(),
    prisma.marketplaceCategory.findMany({
      where: { vendorId: vendor.id, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
    prisma.marketplaceProduct.findMany({
      where: { vendorId: vendor.id, isActive: true, status: "active" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        vendorId: true,
        categoryId: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        currency: true,
        image: true,
        imageUrl: true,
        category: true,
        bucketCountValue: true,
        inventoryCount: true,
        stock: true,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    vendor: serializeCompanyVendor(vendor),
    minBuckets: pricing.minBuckets,
    categories: categories.map((c) => ({ id: c.id.toString(), name: c.name, slug: c.slug })),
    products: products.map(serializeCompanyProduct),
  });
}
