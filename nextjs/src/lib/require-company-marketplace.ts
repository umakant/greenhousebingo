import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireMarketplacePageAccess, type MarketplacePageUser } from "@/lib/require-marketplace-page";

export type CompanyMarketplaceAccess = {
  user: MarketplacePageUser;
  /** The resolved buyer organization (company users.id). */
  companyId: bigint;
  /** Canonical slug segment for building /company/[companySlug]/... links. */
  companySlug: string;
};

/** The URL segment a company uses: its slug when set, else its numeric id. */
export function companySlugSegment(company: { id: bigint; slug: string | null }): string {
  const slug = (company.slug ?? "").trim();
  return slug || company.id.toString();
}

/**
 * Server gate for the company-facing `/company/[companySlug]/...` marketplace pages.
 *
 * Builds on `requireMarketplacePageAccess` (login + marketplace add-on + permission),
 * then verifies the `companySlug` route param resolves to the caller's own tenant
 * organization. On mismatch the caller is redirected to their own canonical segment.
 * Superadmins may view any company.
 */
export async function requireCompanyMarketplaceAccess(
  companySlug: string,
  requiredPermission = "marketplace.view",
): Promise<CompanyMarketplaceAccess> {
  const user = await requireMarketplacePageAccess(requiredPermission);
  const isSuper = user.roles.includes("superadmin") || user.roles.includes("super_admin");

  const decoded = decodeURIComponent(companySlug ?? "").trim();

  // Resolve the company referenced by the URL (by slug, falling back to numeric id).
  let target = await prisma.user.findFirst({
    where: { slug: decoded, type: { in: ["company", "company_admin"] } },
    select: { id: true, slug: true },
  });
  if (!target && /^\d+$/.test(decoded)) {
    target = await prisma.user.findFirst({
      where: { id: BigInt(decoded), type: { in: ["company", "company_admin"] } },
      select: { id: true, slug: true },
    });
  }

  // Superadmin: may view any existing company; otherwise fall back to own org.
  if (isSuper) {
    if (target) {
      return { user, companyId: target.id, companySlug: companySlugSegment(target) };
    }
    if (user.organizationId) {
      const own = await prisma.user.findFirst({
        where: { id: BigInt(user.organizationId) },
        select: { id: true, slug: true },
      });
      if (own) redirect(`/company/${companySlugSegment(own)}/marketplace`);
    }
    redirect("/dashboard");
  }

  const ownOrgId = user.organizationId ? BigInt(user.organizationId) : null;
  if (ownOrgId == null) redirect("/dashboard");

  // Non-superadmin may only access their own company. Redirect to canonical segment.
  if (!target || target.id !== ownOrgId) {
    const own = await prisma.user.findFirst({
      where: { id: ownOrgId },
      select: { id: true, slug: true },
    });
    if (!own) redirect("/dashboard");
    redirect(`/company/${companySlugSegment(own)}/marketplace`);
  }

  return { user, companyId: target.id, companySlug: companySlugSegment(target) };
}

/** Resolves the caller's own canonical company segment (for redirect shims). */
export async function resolveOwnCompanySegment(): Promise<string | null> {
  const user = await requireMarketplacePageAccess("marketplace.view");
  if (!user.organizationId) return null;
  const own = await prisma.user.findFirst({
    where: { id: BigInt(user.organizationId) },
    select: { id: true, slug: true },
  });
  return own ? companySlugSegment(own) : null;
}
