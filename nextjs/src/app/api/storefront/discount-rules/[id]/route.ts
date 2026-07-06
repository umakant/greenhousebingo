import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.DISCOUNT_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let rid: bigint;
  try {
    rid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.storefrontDiscountRule.findFirst({
    where: { id: rid, organizationId: org.organizationId },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });

  const data: Prisma.StorefrontDiscountRuleUpdateInput = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (body.scope === "line" || body.scope === "order") data.scope = body.scope;
  if (body.kind === "percent" || body.kind === "fixed") data.kind = body.kind;
  if (body.value != null && !Number.isNaN(Number(body.value))) {
    data.value = new Prisma.Decimal(Number(body.value));
  }
  if (body.startsAt !== undefined) data.startsAt = body.startsAt ? new Date(String(body.startsAt)) : null;
  if (body.endsAt !== undefined) data.endsAt = body.endsAt ? new Date(String(body.endsAt)) : null;
  if (body.maxUses !== undefined) data.maxUses = body.maxUses === null ? null : Number(body.maxUses);
  if (body.perCustomerLimit !== undefined)
    data.perCustomerLimit = body.perCustomerLimit === null ? null : Number(body.perCustomerLimit);
  if (body.productIds !== undefined) data.productIds = body.productIds as Prisma.InputJsonValue;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
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

  await prisma.storefrontDiscountRule.update({ where: { id: rid }, data });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.DISCOUNT_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let rid: bigint;
  try {
    rid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.storefrontDiscountRule.findFirst({
    where: { id: rid, organizationId: org.organizationId },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  await prisma.storefrontDiscountRule.delete({ where: { id: rid } });
  return NextResponse.json({ ok: true });
}
