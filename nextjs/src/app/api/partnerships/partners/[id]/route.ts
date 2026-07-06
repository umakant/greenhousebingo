import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardPartnershipAdmin } from "@/lib/partnership-api-guard";
import { computePartnerStats, serializePartner } from "@/lib/partner-service";

function parseId(id: string): bigint | null {
  try {
    return BigInt(id);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const partnerId = parseId(id);
  if (!partnerId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const partner = await prisma.partner.findFirst({ where: { id: partnerId } });
  if (!partner) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const [stats, companies, commissions, referrals] = await Promise.all([
    computePartnerStats(partnerId),
    prisma.user.findMany({
      where: { partnerId, type: { in: ["company", "company_admin"] } },
      select: { id: true, name: true, email: true, isActive: true, activePlan: true, referredAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.partnerCommission.findMany({
      where: { partnerId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.partnerReferral.findMany({
      where: { partnerId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    item: serializePartner(partner),
    stats,
    companies: companies.map((c) => ({
      id: c.id.toString(),
      name: c.name,
      email: c.email,
      isActive: c.isActive,
      activePlan: c.activePlan,
      referredAt: c.referredAt ? c.referredAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
    })),
    commissions: commissions.map((c) => ({
      id: c.id.toString(),
      companyId: c.companyId.toString(),
      orderRef: c.orderRef,
      amount: Number(c.amount),
      commissionRate: Number(c.commissionRate),
      commissionAmount: Number(c.commissionAmount),
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    })),
    referrals: referrals.map((r) => ({
      id: r.id.toString(),
      companyId: r.companyId ? r.companyId.toString() : null,
      referralCode: r.referralCode,
      partnerSlug: r.partnerSlug,
      referralStatus: r.referralStatus,
      signupDate: r.signupDate ? r.signupDate.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const partnerId = parseId(id);
  if (!partnerId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const partner = await prisma.partner.findFirst({ where: { id: partnerId }, select: { id: true, userId: true } });
  if (!partner) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = { updatedAt: new Date() };

  if (body.name != null) data.name = String(body.name).trim();
  if (body.email != null) data.email = String(body.email).trim().toLowerCase() || null;
  if (body.phone != null) data.phone = String(body.phone).trim() || null;
  if (body.brandName != null || body.brand_name != null) {
    data.brandName = String(body.brandName ?? body.brand_name).trim() || null;
  }
  if (body.status != null) data.status = String(body.status).trim();
  if (body.payoutMethod != null || body.payout_method != null) {
    data.payoutMethod = String(body.payoutMethod ?? body.payout_method).trim() || null;
  }
  if (body.payoutEmail != null || body.payout_email != null) {
    data.payoutEmail = String(body.payoutEmail ?? body.payout_email).trim() || null;
  }
  if (body.notes != null) data.notes = String(body.notes).trim() || null;

  const rateRaw = body.commissionRate ?? body.commission_rate;
  if (rateRaw !== undefined) {
    if (rateRaw === null || String(rateRaw).trim() === "") {
      data.commissionRate = null;
    } else {
      const n = Number(rateRaw);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return NextResponse.json({ ok: false, message: "Commission rate must be between 0 and 100." }, { status: 400 });
      }
      data.commissionRate = n;
    }
  }

  const updated = await prisma.partner.update({ where: { id: partnerId }, data });

  // Keep the linked login account's active flag in sync with partner status.
  if (partner.userId && (data.status === "inactive" || data.status === "suspended" || data.status === "active")) {
    await prisma.user.update({
      where: { id: partner.userId },
      data: { isActive: data.status === "active", isEnableLogin: data.status === "active" },
    });
  }

  return NextResponse.json({ ok: true, item: serializePartner(updated) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const partnerId = parseId(id);
  if (!partnerId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const partner = await prisma.partner.findFirst({ where: { id: partnerId }, select: { id: true, userId: true } });
  if (!partner) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  // Detach referred companies but keep their records intact.
  await prisma.user.updateMany({ where: { partnerId }, data: { partnerId: null } });
  await prisma.partnerReferral.deleteMany({ where: { partnerId } });
  await prisma.partnerLandingPage.deleteMany({ where: { partnerId } });
  // Keep commissions/payouts for audit but unlink the partner login.
  await prisma.partner.delete({ where: { id: partnerId } });
  if (partner.userId) {
    await prisma.user.update({
      where: { id: partner.userId },
      data: { isEnableLogin: false, isActive: false },
    });
  }

  return NextResponse.json({ ok: true });
}
