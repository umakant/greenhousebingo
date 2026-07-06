import { NextResponse, type NextRequest } from "next/server";

import { requireAffiliateApiAccess } from "@/lib/affiliate-access";
import { ensureAffiliateDemoForOrg, serializePayout } from "@/lib/affiliate-business-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireAffiliateApiAccess(req, "manage-affiliate-payouts");
  if (!gate.ok) return gate.response;

  const { organizationId } = gate.actor;
  await ensureAffiliateDemoForOrg(organizationId);

  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();
  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();

  const rows = await prisma.affiliatePayout.findMany({
    where: {
      organizationId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: "insensitive" } },
              { partner: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { scheduledAt: "desc" },
    take: 200,
    include: { partner: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ ok: true, items: rows.map(serializePayout) });
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAffiliateApiAccess(req, "manage-affiliate-payouts");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as { id?: string; status?: string };
  if (!body.id || !body.status) {
    return NextResponse.json({ ok: false, message: "id and status required." }, { status: 400 });
  }

  let payoutId: bigint;
  try {
    payoutId = BigInt(body.id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const existing = await prisma.affiliatePayout.findFirst({
    where: { id: payoutId, organizationId: gate.actor.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Payout not found." }, { status: 404 });
  }

  const status = String(body.status).trim();
  const row = await prisma.affiliatePayout.update({
    where: { id: payoutId },
    data: {
      status,
      paidAt: status === "paid" ? new Date() : existing.paidAt,
      updatedAt: new Date(),
    },
    include: { partner: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ ok: true, item: serializePayout(row) });
}
