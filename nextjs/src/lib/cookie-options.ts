import type { NextRequest } from "next/server";

/**
 * Whether the current request is over HTTPS (direct or via proxy).
 * Use for cookie `secure` so cookies work in production behind a reverse proxy.
 */
export function isSecureRequest(req: NextRequest): boolean {
  const proto = req.headers.get("x-forwarded-proto") ?? req.headers.get("x-forwarded-ssl");
  if (proto === "https" || proto === "on") return true;
  try {
    if (new URL(req.url).protocol === "https:") return true;
  } catch {
    // ignore parse errors
  }
  // In production, always secure — the proxy terminates TLS before Next.js sees the request.
  return process.env.NODE_ENV === "production";
}

export function authCookieOptions(req: NextRequest, maxAgeSeconds = 60 * 60 * 8) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecureRequest(req),
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
