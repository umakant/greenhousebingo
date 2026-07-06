import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { requireAffiliateApiAccess } from "@/lib/affiliate-access";
import { serializePartner } from "@/lib/affiliate-business-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const gate = await requireAffiliateApiAccess(req, "manage-affiliate-partners");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  let partnerId: bigint;
  try {
    partnerId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const existing = await prisma.affiliatePartner.findFirst({
    where: { id: partnerId, organizationId: gate.actor.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Partner not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Prisma.AffiliatePartnerUpdateInput = { updatedAt: new Date() };
  if (body.name != null) data.name = String(body.name).trim();
  if (body.email != null) data.email = String(body.email).trim() || null;
  if (body.referralCode != null || body.referral_code != null) {
    data.referralCode = String(body.referralCode ?? body.referral_code).trim().toUpperCase();
  }
  if (body.tier != null) data.tier = String(body.tier).trim();
  if (body.status != null) data.status = String(body.status).trim();
  if (body.commissionRate != null || body.commission_rate != null) {
    data.commissionRate = new Prisma.Decimal(Number(body.commissionRate ?? body.commission_rate) || 10);
  }

  const row = await prisma.affiliatePartner.update({ where: { id: partnerId }, data });
  return NextResponse.json({ ok: true, item: serializePartner(row) });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const gate = await requireAffiliateApiAccess(req, "manage-affiliate-partners");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  let partnerId: bigint;
  try {
    partnerId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const existing = await prisma.affiliatePartner.findFirst({
    where: { id: partnerId, organizationId: gate.actor.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Partner not found." }, { status: 404 });
  }

  await prisma.affiliatePartner.delete({ where: { id: partnerId } });
  return NextResponse.json({ ok: true });
}
