import { NextRequest } from "next/server";

/**
 * Builds an absolute URL for server-side redirects.
 * Prefers the incoming request host (custom domains like socialgreenhouse.greenhousebingo.com),
 * then NEXT_PUBLIC_APP_URL, then req.url.
 */
export function buildRedirectUrl(req: NextRequest, path: string): URL {
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const hostRaw = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (hostRaw) {
    const host = hostRaw.replace(/^0\.0\.0\.0/i, "localhost").split(",")[0]!.trim();
    if (host) {
      return new URL(path, `${proto}://${host}`);
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (appUrl) {
    return new URL(path, appUrl);
  }

  const fallback = req.url.replace("0.0.0.0", "localhost");
  return new URL(path, fallback);
}
