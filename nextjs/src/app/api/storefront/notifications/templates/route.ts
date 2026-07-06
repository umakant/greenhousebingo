import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { STOREFRONT_DEFAULT_TEMPLATE_DEFS } from "@/lib/storefront/notification-defaults";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Day 10 — List storefront notification templates for the tenant. */
export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.VIEW });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const rows = await prisma.notificationTemplate.findMany({
    where: {
      organizationId: org.organizationId,
      key: { in: STOREFRONT_DEFAULT_TEMPLATE_DEFS.map((d) => d.key) },
    },
    orderBy: { key: "asc" },
    select: {
      id: true,
      key: true,
      name: true,
      channel: true,
      status: true,
      websiteId: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    data: rows.map((r) => ({
      ...r,
      id: r.id.toString(),
      websiteId: r.websiteId != null ? r.websiteId.toString() : null,
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
    })),
  });
}
