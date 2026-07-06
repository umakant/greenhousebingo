import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  isStorefrontAppHost,
  middlewareStorefrontHostApiOrigin,
  parseStorefrontMerchantHosts,
  shouldBypassStorefrontShopRewrite,
} from "@/lib/storefront/custom-domain-hosts";
import { storefrontHostnameForLookup } from "@/lib/storefront/storefront-host-header";

const hostCache = new Map<string, { storefront: boolean; exp: number }>();
const CACHE_MS = 60_000;

async function isMerchantStorefrontHost(_req: NextRequest, hostname: string): Promise<boolean> {
  if (isStorefrontAppHost(hostname)) return false;

  if (parseStorefrontMerchantHosts().has(hostname)) return true;

  const now = Date.now();
  const hit = hostCache.get(hostname);
  if (hit && hit.exp > now) return hit.storefront;

  try {
    const url = new URL("/api/storefront/public/host", middlewareStorefrontHostApiOrigin());
    url.searchParams.set("hostname", hostname);
    const res = await fetch(url.toString(), {
      headers: { "x-pf-middleware": "1" },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { storefront?: boolean };
    const storefront = Boolean(data.storefront);
    hostCache.set(hostname, { storefront, exp: now + CACHE_MS });
    return storefront;
  } catch {
    return parseStorefrontMerchantHosts().has(hostname);
  }
}

/**
 * When the request hits a registered merchant domain (e.g. phillywaterice.com),
 * rewrite public paths to `/shop` so the storefront home is at `/` on that host.
 */
export async function maybeRewriteStorefrontCustomDomain(
  req: NextRequest,
): Promise<NextResponse | null> {
  const hostRaw = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const hostname = storefrontHostnameForLookup(hostRaw);
  if (!hostname) return null;

  const pathname = req.nextUrl.pathname;
  const isStorefront = await isMerchantStorefrontHost(req, hostname);
  if (!isStorefront) return null;

  /** Same host only: hide `/shop` in the address bar (`phillywaterice.com/shop` → `/`). */
  if (pathname === "/shop" || pathname.startsWith("/shop/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/shop" ? "/" : pathname.slice("/shop".length) || "/";
    return NextResponse.redirect(url, 308);
  }

  if (shouldBypassStorefrontShopRewrite(pathname)) return null;

  const dest = req.nextUrl.clone();
  dest.pathname = pathname === "/" ? "/shop" : `/shop${pathname}`;
  return NextResponse.rewrite(dest);
}
