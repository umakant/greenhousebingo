import "server-only";

import type { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { buildRedirectUrl } from "@/lib/public-url";
import { authCookieOptions } from "@/lib/cookie-options";
import { buildImpersonationCookies } from "@/lib/impersonation-session";
import {
  IMPERSONATE_RETURN_COOKIE,
  IMPERSONATOR_LEGACY_COOKIE,
  IMPERSONATOR_STACK_COOKIE,
  isImpersonationActive,
  popImpersonatorStack,
} from "@/lib/impersonation-stack";

export function readImpersonatingFromRequest(req: NextRequest): boolean {
  return isImpersonationActive(
    req.cookies.get(IMPERSONATOR_STACK_COOKIE)?.value,
    req.cookies.get(IMPERSONATOR_LEGACY_COOKIE)?.value,
    req.cookies.get("pf_user_id")?.value,
  );
}

/** Remove impersonation stack cookies when the session is no longer impersonating. */
export function clearStaleImpersonationCookies(req: NextRequest, res: NextResponse): void {
  const stackRaw = req.cookies.get(IMPERSONATOR_STACK_COOKIE)?.value;
  const legacyRaw = req.cookies.get(IMPERSONATOR_LEGACY_COOKIE)?.value;
  if (!stackRaw?.trim() && !legacyRaw?.trim()) return;

  if (
    isImpersonationActive(stackRaw, legacyRaw, req.cookies.get("pf_user_id")?.value)
  ) {
    return;
  }

  res.cookies.delete(IMPERSONATOR_STACK_COOKIE);
  res.cookies.delete(IMPERSONATOR_LEGACY_COOKIE);
  res.cookies.delete(IMPERSONATE_RETURN_COOKIE);
}

function resolveLeaveRedirect(
  req: NextRequest,
  restoredUser: { type: string | null },
  returnPathCookie: string | undefined,
): string {
  const returnPath = returnPathCookie?.trim();
  if (returnPath && returnPath.startsWith("/") && !returnPath.startsWith("//")) {
    return buildRedirectUrl(req, returnPath).toString();
  }
  const type = (restoredUser.type ?? "").toLowerCase();
  if (type === "superadmin" || type === "super admin") {
    return buildRedirectUrl(req, "/companies").toString();
  }
  if (type === "company" || type === "company_admin") {
    return buildRedirectUrl(req, "/project/dashboard").toString();
  }
  return buildRedirectUrl(req, "/launchpad").toString();
}

export async function handleLeaveImpersonation(
  req: NextRequest,
  res: NextResponse,
): Promise<{ restored: boolean; redirectUrl: string }> {
  const cookieOpts = authCookieOptions(req);
  const stackRaw = req.cookies.get(IMPERSONATOR_STACK_COOKIE)?.value;
  const legacyId = req.cookies.get(IMPERSONATOR_LEGACY_COOKIE)?.value;
  const returnPathCookie = req.cookies.get(IMPERSONATE_RETURN_COOKIE)?.value;

  let restoreUserId: string | null = null;
  let remainingStack = "";

  const popped = popImpersonatorStack(stackRaw);
  if (popped.restoreUserId) {
    restoreUserId = popped.restoreUserId;
    remainingStack = popped.remainingStack;
  } else if (legacyId?.trim()) {
    restoreUserId = legacyId.trim();
  }

  if (!restoreUserId) {
    return {
      restored: false,
      redirectUrl: buildRedirectUrl(req, "/companies").toString(),
    };
  }

  const originalUser = await prisma.user.findUnique({
    where: { id: BigInt(restoreUserId) },
    select: { id: true, email: true, name: true, type: true },
  });

  if (!originalUser) {
    res.cookies.delete(IMPERSONATOR_STACK_COOKIE);
    res.cookies.delete(IMPERSONATOR_LEGACY_COOKIE);
    res.cookies.delete(IMPERSONATE_RETURN_COOKIE);
    return {
      restored: false,
      redirectUrl: buildRedirectUrl(req, "/login").toString(),
    };
  }

  await buildImpersonationCookies(res, originalUser, cookieOpts);

  if (remainingStack) {
    res.cookies.set(IMPERSONATOR_STACK_COOKIE, remainingStack, cookieOpts);
  } else {
    res.cookies.delete(IMPERSONATOR_STACK_COOKIE);
  }
  res.cookies.delete(IMPERSONATOR_LEGACY_COOKIE);

  const stillImpersonating = Boolean(remainingStack);
  if (!stillImpersonating) {
    res.cookies.delete(IMPERSONATE_RETURN_COOKIE);
  }

  const redirectUrl = resolveLeaveRedirect(req, originalUser, stillImpersonating ? returnPathCookie : undefined);

  return { restored: true, redirectUrl };
}
