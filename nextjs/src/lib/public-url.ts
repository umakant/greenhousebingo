import { NextRequest } from "next/server";

/**
 * Builds an absolute URL for server-side redirects.
 * Uses NEXT_PUBLIC_APP_URL env var first, then falls back to
 * X-Forwarded-Proto + X-Forwarded-Host headers (for proxy environments),
 * then finally req.url (fixing 0.0.0.0 → localhost for local dev).
 */
export function buildRedirectUrl(req: NextRequest, path: string): URL {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (appUrl) {
    return new URL(path, appUrl);
  }

  const proto = req.headers.get("x-forwarded-proto") || "http";
  const hostRaw = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (hostRaw) {
    const host = hostRaw.replace(/^0\.0\.0\.0/i, "localhost");
    return new URL(path, `${proto}://${host}`);
  }

  const fallback = req.url.replace("0.0.0.0", "localhost");
  return new URL(path, fallback);
}
