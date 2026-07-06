import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { resolveSessionAuthz } from "@/lib/effective-user-permissions";
import { resolveEmployeePortalLoginHome } from "@/lib/hrm-employee-role";
import { recordStaffLoginSuccess } from "@/lib/login-history";

type Body = {
  email?: string;
  password?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";

  if (!email) {
    return NextResponse.json({ ok: false, message: "Email is required." }, { status: 400 });
  }

  // Back-compat: env-configured demo superadmin login (older flow).
  const legacyDemoEmail = (process.env.PF_DEMO_SUPERADMIN_EMAIL ?? "").trim().toLowerCase();
  const legacyDemoPassword = process.env.PF_DEMO_SUPERADMIN_PASSWORD ?? "";

  if (legacyDemoEmail && legacyDemoPassword && email === legacyDemoEmail && password === legacyDemoPassword) {
    const res = NextResponse.json({ ok: true, home: "/dashboard" });
    const roles = ["superadmin"];
    const permissions = ["*"];
    const activatedPackages: string[] = [];

    res.cookies.set("pf_role", "superadmin", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    res.cookies.set("pf_roles", JSON.stringify(roles), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    res.cookies.set("pf_permissions", JSON.stringify(permissions), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    res.cookies.set("pf_activated_packages", JSON.stringify(activatedPackages), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    res.cookies.set("pf_email", legacyDemoEmail, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    res.cookies.set("pf_name", "Super Admin", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return res;
  }

  const user = await prisma.user.findFirst({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      type: true,
      isActive: true,
      isEnableLogin: true,
      forcePasswordReset: true,
    },
  });

  if (!user?.password) {
    return NextResponse.json({ ok: false, message: "Invalid credentials." }, { status: 401 });
  }

  // Laravel's bcrypt hashes typically use `$2y$` prefix; bcryptjs expects `$2a$`.
  const normalizedHash = user.password.startsWith("$2y$") ? `$2a$${user.password.slice(4)}` : user.password;
  const ok = await bcrypt.compare(password, normalizedHash);
  if (!ok) {
    return NextResponse.json({ ok: false, message: "Invalid credentials." }, { status: 401 });
  }

  if (user.isActive === false) {
    return NextResponse.json({ ok: false, message: "Your account is inactive. Contact support if you need help." }, { status: 403 });
  }

  if (user.isEnableLogin === false) {
    const t = (user.type ?? "").toLowerCase();
    if (t === "company" || t === "company_admin") {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Your account is waiting for approval from the Paperflight admin. You can sign in after your company has been approved.",
        },
        { status: 403 },
      );
    }
    return NextResponse.json({ ok: false, message: "Login is disabled for this account." }, { status: 403 });
  }

  const roleLinks = await prisma.modelHasRole.findMany({
    where: { modelId: user.id },
    select: { roleId: true },
  });
  const roleIds = Array.from(new Set(roleLinks.map((r) => r.roleId)));
  const roleRows = roleIds.length
    ? await prisma.role.findMany({
        where: { id: { in: roleIds } },
        select: { name: true },
      })
    : [];

  const roles = roleRows.map((r) => r.name).filter(Boolean);
  if (roles.length === 0 && user.type) roles.push(user.type);

  const authz = await resolveSessionAuthz(user.id);
  const permissions = authz.permissionNames;
  const primaryRole = authz.primaryRole;
  const activatedPackages = authz.activatedPackages;
  const isClientPortal =
    roles.includes("client") || (user.type ?? "").toLowerCase() === "client";
  const isStaffPortal =
    roles.includes("staff") || (user.type ?? "").toLowerCase() === "staff";
  const isPartnerPortal =
    roles.includes("partner") || (user.type ?? "").toLowerCase() === "partner";
  const isMarketplaceVendorPortal =
    roles.includes("marketplace_vendor") || (user.type ?? "").toLowerCase() === "marketplace_vendor";
  const homePath = roles.includes("superadmin")
    ? "/dashboard"
    : isPartnerPortal
      ? "/partner"
      : isMarketplaceVendorPortal
        ? user.forcePasswordReset
          ? "/marketplace/vendor/profile?reset=1"
          : "/marketplace/vendor"
        : isClientPortal
          ? "/expense-management"
          : isStaffPortal
            ? resolveEmployeePortalLoginHome(activatedPackages, permissions)
            : "/launchpad";
  const res = NextResponse.json({
    ok: true,
    role: primaryRole,
    roles,
    permissionsCount: permissions.length,
    home: homePath,
    forcePasswordReset: user.forcePasswordReset === true,
  });

  // Always use compact ID format when permission IDs are available (non-superadmin users).
  // This keeps the pf_permissions cookie well under Replit's ~4KB proxy header limit.
  // The compact format "1,2,3,..." is decoded by getPermissionsFromCookieValue/decodePermissions.
  const permissionsCookieValue = authz.permissionsCookieValue;

  res.cookies.set("pf_role", primaryRole, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  res.cookies.set("pf_roles", JSON.stringify(roles), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  res.cookies.set("pf_permissions", permissionsCookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  res.cookies.set("pf_activated_packages", JSON.stringify(activatedPackages), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  res.cookies.set("pf_email", user.email ?? email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  res.cookies.set("pf_name", user.name ?? "User", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  res.cookies.set("pf_user_id", user.id.toString(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  await recordStaffLoginSuccess(user.id, req);
  return res;
}

