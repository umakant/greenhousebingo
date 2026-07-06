import type { NextResponse } from "next/server";

import { resolveSessionAuthz } from "@/lib/effective-user-permissions";

const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

/** Rebuild pf_permissions + pf_activated_packages after plan/subscription changes. */
export async function applySessionAuthCookies(res: NextResponse, userId: bigint): Promise<void> {
  const authz = await resolveSessionAuthz(userId);
  res.cookies.set("pf_permissions", authz.permissionsCookieValue, SESSION_COOKIE_OPTS);
  res.cookies.set("pf_activated_packages", JSON.stringify(authz.activatedPackages), SESSION_COOKIE_OPTS);
}
