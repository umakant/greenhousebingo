import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  findCompanyWebsiteByCustomHostname,
  parseCompanyWebsiteMerchantHosts,
  shouldBypassCompanyWebsiteRewrite,
} from "@/lib/company-themes/company-website-custom-domain";
import {
  isStorefrontAppHost,
  middlewareStorefrontHostApiOrigin,
} from "@/lib/storefront/custom-domain-hosts";
import { storefrontHostnameForLookup } from "@/lib/storefront/storefront-host-header";

type HostResolution = { companySlug: string };

const hostCache = new Map<string, { hit: HostResolution | null; exp: number }>();
const CACHE_MS = 60_000;

async function resolveCompanyWebsiteHost(hostname: string): Promise<HostResolution | null> {
  if (parseCompanyWebsiteMerchantHosts().has(hostname)) {
    const direct = await findCompanyWebsiteByCustomHostname(hostname);
    return direct ? { companySlug: direct.companySlug } : null;
  }

  const now = Date.now();
  const cached = hostCache.get(hostname);
  if (cached && cached.exp > now) return cached.hit;

  try {
    const url = new URL("/api/company-sites/public/host", middlewareStorefrontHostApiOrigin());
    url.searchParams.set("hostname", hostname);
    const res = await fetch(url.toString(), {
      headers: { "x-pf-middleware": "1" },
      cache: "no-store",
    });
    if (!res.ok) {
      hostCache.set(hostname, { hit: null, exp: now + CACHE_MS });
      return null;
    }
    const data = (await res.json()) as { companyWebsite?: boolean; companySlug?: string | null };
    const hit =
      data.companyWebsite && data.companySlug
        ? { companySlug: data.companySlug }
        : null;
    hostCache.set(hostname, { hit, exp: now + CACHE_MS });
    return hit;
  } catch {
    const direct = await findCompanyWebsiteByCustomHostname(hostname);
    const hit = direct ? { companySlug: direct.companySlug } : null;
    hostCache.set(hostname, { hit, exp: now + CACHE_MS });
    return hit;
  }
}

/**
 * When the request hits a company's Website / domain setting (e.g. crimson.com),
 * rewrite public paths to the marketing site handlers.
 */
export async function maybeRewriteCompanyWebsiteCustomDomain(
  req: NextRequest,
): Promise<NextResponse | null> {
  const hostRaw = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const hostname = storefrontHostnameForLookup(hostRaw);
  if (!hostname || isStorefrontAppHost(hostname)) return null;

  const pathname = req.nextUrl.pathname;
  if (shouldBypassCompanyWebsiteRewrite(pathname)) return null;

  const resolution = await resolveCompanyWebsiteHost(hostname);
  if (!resolution) return null;

  const { companySlug } = resolution;
  const slugPrefix = `/sites/${encodeURIComponent(companySlug)}`;

  if (pathname === slugPrefix || pathname.startsWith(`${slugPrefix}/`)) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(slugPrefix.length) || "/";
    return NextResponse.redirect(url, 308);
  }

  // Live React routes (not prerendered theme HTML).
  // Plant-bingo checkout lives at /events/{slug}/checkout → /sites/{company}/events/{slug}/checkout
  const plantBingoCheckoutMatch = pathname.match(/^\/events\/([^/]+)\/checkout\/?$/);
  if (
    pathname === "/cart" ||
    pathname.startsWith("/cart/") ||
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/") ||
    pathname.startsWith("/ticket/") ||
    pathname === "/access" ||
    pathname.startsWith("/access/") ||
    plantBingoCheckoutMatch
  ) {
    const dest = req.nextUrl.clone();
    dest.pathname = `${slugPrefix}${pathname}`;
    return NextResponse.rewrite(dest);
  }

  if (pathname === "/company-website" || pathname.startsWith("/company-website/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/company-website" ? "/" : pathname.slice("/company-website".length) || "/";
    return NextResponse.redirect(url, 308);
  }

  const dest = req.nextUrl.clone();
  dest.pathname = pathname === "/" ? "/company-website" : `/company-website${pathname}`;
  return NextResponse.rewrite(dest);
}
