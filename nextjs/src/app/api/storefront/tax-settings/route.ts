import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.TAX_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const wid = req.nextUrl.searchParams.get("websiteId");
  let websiteId: bigint | null = null;
  if (wid && /^\d+$/.test(wid)) {
    try {
      websiteId = BigInt(wid);
    } catch {
      websiteId = null;
    }
  }

  const row = await prisma.storefrontTaxSettings.findFirst({
    where: {
      organizationId: org.organizationId,
      OR: websiteId != null ? [{ websiteId }, { websiteId: null }] : [{ websiteId: null }],
    },
    orderBy: { websiteId: "desc" },
  });

  return NextResponse.json({
    ok: true,
    settings: row
      ? {
          id: row.id.toString(),
          websiteId: row.websiteId?.toString() ?? null,
          priceMode: row.priceMode,
        }
      : null,
  });
}

export async function PUT(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.TAX_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const priceMode = body?.priceMode === "inclusive" ? "inclusive" : "exclusive";

  let websiteId: bigint | null = null;
  if (body?.websiteId != null && String(body.websiteId).trim() !== "") {
    try {
      websiteId = BigInt(String(body.websiteId));
    } catch {
      return NextResponse.json({ ok: false, message: "Invalid websiteId" }, { status: 400 });
    }
  }

  const existing = await prisma.storefrontTaxSettings.findFirst({
    where: {
      organizationId: org.organizationId,
      websiteId: websiteId === null ? null : websiteId,
    },
  });

  if (existing) {
    await prisma.storefrontTaxSettings.update({
      where: { id: existing.id },
      data: { priceMode },
    });
  } else {
    await prisma.storefrontTaxSettings.create({
      data: {
        organizationId: org.organizationId,
        websiteId,
        priceMode,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
