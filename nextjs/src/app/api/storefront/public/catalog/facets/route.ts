import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPublicStorefrontContextFromHost } from "@/lib/storefront/public-host-context";

export const dynamic = "force-dynamic";

/** Day 21 — Public category/brand facets for storefront filters (tenant-scoped by host). */
export async function GET(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const ctx = await getPublicStorefrontContextFromHost(host);
  if (!ctx) return NextResponse.json({ ok: false, error: "Store not found" }, { status: 404 });

  const [categories, brands] = await Promise.all([
    prisma.posCategory.findMany({
      where: { createdBy: ctx.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.posBrand.findMany({
      where: { createdBy: ctx.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    categories: categories.map((c) => ({ id: c.id.toString(), name: c.name })),
    brands: brands.map((b) => ({ id: b.id.toString(), name: b.name })),
  });
}
