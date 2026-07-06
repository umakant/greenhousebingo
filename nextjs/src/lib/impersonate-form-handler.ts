import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { authCookieOptions, isSecureRequest } from "@/lib/cookie-options";
import {
  buildImpersonationCookies,
  applyImpersonationStackCookies,
  IMPERSONATION_MAX_AGE,
} from "@/lib/impersonation-session";

function errorJson(message: string, status = 403): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

export type ImpersonateFormOptions = {
  /** When true, requires `pf_sensitive_switch` cookie (after profile OTP) and clears it on success. */
  requireSensitiveSwitchGate: boolean;
};

export async function handleImpersonateFormPost(req: NextRequest, opts: ImpersonateFormOptions): Promise<NextResponse> {
  const role = req.cookies.get("pf_role")?.value;
  const permsRaw = req.cookies.get("pf_permissions")?.value;
  const proto = req.headers.get("x-forwarded-proto");
  const secure = isSecureRequest(req);

  console.log(`[impersonate] request: role=${role}, proto=${proto}, secure=${secure}, sensitiveGate=${opts.requireSensitiveSwitchGate}`);

  if (role !== "superadmin") {
    console.log(`[impersonate] BLOCKED: not superadmin`);
    return errorJson("Only superadmins can impersonate.", 403);
  }

  const perms = getPermissionsFromCookieValue(permsRaw);
  if (!hasPermission(perms, "impersonate-users")) {
    console.log(`[impersonate] BLOCKED: no impersonate-users permission`);
    return errorJson("You need the impersonate-users permission.", 403);
  }

  if (opts.requireSensitiveSwitchGate) {
    const switchGate = req.cookies.get("pf_sensitive_switch")?.value;
    if (switchGate !== "1") {
      return errorJson("Complete one-time verification from Switch company in your profile menu first.", 403);
    }
  }

  let userId: string | null = null;
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      userId = body.userId ?? null;
    } else {
      const text = await req.text();
      const params = new URLSearchParams(text);
      userId = params.get("userId");
    }
  } catch {
    return errorJson("Invalid request body.", 400);
  }

  if (!userId) {
    return errorJson("userId required.", 400);
  }

  let targetId: bigint;
  try {
    targetId = BigInt(userId);
  } catch {
    return errorJson("Invalid userId.", 400);
  }
  console.log(`[impersonate] targeting userId=${userId}`);

  const currentEmail = req.cookies.get("pf_email")?.value?.trim().toLowerCase();
  if (!currentEmail) {
    return errorJson("Not authenticated.", 401);
  }

  const currentUser = await prisma.user.findFirst({
    where: { email: currentEmail },
    select: { id: true },
  });
  if (!currentUser) {
    console.log(`[impersonate] BLOCKED: superadmin not found for email=${currentEmail}`);
    return errorJson("Session invalid. Please log in again.", 401);
  }

  if (currentUser.id === targetId) {
    return errorJson("You cannot impersonate yourself.", 400);
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: targetId, type: { in: ["company", "company_admin"] } },
    select: { id: true, email: true, name: true, type: true },
  });
  if (!targetUser) {
    console.log(`[impersonate] BLOCKED: target userId=${userId} not found or not a company`);
    return errorJson("Company user not found.", 404);
  }

  console.log(`[impersonate] target found: email=${targetUser.email}, type=${targetUser.type}`);

  const cookieOpts = authCookieOptions(req, IMPERSONATION_MAX_AGE);
  try {
    const res = NextResponse.json({ success: true, redirectUrl: "/launchpad" }, { status: 200 });
    await buildImpersonationCookies(res, targetUser, cookieOpts);
    applyImpersonationStackCookies(res, req, cookieOpts);
    if (opts.requireSensitiveSwitchGate) {
      res.cookies.set("pf_sensitive_switch", "", { path: "/", maxAge: 0 });
    }
    console.log(`[impersonate] SUCCESS → cookies set for ${targetUser.email}`);
    return res;
  } catch (err) {
    console.error("[impersonate] failed:", err);
    return errorJson("Session error. Please try again.", 500);
  }
}
