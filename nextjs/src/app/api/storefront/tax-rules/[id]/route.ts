import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.TAX_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let tid: bigint;
  try {
    tid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.storefrontTaxRule.findFirst({
    where: { id: tid, organizationId: org.organizationId },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });

  const data: Prisma.StorefrontTaxRuleUpdateInput = {};
  if (typeof body.country === "string" && body.country.trim().length === 2) {
    data.country = body.country.trim().toUpperCase();
  }
  if (body.region !== undefined) data.region = body.region === null || body.region === "" ? null : String(body.region).slice(0, 64);
  if (body.ratePercent != null && !Number.isNaN(Number(body.ratePercent))) {
    data.ratePercent = new Prisma.Decimal(Number(body.ratePercent));
  }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (body.sortOrder != null) data.sortOrder = Number(body.sortOrder);
  if (body.websiteId !== undefined) {
    if (body.websiteId === null || body.websiteId === "") {
      data.website = { disconnect: true };
    } else {
      try {
        data.website = { connect: { id: BigInt(String(body.websiteId)) } };
      } catch {
        return NextResponse.json({ ok: false, message: "Invalid websiteId" }, { status: 400 });
      }
    }
  }

  await prisma.storefrontTaxRule.update({ where: { id: tid }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.TAX_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let tid: bigint;
  try {
    tid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.storefrontTaxRule.findFirst({
    where: { id: tid, organizationId: org.organizationId },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  await prisma.storefrontTaxRule.delete({ where: { id: tid } });
  return NextResponse.json({ ok: true });
}
