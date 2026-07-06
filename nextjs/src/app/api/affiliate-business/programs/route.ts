import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { requireAffiliateApiAccess } from "@/lib/affiliate-access";
import { ensureAffiliateDemoForOrg, serializeProgram } from "@/lib/affiliate-business-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireAffiliateApiAccess(req, "manage-affiliate-programs");
  if (!gate.ok) return gate.response;

  const { organizationId } = gate.actor;
  await ensureAffiliateDemoForOrg(organizationId);

  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();

  const rows = await prisma.affiliateProgram.findMany({
    where: {
      organizationId,
      ...(status ? { status } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
    take: 200,
    include: { _count: { select: { commissions: true } } },
  });

  return NextResponse.json({ ok: true, items: rows.map(serializeProgram) });
}

export async function POST(req: NextRequest) {
  const gate = await requireAffiliateApiAccess(req, "manage-affiliate-programs");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ ok: false, message: "Program name is required." }, { status: 400 });
  }

  const row = await prisma.affiliateProgram.create({
    data: {
      organizationId: gate.actor.organizationId,
      name,
      description: String(body.description ?? "").trim() || null,
      commissionType: String(body.commissionType ?? body.commission_type ?? "percentage").trim(),
      commissionValue: new Prisma.Decimal(Number(body.commissionValue ?? body.commission_value ?? 10) || 10),
      cookieDays: Math.max(1, Number(body.cookieDays ?? body.cookie_days ?? 30) || 30),
      status: String(body.status ?? "active").trim() || "active",
    },
    include: { _count: { select: { commissions: true } } },
  });

  return NextResponse.json({ ok: true, item: serializeProgram(row) });
}
