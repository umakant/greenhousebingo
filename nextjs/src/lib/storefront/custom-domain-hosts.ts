/** Hostnames that serve the Paper Flight admin app (not a merchant storefront). */
export function parseStorefrontAppHosts(): Set<string> {
  const hosts = new Set<string>(["localhost", "127.0.0.1"]);
  const raw = process.env.STOREFRONT_APP_HOSTS ?? "";
  for (const part of raw.split(/[\s,;]+/)) {
    const h = normalizeAppHost(part);
    if (h) hosts.add(h);
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
  if (appUrl) {
    try {
      const h = normalizeAppHost(new URL(appUrl).hostname);
      if (h) hosts.add(h);
    } catch {
      /* ignore */
    }
  }
  return hosts;
}

function normalizeAppHost(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]!
    .replace(/:\d+$/, "");
}

/** Optional comma-separated merchant hostnames (fallback if middleware host API is unreachable). */
export function parseStorefrontMerchantHosts(): Set<string> {
  const hosts = new Set<string>();
  const raw = process.env.STOREFRONT_MERCHANT_HOSTS ?? "";
  for (const part of raw.split(/[\s,;]+/)) {
    const h = normalizeAppHost(part);
    if (h) hosts.add(h);
  }
  return hosts;
}

/** Origin for middleware → /api/storefront/public/host (avoid public HTTPS self-fetch). */
export function middlewareStorefrontHostApiOrigin(): string {
  const explicit = process.env.MIDDLEWARE_INTERNAL_ORIGIN?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const port = process.env.PORT?.trim() || "3000";
  return `http://127.0.0.1:${port}`;
}

export function isStorefrontAppHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  if (!h) return true;
  /** Merchant custom domains must never be classified as the admin app host. */
  if (parseStorefrontMerchantHosts().has(h)) return false;
  return parseStorefrontAppHosts().has(h);
}

/** `/shop` on app host; `` on custom domain so URLs stay `phillywaterice.com/products/...`. */
export function storefrontPublicPathPrefix(customDomain: boolean): string {
  return customDomain ? "" : "/shop";
}

export function joinStorefrontPublicPath(customDomain: boolean, segment: string): string {
  const seg = segment.replace(/^\/+/, "");
  const base = storefrontPublicPathPrefix(customDomain);
  if (!seg) return base || "/";
  return base ? `${base}/${seg}` : `/${seg}`;
}

/** Browser-visible path: strip internal `/shop` prefix on custom domains. */
export function toPublicShopPath(internalPath: string, customDomain: boolean): string {
  if (!customDomain) return internalPath || "/";
  if (!internalPath || internalPath === "/shop") return "/";
  if (internalPath.startsWith("/shop/")) return internalPath.slice(5) || "/";
  return internalPath;
}

/** Paths that must not be rewritten to `/shop` on a merchant custom domain. */
export function shouldBypassStorefrontShopRewrite(pathname: string): boolean {
  if (!pathname || pathname === "/") return false;
  if (pathname.startsWith("/api")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/storefront")) return true;
  if (pathname === "/events" || pathname.startsWith("/events/")) return true;
  if (/\.[a-z0-9]{2,8}$/i.test(pathname)) return true;
  return false;
}

/** DNS target shown in admin (CNAME / forwarding). */
export function storefrontDnsTargetHostname(): string {
  const explicit = (process.env.STOREFRONT_DNS_TARGET ?? "").trim();
  if (explicit) {
    return explicit.replace(/^https?:\/\//, "").split("/")[0]!.replace(/:\d+$/, "");
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  try {
    if (appUrl) return new URL(appUrl).hostname;
  } catch {
    /* ignore */
  }
  return "nextjs.paperflight.cc";
}
