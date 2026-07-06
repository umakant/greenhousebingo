import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { guardPartnerApi } from "@/lib/partner-api-guard";

/** Companies referred/assigned to the calling partner (no private company data exposed). */
export async function GET(req: NextRequest) {
  const guard = await guardPartnerApi(req);
  if ("error" in guard) return guard.error;

  const companies = await prisma.user.findMany({
    where: { partnerId: guard.partner.id, type: { in: ["company", "company_admin"] } },
    select: { id: true, name: true, isActive: true, activePlan: true, referredAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    items: companies.map((c) => ({
      id: c.id.toString(),
      name: c.name,
      isActive: c.isActive,
      plan: c.activePlan != null ? "Paid" : "Free / Trial",
      referredAt: c.referredAt ? c.referredAt.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}
