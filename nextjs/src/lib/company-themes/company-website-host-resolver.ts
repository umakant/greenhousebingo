import "server-only";

import { companyWebsiteOwnerId } from "@/lib/company-themes/company-website-access";
import { isStorefrontAppHost } from "@/lib/storefront/custom-domain-hosts";
import { websiteUrlToHostname } from "@/lib/website-url";
import { prisma } from "@/lib/prisma";

function normalizeHostname(raw: string): string {
  return raw.trim().toLowerCase().replace(/^www\./, "");
}

/** Match request host to a company's Website / domain setting (`companyWebsite`). */
export async function findCompanyOwnerIdByWebsiteHostname(hostname: string): Promise<bigint | null> {
  const target = normalizeHostname(hostname);
  if (!target) return null;

  const rows = await prisma.setting.findMany({
    where: { key: "companyWebsite" },
    select: { createdBy: true, value: true },
  });

  for (const row of rows) {
    const storedHost = normalizeHostname(websiteUrlToHostname(row.value ?? ""));
    if (!storedHost) continue;
    if (storedHost === target) return row.createdBy;
  }
  return null;
}

/** Public site path segment — company account slug (e.g. DN-0001-CO-26). */
export async function findCompanyOwnerIdByPublicSlug(slug: string): Promise<bigint | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  const user = await prisma.user.findFirst({
    where: {
      slug: { equals: trimmed, mode: "insensitive" },
      type: { in: ["company", "company_admin"] },
    },
    select: { id: true, type: true, createdBy: true },
  });
  if (!user) return null;
  return companyWebsiteOwnerId(user);
}

export async function findCompanyOwnerIdBySessionUserId(userId: bigint): Promise<bigint | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, type: true, createdBy: true },
  });
  if (!user) return null;
  return companyWebsiteOwnerId(user);
}

export async function findCompanyPublicSlugByOwnerId(ownerId: bigint): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { slug: true },
  });
  const slug = (user?.slug ?? "").trim();
  return slug || null;
}

/** When exactly one company has a marketing theme and public slug, allow `/company-website` on the app host. */
export async function findSingleCompanySiteOwnerId(): Promise<bigint | null> {
  const rows = await prisma.setting.findMany({
    where: { key: "companyNextjsThemeSlug" },
    select: { createdBy: true, value: true },
  });

  const ownerIds: bigint[] = [];
  for (const row of rows) {
    if (!(row.value ?? "").trim()) continue;
    if (row.createdBy == null) continue;
    const slug = await findCompanyPublicSlugByOwnerId(row.createdBy);
    if (!slug) continue;
    if (!ownerIds.some((id) => id === row.createdBy)) {
      ownerIds.push(row.createdBy);
    }
  }

  return ownerIds.length === 1 ? ownerIds[0]! : null;
}

async function resolvePublicSlugSite(
  ownerId: bigint,
): Promise<CompanyWebsiteRequestResolution | null> {
  const slug = await findCompanyPublicSlugByOwnerId(ownerId);
  if (!slug) return null;
  return {
    ownerId,
    sitePathPrefix: `/sites/${encodeURIComponent(slug)}`,
    mode: "public-slug",
  };
}

export type CompanyWebsiteRequestResolution =
  | { ownerId: bigint; sitePathPrefix: string; mode: "public-slug" | "public-host" | "session" }
  | null;

/** Resolve which company site to render for `/company-website` (public; no sign-in required). */
export async function resolveCompanyWebsiteFromAppRoute(
  hostHeader: string | null,
  sessionUserId: bigint | null,
  options?: { companySlugParam?: string | null },
): Promise<CompanyWebsiteRequestResolution> {
  const hostname = (hostHeader ?? "").split(":")[0]?.trim().toLowerCase() ?? "";
  const companySlugParam = (options?.companySlugParam ?? "").trim();

  if (hostname && !isStorefrontAppHost(hostname)) {
    const ownerFromHost = await findCompanyOwnerIdByWebsiteHostname(hostname);
    if (ownerFromHost) {
      return { ownerId: ownerFromHost, sitePathPrefix: "", mode: "public-host" };
    }
  }

  if (companySlugParam) {
    const ownerFromSlug = await findCompanyOwnerIdByPublicSlug(companySlugParam);
    if (ownerFromSlug) {
      return resolvePublicSlugSite(ownerFromSlug);
    }
  }

  if (sessionUserId != null) {
    const ownerId = await findCompanyOwnerIdBySessionUserId(sessionUserId);
    if (ownerId) {
      const resolved = await resolvePublicSlugSite(ownerId);
      if (resolved) return resolved;
      return { ownerId, sitePathPrefix: "/company-website", mode: "session" };
    }
  }

  if (isStorefrontAppHost(hostname)) {
    const singleOwnerId = await findSingleCompanySiteOwnerId();
    if (singleOwnerId) {
      const resolved = await resolvePublicSlugSite(singleOwnerId);
      if (resolved) return resolved;
    }
  }

  return null;
}
