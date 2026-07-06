import "server-only";

import { prisma } from "@/lib/prisma";

/** Built-in portal / platform roles (not company-custom roles). */
export const SYSTEM_PORTAL_ROLE_NAMES = [
  "client",
  "staff",
  "vendor",
  "lms-student",
  "lms-instructor",
  "support-staff",
  "expense-supervisor",
  "expense-billing",
  "partner",
] as const;

/** Expected count of built-in portal templates (used to auto-sync on roles list). */
export const SYSTEM_PORTAL_ROLE_COUNT = SYSTEM_PORTAL_ROLE_NAMES.length;

export const PLATFORM_ROLE_NAMES = ["superadmin", "company", ...SYSTEM_PORTAL_ROLE_NAMES] as const;

export type SystemPortalRoleName = (typeof SYSTEM_PORTAL_ROLE_NAMES)[number];

const SYSTEM_PORTAL_ROLE_SET = new Set<string>(SYSTEM_PORTAL_ROLE_NAMES);

export function isSystemPortalRoleName(name: string | null | undefined): boolean {
  return SYSTEM_PORTAL_ROLE_SET.has((name ?? "").trim().toLowerCase());
}

/** Marks a role as a global system template (visible to all tenants; not editable). */
export async function finalizeSystemPortalRole(roleId: bigint): Promise<void> {
  await prisma.role.update({
    where: { id: roleId },
    data: { createdBy: null, editable: false },
  });
}

export function actorIsSuperadmin(
  actorType: string | null | undefined,
  cookieRoles: string[] = [],
): boolean {
  const t = (actorType ?? "").trim().toLowerCase();
  if (t === "superadmin" || t === "super admin") return true;
  return cookieRoles.map((r) => r.trim().toLowerCase()).includes("superadmin");
}

/** Prisma `where` for listing roles in User Management. */
export function buildRolesListWhere(
  companyId: bigint,
  opts: { isSuperadmin: boolean },
): { OR: Array<Record<string, unknown>> } {
  if (opts.isSuperadmin) {
    return {
      OR: [
        { name: { in: [...PLATFORM_ROLE_NAMES] } },
        { createdBy: companyId },
      ],
    };
  }
  return {
    OR: [
      { name: { in: [...SYSTEM_PORTAL_ROLE_NAMES] } },
      { createdBy: companyId },
    ],
  };
}

export function canActorAccessRole(
  role: { name: string; createdBy: bigint | null },
  companyId: bigint,
  isSuperadmin: boolean,
): boolean {
  if (isSystemPortalRoleName(role.name) || (isSuperadmin && role.name === "superadmin") || role.name === "company") {
    return true;
  }
  if (isSuperadmin && PLATFORM_ROLE_NAMES.includes(role.name as (typeof PLATFORM_ROLE_NAMES)[number])) {
    return true;
  }
  return role.createdBy != null && role.createdBy === companyId;
}

/** Ensures all portal roles exist with permissions and are registered as system templates. */
export async function ensureAllSystemPortalRoles(): Promise<void> {
  const { ensureCustomerClientRoleWithPermissions } = await import("@/lib/account-customer-role");
  const { ensureStaffRoleWithModulePermissions } = await import("@/lib/hrm-employee-role");
  const { ensureVendorRoleWithPermissions } = await import("@/lib/account-vendor-role");
  const { ensureLmsStudentRoleWithPermissions } = await import("@/lib/lms-student-role");
  const { ensureLmsInstructorRoleWithPermissions } = await import("@/lib/lms-instructor-role");
  const { ensureSupportStaffRoleWithPermissions } = await import("@/lib/support-staff-role");
  const { ensureExpenseSupervisorRoleWithPermissions } = await import("@/lib/expense-supervisor-role");
  const { ensureExpenseBillingRoleWithPermissions } = await import("@/lib/expense-billing-role");
  const { ensurePartnerRoleWithPermissions } = await import("@/lib/partner-role");

  const roleIds = [
    await ensureCustomerClientRoleWithPermissions(),
    await ensureStaffRoleWithModulePermissions(),
    await ensureVendorRoleWithPermissions(),
    await ensureLmsStudentRoleWithPermissions(),
    await ensureLmsInstructorRoleWithPermissions(),
    await ensureSupportStaffRoleWithPermissions(),
    await ensureExpenseSupervisorRoleWithPermissions(),
    await ensureExpenseBillingRoleWithPermissions(),
    await ensurePartnerRoleWithPermissions(),
  ];

  for (const roleId of roleIds) {
    await finalizeSystemPortalRole(roleId);
  }
}

/** Create any missing system portal role rows (idempotent). */
export async function ensureSystemPortalRolesIfMissing(): Promise<boolean> {
  const existing = await prisma.role.count({
    where: { name: { in: [...SYSTEM_PORTAL_ROLE_NAMES] } },
  });
  if (existing >= SYSTEM_PORTAL_ROLE_COUNT) return false;
  await ensureAllSystemPortalRoles();
  return true;
}
