import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.SHIPPING_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const zoneId = body?.zoneId != null ? String(body.zoneId) : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const methodKey = typeof body?.methodKey === "string" ? body.methodKey.trim().toLowerCase() : "";
  const flat = body?.flatRate != null ? Number(body.flatRate) : NaN;
  if (!zoneId || !name || !methodKey || Number.isNaN(flat) || flat < 0) {
    return NextResponse.json({ ok: false, message: "zoneId, name, methodKey, flatRate required" }, { status: 400 });
  }

  let zid: bigint;
  try {
    zid = BigInt(zoneId);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid zoneId" }, { status: 400 });
  }

  const zone = await prisma.storefrontShippingZone.findFirst({
    where: { id: zid, organizationId: org.organizationId },
  });
  if (!zone) return NextResponse.json({ ok: false, message: "Zone not found" }, { status: 404 });

  const row = await prisma.storefrontShippingMethod.create({
    data: {
      zoneId: zid,
      name,
      methodKey,
      flatRate: new Prisma.Decimal(flat),
      sortOrder: body?.sortOrder != null ? Number(body.sortOrder) : 0,
      isActive: body?.isActive !== false,
    },
  });

  return NextResponse.json({ ok: true, id: row.id.toString() });
}
