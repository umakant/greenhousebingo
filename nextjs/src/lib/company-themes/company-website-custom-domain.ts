import "server-only";

import { getCompanyWebsiteSettingsForOwnerId } from "@/lib/company-themes/company-website-settings";
import {
  findCompanyOwnerIdByWebsiteHostname,
  findCompanyPublicSlugByOwnerId,
} from "@/lib/company-themes/company-website-host-resolver";
import { isStorefrontAppHost } from "@/lib/storefront/custom-domain-hosts";
import { storefrontHostnameForLookup } from "@/lib/storefront/storefront-host-header";

export type CompanyWebsiteCustomHost = {
  ownerId: bigint;
  companySlug: string;
};

export function companyWebsiteHostnameFromHeader(hostHeader: string | null | undefined): string {
  return storefrontHostnameForLookup(hostHeader ?? "");
}

/** DNS target shown in Company Settings (A/CNAME). */
export function companyWebsiteDnsTargetHostname(): string {
  const explicit = (process.env.COMPANY_WEBSITE_DNS_TARGET ?? "").trim();
  if (explicit) {
    return explicit.replace(/^https?:\/\//, "").split("/")[0]!.replace(/:\d+$/, "");
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
  try {
    if (appUrl) return new URL(appUrl).hostname;
  } catch {
    /* ignore */
  }
  return "nextjs.paperflight.cc";
}

/** Optional comma-separated hostnames for local/dev custom-domain testing. */
export function parseCompanyWebsiteMerchantHosts(): Set<string> {
  const hosts = new Set<string>();
  const raw = process.env.COMPANY_WEBSITE_MERCHANT_HOSTS ?? "";
  for (const part of raw.split(/[\s,;]+/)) {
    const h = companyWebsiteHostnameFromHeader(part);
    if (h) hosts.add(h);
  }
  return hosts;
}

export function shouldBypassCompanyWebsiteRewrite(pathname: string): boolean {
  if (!pathname || pathname === "/") return false;
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/company-themes")) return true;
  if (pathname.startsWith("/uploads")) return true;
  if (pathname.startsWith("/storefront")) return true;
  if (pathname.startsWith("/shop")) return true;
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return true;
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return true;
  if (/\.[a-z0-9]{2,8}$/i.test(pathname)) return true;
  return false;
}

/** Resolve a custom domain to a company marketing site (theme + slug required). */
export async function findCompanyWebsiteByCustomHostname(
  hostname: string,
): Promise<CompanyWebsiteCustomHost | null> {
  const normalized = companyWebsiteHostnameFromHeader(hostname);
  if (!normalized || isStorefrontAppHost(normalized)) return null;

  if (parseCompanyWebsiteMerchantHosts().has(normalized)) {
    const ownerId = await findCompanyOwnerIdByWebsiteHostname(normalized);
    if (!ownerId) return null;
    const companySlug = await findCompanyPublicSlugByOwnerId(ownerId);
    if (!companySlug) return null;
    return { ownerId, companySlug };
  }

  const ownerId = await findCompanyOwnerIdByWebsiteHostname(normalized);
  if (!ownerId) return null;

  const [website, companySlug] = await Promise.all([
    getCompanyWebsiteSettingsForOwnerId(ownerId),
    findCompanyPublicSlugByOwnerId(ownerId),
  ]);
  if (!website.slug.trim() || !companySlug) return null;

  return { ownerId, companySlug };
}

/** Public URL prefix: `` on custom domain, `/sites/{slug}` on the app host. */
export async function resolveCompanySiteBasePath(
  ownerId: bigint,
  companySlug: string,
  hostHeader?: string | null,
): Promise<string> {
  const hostname = companyWebsiteHostnameFromHeader(hostHeader);
  if (!hostname || isStorefrontAppHost(hostname)) {
    return `/sites/${encodeURIComponent(companySlug)}`;
  }
  const ownerFromHost = await findCompanyOwnerIdByWebsiteHostname(hostname);
  if (ownerFromHost === ownerId) return "";
  return `/sites/${encodeURIComponent(companySlug)}`;
}

export function companySiteAccessUrl(siteBase: string, returnPath: string): string {
  const next = encodeURIComponent(returnPath);
  return siteBase ? `${siteBase}/access?next=${next}` : `/access?next=${next}`;
}
