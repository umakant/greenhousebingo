import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardMarketplaceCompany } from "@/lib/marketplace-company-api-guard";
import { serializeProduct } from "@/lib/marketplace-service";

export async function GET(req: NextRequest) {
  const guard = await guardMarketplaceCompany(req, "marketplace.view");
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const category = (url.searchParams.get("category") ?? "").trim();

  // Buyers only see active products from active vendors.
  const where: Record<string, unknown> = {
    status: "active",
    vendor: { status: "active" },
  };
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  const [products, categories] = await Promise.all([
    prisma.marketplaceProduct.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { vendor: { select: { name: true } } },
    }),
    prisma.marketplaceProduct.findMany({
      where: { status: "active", category: { not: null } },
      select: { category: true },
      distinct: ["category"],
    }),
  ]);

  return NextResponse.json({
    ok: true,
    items: products.map(serializeProduct),
    categories: categories.map((c) => c.category).filter((c): c is string => !!c),
  });
}
