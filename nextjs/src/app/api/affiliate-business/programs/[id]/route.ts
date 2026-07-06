import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { requireAffiliateApiAccess } from "@/lib/affiliate-access";
import { serializeProgram } from "@/lib/affiliate-business-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const gate = await requireAffiliateApiAccess(req, "manage-affiliate-programs");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  let programId: bigint;
  try {
    programId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const existing = await prisma.affiliateProgram.findFirst({
    where: { id: programId, organizationId: gate.actor.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Program not found." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Prisma.AffiliateProgramUpdateInput = { updatedAt: new Date() };
  if (body.name != null) data.name = String(body.name).trim();
  if (body.description != null) data.description = String(body.description).trim() || null;
  if (body.commissionType != null || body.commission_type != null) {
    data.commissionType = String(body.commissionType ?? body.commission_type).trim();
  }
  if (body.commissionValue != null || body.commission_value != null) {
    data.commissionValue = new Prisma.Decimal(Number(body.commissionValue ?? body.commission_value) || 10);
  }
  if (body.cookieDays != null || body.cookie_days != null) {
    data.cookieDays = Math.max(1, Number(body.cookieDays ?? body.cookie_days) || 30);
  }
  if (body.status != null) data.status = String(body.status).trim();

  const row = await prisma.affiliateProgram.update({
    where: { id: programId },
    data,
    include: { _count: { select: { commissions: true } } },
  });
  return NextResponse.json({ ok: true, item: serializeProgram(row) });
}
