import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function canLink(perms: string[]): boolean {
  return perms.includes("*") || hasPermission(perms, "manage-lms-courses") || hasPermission(perms, "manage-lms");
}

/** POS catalog rows for optional LMS course ↔ product pricing link (tenant-scoped). */
export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canLink(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const rows = await prisma.posProduct.findMany({
    where: { organizationId: actor.organizationId, isActive: true },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      sku: true,
      slug: true,
      price: true,
      storefrontPublished: true,
    },
    take: 500,
  });

  return NextResponse.json({
    ok: true,
    items: rows.map((r) => ({
      id: r.id.toString(),
      name: r.name,
      sku: r.sku,
      slug: r.slug,
      storefrontPublished: r.storefrontPublished,
      price: r.price != null ? r.price.toString() : null,
    })),
  });
}
