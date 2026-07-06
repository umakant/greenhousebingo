import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import {
  guardMarketplaceCompany,
  type MarketplaceCompanyContext,
} from "@/lib/marketplace-company-api-guard";
import { prisma } from "@/lib/prisma";

type GuardResult =
  | { ok: true; ctx: MarketplaceCompanyContext }
  | { ok: false; response: NextResponse };

/**
 * Company marketplace API guard that also enforces the `[companySlug]` route param
 * maps to the caller's tenant organization. Builds on `guardMarketplaceCompany`
 * (auth + add-on + permission + org scope). Superadmins may target any company by
 * slug/id (ctx.organizationId is overridden to the targeted company).
 */
export async function guardCompanyMarketplaceBySlug(
  req: NextRequest,
  companySlug: string,
  requiredPermission = "marketplace.view",
): Promise<GuardResult> {
  const base = await guardMarketplaceCompany(req, requiredPermission);
  if (!base.ok) return base;

  const decoded = decodeURIComponent(companySlug ?? "").trim();

  let target = await prisma.user.findFirst({
    where: { slug: decoded, type: { in: ["company", "company_admin"] } },
    select: { id: true },
  });
  if (!target && /^\d+$/.test(decoded)) {
    target = await prisma.user.findFirst({
      where: { id: BigInt(decoded), type: { in: ["company", "company_admin"] } },
      select: { id: true },
    });
  }

  if (!target) {
    return { ok: false, response: NextResponse.json({ ok: false, message: "Company not found" }, { status: 404 }) };
  }

  if (base.ctx.isSuperadmin) {
    // Superadmin acts in the targeted company's context.
    return { ok: true, ctx: { ...base.ctx, organizationId: target.id } };
  }

  if (target.id !== base.ctx.organizationId) {
    return { ok: false, response: NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, ctx: base.ctx };
}
