import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardPartnerApi } from "@/lib/partner-api-guard";

export async function GET(req: NextRequest) {
  const guard = await guardPartnerApi(req);
  if ("error" in guard) return guard.error;

  const referrals = await prisma.partnerReferral.findMany({
    where: { partnerId: guard.partner.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const companyIds = referrals.map((r) => r.companyId).filter((id): id is bigint => id != null);
  const companies =
    companyIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } })
      : [];
  const nameById = new Map(companies.map((c) => [c.id.toString(), c.name]));

  return NextResponse.json({
    ok: true,
    items: referrals.map((r) => ({
      id: r.id.toString(),
      companyId: r.companyId ? r.companyId.toString() : null,
      companyName: r.companyId ? nameById.get(r.companyId.toString()) ?? null : null,
      referralCode: r.referralCode,
      partnerSlug: r.partnerSlug,
      sourceUrl: r.sourceUrl,
      referralStatus: r.referralStatus,
      signupDate: r.signupDate ? r.signupDate.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
