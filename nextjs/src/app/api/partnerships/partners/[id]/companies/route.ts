import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardPartnershipAdmin } from "@/lib/partnership-api-guard";
import { nextPartnerReferralId } from "@/lib/partner-service";

function parseId(id: string): bigint | null {
  try {
    return BigInt(id);
  } catch {
    return null;
  }
}

/** Assign a company (users.type = company) to this partner. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const partnerId = parseId(id);
  if (!partnerId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const partner = await prisma.partner.findFirst({ where: { id: partnerId }, select: { id: true, slug: true, referralCode: true } });
  if (!partner) return NextResponse.json({ ok: false, message: "Partner not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const companyId = parseId(String(body.companyId ?? body.company_id ?? ""));
  if (!companyId) return NextResponse.json({ ok: false, message: "companyId is required." }, { status: 400 });

  const company = await prisma.user.findFirst({
    where: { id: companyId, type: { in: ["company", "company_admin"] } },
    select: { id: true },
  });
  if (!company) return NextResponse.json({ ok: false, message: "Company not found." }, { status: 404 });

  await prisma.user.update({
    where: { id: companyId },
    data: {
      partnerId,
      referralSource: "manual-assignment",
      referredAt: new Date(),
    },
  });

  const existingReferral = await prisma.partnerReferral.findFirst({
    where: { partnerId, companyId },
    select: { id: true },
  });
  if (!existingReferral) {
    await prisma.partnerReferral.create({
      data: {
        id: await nextPartnerReferralId(),
        partnerId,
        companyId,
        referralCode: partner.referralCode,
        partnerSlug: partner.slug,
        sourceUrl: "manual-assignment",
        signupDate: new Date(),
        referralStatus: "active",
        createdAt: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true });
}

/** Remove a company assignment from this partner. */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardPartnershipAdmin(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  const partnerId = parseId(id);
  if (!partnerId) return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });

  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const companyId = parseId(String(body.companyId ?? body.company_id ?? url.searchParams.get("companyId") ?? ""));
  if (!companyId) return NextResponse.json({ ok: false, message: "companyId is required." }, { status: 400 });

  await prisma.user.updateMany({
    where: { id: companyId, partnerId },
    data: { partnerId: null, referralSource: null, referredAt: null },
  });
  await prisma.partnerReferral.deleteMany({ where: { partnerId, companyId } });

  return NextResponse.json({ ok: true });
}
