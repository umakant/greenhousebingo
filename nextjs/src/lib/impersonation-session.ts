import type { NextResponse } from "next/server";

import {
  buildPermissionsCookieValueForUser,
  getEffectiveActivatedPackagesForUser,
} from "@/lib/effective-user-permissions";
import { prisma } from "@/lib/prisma";
import {
  IMPERSONATE_RETURN_COOKIE,
  IMPERSONATOR_LEGACY_COOKIE,
  IMPERSONATOR_STACK_COOKIE,
  pushImpersonatorStack,
} from "@/lib/impersonation-stack";
import type { authCookieOptions } from "@/lib/cookie-options";

export const IMPERSONATION_MAX_AGE = 60 * 60 * 2;

export async function buildImpersonationCookies(
  res: NextResponse,
  user: { id: bigint; email: string | null; name: string | null; type: string | null },
  cookieOpts: ReturnType<typeof authCookieOptions>,
) {
  const roleLinks = await prisma.modelHasRole.findMany({
    where: { modelId: user.id },
    select: { roleId: true },
  });
  const roleIds = Array.from(new Set(roleLinks.map((r) => r.roleId)));
  const roleRows =
    roleIds.length > 0
      ? await prisma.role.findMany({ where: { id: { in: roleIds } }, select: { name: true } })
      : [];
  const roles = roleRows.map((r) => r.name).filter(Boolean);
  if (roles.length === 0 && user.type) roles.push(user.type);

  const isSuperadmin = roles.includes("superadmin");
  const permissionsCookieValue = await buildPermissionsCookieValueForUser(user.id);
  const primaryRole = isSuperadmin ? "superadmin" : (roles[0] ?? user.type ?? "user");
  const activatedPackages = await getEffectiveActivatedPackagesForUser(user.id, isSuperadmin);

  res.cookies.set("pf_role", primaryRole, cookieOpts);
  res.cookies.set("pf_roles", JSON.stringify(roles), cookieOpts);
  res.cookies.set("pf_permissions", permissionsCookieValue, cookieOpts);
  res.cookies.set("pf_activated_packages", JSON.stringify(activatedPackages), cookieOpts);
  res.cookies.set("pf_email", user.email ?? "", cookieOpts);
  res.cookies.set("pf_name", user.name ?? "User", cookieOpts);
  res.cookies.set("pf_user_id", user.id.toString(), cookieOpts);
}

/** Record nested impersonation so "Leave impersonation" can restore the prior session. */
export function applyImpersonationStackCookies(
  res: NextResponse,
  req: {
    cookies: {
      get: (name: string) => { value?: string } | undefined;
    };
  },
  cookieOpts: ReturnType<typeof authCookieOptions>,
  opts?: { returnPath?: string | null },
) {
  const stack = pushImpersonatorStack(
    req.cookies.get(IMPERSONATOR_STACK_COOKIE)?.value,
    req.cookies.get(IMPERSONATOR_LEGACY_COOKIE)?.value,
    req.cookies.get("pf_user_id")?.value,
  );
  if (stack) {
    res.cookies.set(IMPERSONATOR_STACK_COOKIE, stack, cookieOpts);
  }
  res.cookies.delete(IMPERSONATOR_LEGACY_COOKIE);

  const returnPath = opts?.returnPath?.trim();
  if (returnPath && returnPath.startsWith("/") && !returnPath.startsWith("//")) {
    res.cookies.set(IMPERSONATE_RETURN_COOKIE, returnPath.slice(0, 512), cookieOpts);
  }
}
