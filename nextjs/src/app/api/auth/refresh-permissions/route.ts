import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { resolveSessionAuthz } from "@/lib/effective-user-permissions";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 8,
};

/**
 * POST /api/auth/refresh-permissions
 * Recomputes permissions (role + plan-based) and updates session cookies.
 * Call after subscribing to a plan so the user sees new menus (e.g. Accounting) without logging out.
 */
export async function POST(req: NextRequest) {
  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, message: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, email: true, name: true, type: true },
  });
  if (!user) {
    return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
  }

  const authz = await resolveSessionAuthz(user.id);
  const res = NextResponse.json({ ok: true, permissionsCount: authz.permissionNames.length });

  res.cookies.set("pf_role", authz.primaryRole, COOKIE_OPTS);
  res.cookies.set("pf_roles", JSON.stringify(authz.roles), COOKIE_OPTS);
  res.cookies.set("pf_permissions", authz.permissionsCookieValue, COOKIE_OPTS);
  res.cookies.set("pf_email", user.email ?? email, COOKIE_OPTS);
  res.cookies.set("pf_name", user.name ?? "User", COOKIE_OPTS);
  res.cookies.set("pf_activated_packages", JSON.stringify(authz.activatedPackages), COOKIE_OPTS);
  res.cookies.set("pf_user_id", user.id.toString(), COOKIE_OPTS);

  return res;
}
