import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { authCookieOptions } from "@/lib/cookie-options";
import { isCompanyTenantAdminUser } from "@/lib/launchpad/launchpad-access";
import { resolvePortalLoginHome, resolveLmsImpersonationHome } from "@/lib/resolve-portal-login-home";
import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import { resolveTenantOrganizationId } from "@/lib/lms-organization";
import {
  buildImpersonationCookies,
  applyImpersonationStackCookies,
  IMPERSONATION_MAX_AGE,
} from "@/lib/impersonation-session";
import {
  IMPERSONATOR_LEGACY_COOKIE,
  IMPERSONATOR_STACK_COOKIE,
  parseImpersonatorStack,
} from "@/lib/impersonation-stack";
import {
  getEffectiveActivatedPackagesForUser,
  getEffectivePermissionNamesForUser,
} from "@/lib/effective-user-permissions";

const PORTAL_USER_TYPES = ["staff", "client", "vendor"] as const;
type PortalUserType = (typeof PORTAL_USER_TYPES)[number];
export type LmsPortalImpersonateKind = "student" | "instructor";

function userBelongsToOrganization(
  user: { id: bigint; type: string | null; createdBy: bigint | null },
  organizationId: bigint,
): boolean {
  const t = (user.type ?? "").trim().toLowerCase();
  if (t === "company" || t === "company_admin") return user.id === organizationId;
  return user.createdBy === organizationId;
}

function errorJson(message: string, status = 403): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

function getCompanyId(actor: {
  id: bigint;
  type: string | null;
  createdBy: bigint | null;
}): bigint {
  if (actor.type === "company" || actor.type === "company_admin") return actor.id;
  return actor.createdBy ?? actor.id;
}

const PORTAL_IMPERSONATION_MODULE_PERMS = [
  "impersonate-portal-users",
  "manage-account",
  "manage-customers",
  "manage-vendors",
  "manage-hrm",
  "manage-employees",
  "manage-lms",
  "manage-lms-students",
  "manage-lms-instructors",
  "manage-lms-courses",
] as const;

export function actorCanImpersonatePortalUsers(
  actorType: string | null,
  roles: string[],
  permissions: string[],
): boolean {
  if (permissions.includes("*")) return true;
  if (roles.includes("superadmin") && hasPermission(permissions, "impersonate-users")) return true;
  if (!isCompanyTenantAdminUser(actorType)) return false;
  return hasAnyPermission(permissions, [...PORTAL_IMPERSONATION_MODULE_PERMS]);
}

function hasAnyPermission(permissions: string[], names: string[]): boolean {
  if (permissions.includes("*")) return true;
  return names.some((n) => permissions.includes(n));
}

export function actorCanImpersonatePortalKind(
  permissions: string[],
  portalType: PortalUserType,
  opts?: { authorizerType?: string | null; roles?: string[] },
): boolean {
  if (permissions.includes("*")) return true;

  const authorizerType = opts?.authorizerType ?? null;
  const roles = opts?.roles ?? [];
  /** Company tenant admins who may impersonate portal users can impersonate staff/customer/vendor in their org. */
  if (
    isCompanyTenantAdminUser(authorizerType) &&
    actorCanImpersonatePortalUsers(authorizerType, roles, permissions)
  ) {
    return true;
  }

  if (portalType === "staff") {
    return hasAnyPermission(permissions, [
      "manage-hrm",
      "manage-employees",
      "impersonate-portal-users",
      "manage-expense-management",
    ]);
  }
  if (portalType === "client") {
    return hasAnyPermission(permissions, ["manage-account", "manage-customers", "impersonate-portal-users"]);
  }
  return hasAnyPermission(permissions, ["manage-account", "manage-vendors", "impersonate-portal-users"]);
}

export function actorCanImpersonateLmsPortal(
  permissions: string[],
  kind: LmsPortalImpersonateKind,
  opts?: { authorizerType?: string | null; roles?: string[] },
): boolean {
  if (permissions.includes("*")) return true;

  const authorizerType = opts?.authorizerType ?? null;
  const roles = opts?.roles ?? [];
  /** Company admins who may impersonate portal users may impersonate LMS learners/instructors too. */
  if (
    isCompanyTenantAdminUser(authorizerType) &&
    actorCanImpersonatePortalUsers(authorizerType, roles, permissions)
  ) {
    return true;
  }

  if (kind === "student") {
    return hasAnyPermission(permissions, [
      "manage-lms",
      "manage-lms-students",
      "manage-lms-courses",
      "impersonate-portal-users",
    ]);
  }
  return hasAnyPermission(permissions, ["manage-lms", "manage-lms-instructors", "impersonate-portal-users"]);
}

async function validateLmsPortalTarget(
  targetUser: {
    id: bigint;
    type: string | null;
    createdBy: bigint | null;
    isEnableLogin: boolean | null;
    isActive: boolean | null;
  },
  organizationId: bigint,
  kind: LmsPortalImpersonateKind,
): Promise<string | null> {
  if (!targetUser.isActive) return "This user account is inactive.";
  if (!userBelongsToOrganization(targetUser, organizationId)) {
    return "This user does not belong to your organization.";
  }

  if (kind === "student") {
    const userType = (targetUser.type ?? "").trim().toLowerCase();
    if (userType === "lms-student") return null;
    const enrollment = await prisma.enrollment.findFirst({
      where: { organizationId, studentUserId: targetUser.id },
      select: { id: true },
    });
    if (!enrollment) return "No LMS enrollment found for this learner.";
    return null;
  }

  const profile = await prisma.instructorProfile.findFirst({
    where: { organizationId, userId: targetUser.id },
    select: { id: true, isActive: true },
  });
  if (!profile) return "No instructor profile found for this user.";
  if (!profile.isActive) return "Instructor profile is inactive.";
  return null;
}

async function validatePortalTarget(
  targetUser: {
    id: bigint;
    type: string | null;
    createdBy: bigint | null;
    isEnableLogin: boolean | null;
    isActive: boolean | null;
  },
  companyId: bigint,
  portalType: PortalUserType,
): Promise<string | null> {
  if (!targetUser.isActive || !targetUser.isEnableLogin) {
    return "Portal login is disabled for this user.";
  }
  if (targetUser.createdBy == null || targetUser.createdBy !== companyId) {
    return "This portal user does not belong to your organization.";
  }
  if ((targetUser.type ?? "").toLowerCase() !== portalType) {
    return "Invalid portal user type.";
  }

  if (portalType === "staff") {
    const emp = await prisma.hrmEmployee.findFirst({
      where: { userId: targetUser.id, createdBy: companyId },
      select: { id: true },
    });
    if (!emp) return "Employee portal account not linked.";
  } else if (portalType === "client") {
    const cust = await prisma.customer.findFirst({
      where: { userId: targetUser.id, createdBy: companyId },
      select: { id: true },
    });
    if (!cust) return "Customer portal account not linked.";
  } else {
    const vendorUser = await prisma.user.findFirst({
      where: { id: targetUser.id, type: "vendor", createdBy: companyId },
      select: { email: true },
    });
    if (!vendorUser?.email) return "Vendor portal account not found.";
    const vendor = await prisma.vendor.findFirst({
      where: {
        createdBy: companyId,
        email: vendorUser.email.trim().toLowerCase(),
      },
      select: { id: true },
    });
    if (!vendor) return "Vendor record not linked to this login.";
  }

  return null;
}

type SessionActor = {
  id: bigint;
  type: string | null;
  createdBy: bigint | null;
  email: string | null;
};

async function loadSessionActor(email: string): Promise<SessionActor | null> {
  return prisma.user.findFirst({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, type: true, createdBy: true, email: true },
  });
}

async function loadRolesForUser(userId: bigint): Promise<string[]> {
  const roleLinks = await prisma.modelHasRole.findMany({
    where: { modelId: userId },
    select: { roleId: true },
  });
  const roleIds = Array.from(new Set(roleLinks.map((r) => r.roleId)));
  const roleRows =
    roleIds.length > 0
      ? await prisma.role.findMany({ where: { id: { in: roleIds } }, select: { name: true } })
      : [];
  const roles = roleRows.map((r) => r.name).filter(Boolean);
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { type: true },
  });
  if (roles.length === 0 && user?.type) roles.push(user.type);
  return roles;
}

/**
 * When already impersonating, portal impersonation must be authorized by the original
 * company admin on the stack — not the impersonated employee/customer session.
 */
async function resolvePortalImpersonationAuthorizer(req: NextRequest): Promise<{
  sessionActor: SessionActor;
  authorizer: SessionActor;
  permissions: string[];
  roles: string[];
  impersonationActive: boolean;
} | null> {
  const currentEmail = req.cookies.get("pf_email")?.value?.trim().toLowerCase();
  if (!currentEmail) return null;

  const sessionActor = await loadSessionActor(currentEmail);
  if (!sessionActor) return null;

  const stack = parseImpersonatorStack(req.cookies.get(IMPERSONATOR_STACK_COOKIE)?.value);
  const legacyId = req.cookies.get(IMPERSONATOR_LEGACY_COOKIE)?.value?.trim();
  const impersonationActive = stack.length > 0 || Boolean(legacyId && /^\d+$/.test(legacyId));

  let authorizerId = sessionActor.id;
  if (stack.length > 0) {
    try {
      authorizerId = BigInt(stack[0]!);
    } catch {
      authorizerId = sessionActor.id;
    }
  } else if (legacyId && /^\d+$/.test(legacyId)) {
    try {
      authorizerId = BigInt(legacyId);
    } catch {
      authorizerId = sessionActor.id;
    }
  }

  const authorizer =
    authorizerId === sessionActor.id
      ? sessionActor
      : await prisma.user.findFirst({
          where: { id: authorizerId },
          select: { id: true, type: true, createdBy: true, email: true },
        });

  if (!authorizer) return null;

  const permissions = impersonationActive
    ? await getEffectivePermissionNamesForUser(authorizer.id)
    : authorizer.id !== sessionActor.id
      ? await getEffectivePermissionNamesForUser(authorizer.id)
      : getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);

  const roles = impersonationActive
    ? await loadRolesForUser(authorizer.id)
    : authorizer.id !== sessionActor.id
      ? await loadRolesForUser(authorizer.id)
      : (() => {
          const rolesRaw = req.cookies.get("pf_roles")?.value ?? "[]";
          try {
            const parsed = JSON.parse(rolesRaw) as unknown;
            if (Array.isArray(parsed)) {
              return parsed.filter((r): r is string => typeof r === "string");
            }
          } catch {
            /* ignore */
          }
          return [] as string[];
        })();

  return { sessionActor, authorizer, permissions, roles, impersonationActive };
}

export async function handleImpersonatePortalPost(req: NextRequest): Promise<NextResponse> {
  const resolved = await resolvePortalImpersonationAuthorizer(req);
  if (!resolved) return errorJson("Not authenticated.", 401);

  const { sessionActor, authorizer, permissions: perms, roles, impersonationActive } = resolved;

  if (!actorCanImpersonatePortalUsers(authorizer.type, roles, perms)) {
    if (impersonationActive) {
      return errorJson(
        "Your current session cannot impersonate other users. Click Leave Impersonation, then impersonate from your company admin account.",
        403,
      );
    }
    return errorJson("You do not have permission to impersonate portal users.", 403);
  }

  let userId: string | null = null;
  let returnPath: string | null = null;
  let lmsPortal: LmsPortalImpersonateKind | null = null;
  try {
    const body = (await req.json()) as {
      userId?: string;
      returnPath?: string;
      lmsPortal?: string;
    };
    userId = body.userId ?? null;
    returnPath = body.returnPath ?? null;
    const lp = (body.lmsPortal ?? "").trim().toLowerCase();
    if (lp === "student" || lp === "instructor") lmsPortal = lp;
  } catch {
    return errorJson("Invalid request body.", 400);
  }

  if (!userId) return errorJson("userId required.", 400);

  let targetId: bigint;
  try {
    targetId = BigInt(userId);
  } catch {
    return errorJson("Invalid userId.", 400);
  }

  if (sessionActor.id === targetId) {
    return errorJson("You cannot impersonate yourself.", 400);
  }

  const companyId = getCompanyId(authorizer);

  const targetUser = await prisma.user.findFirst({
    where: { id: targetId },
    select: {
      id: true,
      email: true,
      name: true,
      type: true,
      createdBy: true,
      isEnableLogin: true,
      isActive: true,
    },
  });

  if (!targetUser) {
    return errorJson("User not found.", 404);
  }

  const cookieOpts = authCookieOptions(req, IMPERSONATION_MAX_AGE);

  try {
    const activatedPackages = await getEffectiveActivatedPackagesForUser(targetUser.id, false);
    const targetPerms = await getEffectivePermissionNamesForUser(targetUser.id);

    let homePath: string;

    if (lmsPortal) {
      const lmsActor = await lmsTenantActorFromRequest(req);
      const orgId =
        resolveTenantOrganizationId(authorizer) ??
        lmsActor?.organizationId ??
        companyId;

      if (!actorCanImpersonateLmsPortal(perms, lmsPortal, { authorizerType: authorizer.type, roles })) {
        return errorJson("You do not have permission to impersonate this LMS user.", 403);
      }

      const lmsError = await validateLmsPortalTarget(targetUser, orgId, lmsPortal);
      if (lmsError) return errorJson(lmsError, 404);

      homePath = resolveLmsImpersonationHome(lmsPortal, targetPerms);
    } else {
      const portalType = (targetUser.type ?? "").toLowerCase() as PortalUserType;
      if (!PORTAL_USER_TYPES.includes(portalType)) {
        return errorJson("Portal user not found.", 404);
      }

      if (!actorCanImpersonatePortalKind(perms, portalType, { authorizerType: authorizer.type, roles })) {
        return errorJson("You do not have permission to impersonate this user type.", 403);
      }

      const validationError = await validatePortalTarget(targetUser, companyId, portalType);
      if (validationError) return errorJson(validationError, 404);

      homePath = resolvePortalLoginHome(targetUser.type, activatedPackages, targetPerms);
    }

    if (lmsPortal === "student") {
      const { assignLmsStudentRoleToUser } = await import("@/lib/lms-student-role");
      await assignLmsStudentRoleToUser(targetUser.id);
    } else if (lmsPortal === "instructor") {
      const { assignLmsInstructorRoleToUser } = await import("@/lib/lms-instructor-role");
      await assignLmsInstructorRoleToUser(targetUser.id);
    } else {
      const portalType = (targetUser.type ?? "").toLowerCase() as PortalUserType;
      if (portalType === "staff") {
        const { assignStaffRoleToUser } = await import("@/lib/hrm-employee-role");
        await assignStaffRoleToUser(targetUser.id);
      } else if (portalType === "client") {
        const { assignCustomerClientRoleToUser } = await import("@/lib/account-customer-role");
        await assignCustomerClientRoleToUser(targetUser.id);
      } else if (portalType === "vendor") {
        const { assignVendorRoleToUser } = await import("@/lib/account-vendor-role");
        await assignVendorRoleToUser(targetUser.id);
      }
    }

    const refreshedUser = await prisma.user.findFirst({
      where: { id: targetUser.id },
      select: { id: true, email: true, name: true, type: true },
    });
    const sessionUser = refreshedUser ?? targetUser;

    const res = NextResponse.json(
      { success: true, redirectUrl: homePath.startsWith("/") ? homePath : `/${homePath}` },
      { status: 200 },
    );
    await buildImpersonationCookies(res, sessionUser, cookieOpts);
    applyImpersonationStackCookies(res, req, cookieOpts, { returnPath });
    return res;
  } catch (err) {
    console.error("[impersonate-portal] failed:", err);
    return errorJson("Session error. Please try again.", 500);
  }
}
