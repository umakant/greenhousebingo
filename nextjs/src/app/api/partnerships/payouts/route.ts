import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardPartnershipAdmin } from "@/lib/partnership-api-guard";
import { nextPartnerPayoutId } from "@/lib/partner-service";

function serializePayout(p: {
  id: bigint;
  partnerId: bigint;
  totalAmount: unknown;
  status: string;
  payoutMethod: string | null;
  payoutReference: string | null;
  notes: string | null;
  paidAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: p.id.toString(),
    partnerId: p.partnerId.toString(),
    totalAmount: Number(p.totalAmount),
    status: p.status,
    payoutMethod: p.payoutMethod,
    payoutReference: p.payoutReference,
    notes: p.notes,
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const statusFilter = (url.searchParams.get("status") ?? "").trim();

  const where: Record<string, unknown> = {};
  if (statusFilter) where.status = statusFilter;

  const [payouts, partners, pendingByPartner] = await Promise.all([
    prisma.partnerPayout.findMany({ where, orderBy: { createdAt: "desc" } }),
    prisma.partner.findMany({ select: { id: true, name: true, payoutMethod: true, payoutEmail: true } }),
    prisma.partnerCommission.groupBy({
      by: ["partnerId"],
      where: { status: { in: ["pending", "approved"] }, payoutId: null },
      _sum: { commissionAmount: true },
    }),
  ]);

  const partnerNameById = new Map(partners.map((p) => [p.id.toString(), p.name]));
  const pendingMap = new Map(
    pendingByPartner.map((p) => [p.partnerId.toString(), Number(p._sum.commissionAmount ?? 0)]),
  );

  return NextResponse.json({
    ok: true,
    items: payouts.map((p) => ({
      ...serializePayout(p),
      partnerName: partnerNameById.get(p.partnerId.toString()) ?? "—",
    })),
    payablePartners: partners.map((p) => ({
      id: p.id.toString(),
      name: p.name,
      payoutMethod: p.payoutMethod,
      payoutEmail: p.payoutEmail,
      pendingAmount: pendingMap.get(p.id.toString()) ?? 0,
    })),
  });
}

/** Create a payout that batches a partner's unpaid (pending/approved) commissions. */
export async function POST(req: NextRequest) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  let partnerId: bigint;
  try {
    partnerId = BigInt(String(body.partnerId ?? body.partner_id));
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid partnerId." }, { status: 400 });
  }

  const partner = await prisma.partner.findFirst({
    where: { id: partnerId },
    select: { id: true, payoutMethod: true },
  });
  if (!partner) return NextResponse.json({ ok: false, message: "Partner not found." }, { status: 404 });

  const commissions = await prisma.partnerCommission.findMany({
    where: { partnerId, status: { in: ["pending", "approved"] }, payoutId: null },
    select: { id: true, commissionAmount: true },
  });
  if (commissions.length === 0) {
    return NextResponse.json({ ok: false, message: "No unpaid commissions to pay out." }, { status: 400 });
  }

  const total = commissions.reduce((sum, c) => sum + Number(c.commissionAmount), 0);
  const payoutMethod = String(body.payoutMethod ?? body.payout_method ?? partner.payoutMethod ?? "").trim();
  const notes = String(body.notes ?? "").trim();

  const payoutId = await nextPartnerPayoutId();
  const payout = await prisma.partnerPayout.create({
    data: {
      id: payoutId,
      partnerId,
      totalAmount: total,
      status: "pending",
      payoutMethod: payoutMethod || null,
      notes: notes || null,
      createdAt: new Date(),
    },
  });

  await prisma.partnerCommission.updateMany({
    where: { id: { in: commissions.map((c) => c.id) } },
    data: { payoutId, status: "approved", updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true, item: serializePayout(payout) }, { status: 201 });
}
