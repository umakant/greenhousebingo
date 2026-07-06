import { NextResponse, type NextRequest } from "next/server";

import { requireAffiliateApiAccess } from "@/lib/affiliate-access";
import { ensureAffiliateDemoForOrg, serializeCommission } from "@/lib/affiliate-business-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireAffiliateApiAccess(req, "manage-affiliate-commissions");
  if (!gate.ok) return gate.response;

  const { organizationId } = gate.actor;
  await ensureAffiliateDemoForOrg(organizationId);

  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();

  const rows = await prisma.affiliateCommission.findMany({
    where: {
      organizationId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { orderRef: { contains: search, mode: "insensitive" } },
              { customerEmail: { contains: search, mode: "insensitive" } },
              { partner: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { earnedAt: "desc" },
    take: 300,
    include: {
      partner: { select: { id: true, name: true, referralCode: true } },
      program: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ ok: true, items: rows.map(serializeCommission) });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAffiliateApiAccess(req, "manage-affiliate-commissions");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as { id?: string; status?: string };
  if (!body.id || !body.status) {
    return NextResponse.json({ ok: false, message: "id and status required." }, { status: 400 });
  }

  let commissionId: bigint;
  try {
    commissionId = BigInt(body.id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const existing = await prisma.affiliateCommission.findFirst({
    where: { id: commissionId, organizationId: gate.actor.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Commission not found." }, { status: 404 });
  }

  const row = await prisma.affiliateCommission.update({
    where: { id: commissionId },
    data: { status: String(body.status).trim(), updatedAt: new Date() },
    include: {
      partner: { select: { id: true, name: true, referralCode: true } },
      program: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ ok: true, item: serializeCommission(row) });
}
