import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function methodForOrg(methodId: bigint) {
  return prisma.storefrontShippingMethod.findFirst({
    where: { id: methodId },
    include: { zone: { select: { organizationId: true } } },
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.SHIPPING_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let mid: bigint;
  try {
    mid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
  }

  const existing = await methodForOrg(mid);
  if (!existing || existing.zone.organizationId !== org.organizationId) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });

  const data: Prisma.StorefrontShippingMethodUpdateInput = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.methodKey === "string") data.methodKey = body.methodKey.trim().toLowerCase();
  if (body.flatRate != null) data.flatRate = new Prisma.Decimal(Number(body.flatRate));
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (body.sortOrder != null) data.sortOrder = Number(body.sortOrder);

  try {
    await prisma.storefrontShippingMethod.update({ where: { id: mid }, data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ ok: false, message: "A rate with this checkout key already exists in this zone." }, { status: 409 });
    }
    throw e;
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.SHIPPING_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let mid: bigint;
  try {
    mid = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
  }

  const existing = await methodForOrg(mid);
  if (!existing || existing.zone.organizationId !== org.organizationId) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }

  await prisma.storefrontShippingMethod.delete({ where: { id: mid } });
  return NextResponse.json({ ok: true });
}
