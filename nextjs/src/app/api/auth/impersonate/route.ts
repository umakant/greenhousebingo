/**
 * Start impersonating a company user (superadmin only, requires impersonate-users).
 * Sets session cookies to the target user and stores impersonator id for leave.
 * Cookie secure flag is set from request (X-Forwarded-Proto / URL) so production behind a proxy works.
 */
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getActivatedPackagesForUser } from "@/lib/addons-server";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { authCookieOptions, isSecureRequest } from "@/lib/cookie-options";
import { getPlanPermissionsForUser } from "@/lib/plan-modules";

const IMPERSONATION_MAX_AGE = 60 * 60 * 2; // 2h

async function setAuthCookiesForUser(
  res: NextResponse,
  user: {
    id: bigint;
    email: string | null;
    name: string | null;
    type: string | null;
  },
  cookieOpts: ReturnType<typeof authCookieOptions>,
) {
  const roleLinks = await prisma.modelHasRole.findMany({
    where: { modelId: user.id },
    select: { roleId: true },
  });
  const roleIds = Array.from(new Set(roleLinks.map((r) => r.roleId)));
  const roleRows =
    roleIds.length > 0
      ? await prisma.role.findMany({
          where: { id: { in: roleIds } },
          select: { name: true },
        })
      : [];
  const roles = roleRows.map((r) => r.name).filter(Boolean);
  if (roles.length === 0 && user.type) roles.push(user.type);

  const isSuperadmin = roles.includes("superadmin");
  let permissions: string[] = [];
  if (isSuperadmin) {
    permissions = ["*"];
  } else if (roleIds.length) {
    const permLinks = await prisma.roleHasPermission.findMany({
      where: { roleId: { in: roleIds } },
      select: { permissionId: true },
    });
    const permIds = Array.from(new Set(permLinks.map((p) => p.permissionId)));
    const permRows =
      permIds.length > 0
        ? await prisma.permission.findMany({
            where: { id: { in: permIds } },
            select: { name: true },
          })
        : [];
    permissions = Array.from(
      new Set(permRows.map((p) => p.name).filter(Boolean)),
    );
    const planPermissions = await getPlanPermissionsForUser(user.id);
    for (const p of planPermissions) {
      if (!permissions.includes(p)) permissions.push(p);
    }
  }

  const primaryRole = roles.includes("superadmin")
    ? "superadmin"
    : (roles[0] ?? user.type ?? "user");
  const activatedPackages = await getActivatedPackagesForUser(
    user.id,
    isSuperadmin,
  );

  console.log(`[impersonate] setting cookies: role=${primaryRole}, permissions=${permissions.length}, secure=${cookieOpts.secure}`);

  res.cookies.set("pf_role", primaryRole, cookieOpts);
  res.cookies.set("pf_roles", JSON.stringify(roles), cookieOpts);
  res.cookies.set("pf_permissions", JSON.stringify(permissions), cookieOpts);
  res.cookies.set(
    "pf_activated_packages",
    JSON.stringify(activatedPackages),
    cookieOpts,
  );
  res.cookies.set("pf_email", user.email ?? "", cookieOpts);
  res.cookies.set("pf_name", user.name ?? "User", cookieOpts);
  res.cookies.set("pf_user_id", user.id.toString(), cookieOpts);
}

export async function POST(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  const permsRaw = req.cookies.get("pf_permissions")?.value;
  const email = req.cookies.get("pf_email")?.value;
  const proto = req.headers.get("x-forwarded-proto");
  const secure = isSecureRequest(req);

  console.log(`[impersonate] request: role=${role}, email=${email}, proto=${proto}, secure=${secure}, url=${req.url}`);

  if (role !== "superadmin") {
    console.log(`[impersonate] BLOCKED: not superadmin (role=${role})`);
    return NextResponse.json(
      {
        ok: false,
        message:
          "Only superadmins can impersonate. Check that you are logged in as superadmin.",
      },
      { status: 403 },
    );
  }
  const perms = getPermissionsFromCookieValue(permsRaw);
  if (!hasPermission(perms, "impersonate-users")) {
    console.log(`[impersonate] BLOCKED: no impersonate-users permission (perms=${JSON.stringify(perms)})`);
    return NextResponse.json(
      {
        ok: false,
        message:
          "You need the impersonate-users permission. Add it in Roles & Permissions.",
      },
      { status: 403 },
    );
  }

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid body" },
      { status: 400 },
    );
  }
  const targetIdRaw = body.userId;
  if (!targetIdRaw) {
    return NextResponse.json(
      { ok: false, message: "userId required" },
      { status: 400 },
    );
  }
  const targetId = BigInt(targetIdRaw);

  console.log(`[impersonate] targeting userId=${targetIdRaw}`);

  const currentEmail = req.cookies.get("pf_email")?.value?.trim().toLowerCase();
  if (!currentEmail) {
    return NextResponse.json(
      { ok: false, message: "Not authenticated" },
      { status: 401 },
    );
  }
  const currentUser = await prisma.user.findFirst({
    where: { email: currentEmail },
    select: { id: true },
  });
  if (!currentUser) {
    console.log(`[impersonate] BLOCKED: superadmin not found in DB for email=${currentEmail}`);
    return NextResponse.json(
      { ok: false, message: "Not authenticated" },
      { status: 401 },
    );
  }
  if (currentUser.id === targetId) {
    return NextResponse.json(
      { ok: false, message: "You cannot impersonate yourself" },
      { status: 400 },
    );
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: targetId, type: { in: ["company", "company_admin"] } },
    select: { id: true, email: true, name: true, type: true },
  });
  if (!targetUser) {
    console.log(`[impersonate] BLOCKED: target userId=${targetIdRaw} not found or not a company`);
    return NextResponse.json(
      { ok: false, message: "Company not found" },
      { status: 404 },
    );
  }

  console.log(`[impersonate] target found: email=${targetUser.email}, type=${targetUser.type}`);

  const cookieOpts = authCookieOptions(req, IMPERSONATION_MAX_AGE);
  try {
    const res = NextResponse.json({ ok: true, redirect: "/launchpad" });
    await setAuthCookiesForUser(res, targetUser, cookieOpts);
    res.cookies.set("pf_impersonator_id", currentUser.id.toString(), cookieOpts);
    console.log(`[impersonate] SUCCESS for ${targetUser.email}`);
    return res;
  } catch (err) {
    console.error("[impersonate] failed to build session:", err);
    return NextResponse.json({ ok: false, message: "Session error, please try again." }, { status: 500 });
  }
}
