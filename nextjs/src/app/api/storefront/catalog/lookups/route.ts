import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { prisma } from "@/lib/prisma";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";

export const dynamic = "force-dynamic";

/** Categories and brands for catalog forms (shared POS tables, storefront-scoped access). */
export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.CATALOG_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const [categories, brands] = await Promise.all([
    prisma.posCategory.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.posBrand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    categories: categories.map((c) => ({ id: c.id.toString(), name: c.name })),
    brands: brands.map((b) => ({ id: b.id.toString(), name: b.name })),
  });
}
