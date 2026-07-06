import "server-only";

import { prisma } from "@/lib/prisma";
import { LARAVEL_USER_MORPH_TYPE } from "@/lib/laravel-user-model-type";

/** RBAC role name for employee portal users (users.type = staff). */
export const EMPLOYEE_STAFF_ROLE_NAME = "staff";
const GUARD_NAME = "web";

/**
 * Operational expense management for HRM employee portal logins.
 * Excludes `manage-expense-management` (system setup / admin configuration).
 */
export const EMPLOYEE_EXPENSE_PERMISSION_NAMES: readonly string[] = [
  "manage-expense-management-dashboard",
  "manage-expense-reports",
  "manage-expense-entries",
  "manage-expense-receipts",
  "manage-expense-analytics",
];

/** Employee self-service routing (My Routes dashboard). */
export const EMPLOYEE_ROUTING_PERMISSION_NAMES: readonly string[] = [
  "manage-routing-my-routes",
];

/** Employee LMS learner access (course catalog + my learning). */
export const EMPLOYEE_LMS_PERMISSION_NAMES: readonly string[] = [
  "view-lms-student-dashboard",
  "manage-lms-student-dashboard",
];

/**
 * Portal permissions for HRM employees (users.type = staff).
 * Focused on launchpad/dashboard, profile, expense self-service, routing, and LMS learning — not full HRM admin.
 */
export const EMPLOYEE_PORTAL_PERMISSION_NAMES: readonly string[] = [
  "manage-dashboard",
  "manage-profile",
  "edit-profile",
  "change-password-profile",
  ...EMPLOYEE_EXPENSE_PERMISSION_NAMES,
  ...EMPLOYEE_ROUTING_PERMISSION_NAMES,
  ...EMPLOYEE_LMS_PERMISSION_NAMES,
];

function titleizePermission(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Ensures the staff (Employee) role exists with employee portal permissions only. */
export async function ensureStaffRoleWithModulePermissions(): Promise<bigint> {
  let role = await prisma.role.findFirst({
    where: { name: EMPLOYEE_STAFF_ROLE_NAME, guardName: GUARD_NAME },
    select: { id: true, label: true },
  });

  if (!role) {
    const maxRole = await prisma.role.aggregate({ _max: { id: true } });
    const newId = (maxRole._max.id ?? 0n) + 1n;
    role = await prisma.role.create({
      data: {
        id: newId,
        name: EMPLOYEE_STAFF_ROLE_NAME,
        label: "Employee",
        guardName: GUARD_NAME,
        editable: false,
      },
      select: { id: true, label: true },
    });
  } else if (role.label !== "Employee") {
    await prisma.role.update({
      where: { id: role.id },
      data: { label: "Employee", editable: true },
    });
  }

  const maxPerm = await prisma.permission.aggregate({ _max: { id: true } });
  let nextPermId = (maxPerm._max.id ?? 0n) + 1n;
  const permissionIds: bigint[] = [];

  for (const name of EMPLOYEE_PORTAL_PERMISSION_NAMES) {
    let perm = await prisma.permission.findFirst({
      where: { name, guardName: GUARD_NAME },
      select: { id: true },
    });
    if (!perm) {
      const isExpense = (EMPLOYEE_EXPENSE_PERMISSION_NAMES as readonly string[]).includes(name);
      const isRouting = (EMPLOYEE_ROUTING_PERMISSION_NAMES as readonly string[]).includes(name);
      const isLms = (EMPLOYEE_LMS_PERMISSION_NAMES as readonly string[]).includes(name);
      perm = await prisma.permission.create({
        data: {
          id: nextPermId++,
          name,
          guardName: GUARD_NAME,
          addOn: isExpense ? "ExpenseManagement" : isRouting ? "Routing" : isLms ? "Lms" : "general",
          module: isExpense ? "ExpenseManagement" : isRouting ? "Routing" : isLms ? "Lms" : "general",
          label: titleizePermission(name),
        },
        select: { id: true },
      });
    }
    permissionIds.push(perm.id);
  }

  const existingLinks = await prisma.roleHasPermission.findMany({
    where: { roleId: role.id },
    select: { permissionId: true },
  });
  const linked = new Set(existingLinks.map((l) => l.permissionId.toString()));
  const allowed = new Set(permissionIds.map((id) => id.toString()));

  const toCreate = permissionIds
    .filter((pid) => !linked.has(pid.toString()))
    .map((permissionId) => ({ roleId: role!.id, permissionId }));

  if (toCreate.length > 0) {
    await prisma.roleHasPermission.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
  }

  const toRemove = existingLinks
    .filter((l) => !allowed.has(l.permissionId.toString()))
    .map((l) => l.permissionId);

  if (toRemove.length > 0) {
    await prisma.roleHasPermission.deleteMany({
      where: { roleId: role.id, permissionId: { in: toRemove } },
    });
  }

  return role.id;
}

/** Login home for employee portal users when expense or routing add-ons are enabled. */
export function resolveEmployeePortalLoginHome(
  activatedPackages: string[],
  permissions: string[],
): string {
  const hasExpenseAddon = activatedPackages.some((p) => p.toLowerCase() === "expensemanagement");
  const hasRoutingAddon = activatedPackages.some((p) => p.toLowerCase() === "routing");
  const hasLmsAddon = activatedPackages.some((p) => p.toLowerCase() === "lms");
  const canUseExpense =
    hasExpenseAddon &&
    (permissions.includes("*") ||
      EMPLOYEE_EXPENSE_PERMISSION_NAMES.some((p) => permissions.includes(p)));
  const canUseRouting =
    hasRoutingAddon &&
    (permissions.includes("*") ||
      EMPLOYEE_ROUTING_PERMISSION_NAMES.some((p) => permissions.includes(p)));
  const canUseLms =
    hasLmsAddon &&
    (permissions.includes("*") ||
      EMPLOYEE_LMS_PERMISSION_NAMES.some((p) => permissions.includes(p)));

  if (canUseExpense) return "/expense-management";
  if (canUseRouting) return "/projects/my-routes";
  if (canUseLms) return "/lms/my-learning";
  return "/launchpad";
}

/** Assign the employee (staff) role and enable login for a portal user. */
export async function assignStaffRoleToUser(userId: bigint): Promise<void> {
  const roleId = await ensureStaffRoleWithModulePermissions();

  const existing = await prisma.modelHasRole.findFirst({
    where: {
      modelId: userId,
      modelType: LARAVEL_USER_MORPH_TYPE,
    },
    select: { roleId: true },
  });

  if (!existing) {
    await prisma.modelHasRole.create({
      data: {
        roleId,
        modelId: userId,
        modelType: LARAVEL_USER_MORPH_TYPE,
      },
    });
  } else if (existing.roleId !== roleId) {
    await prisma.modelHasRole.updateMany({
      where: {
        modelId: userId,
        modelType: LARAVEL_USER_MORPH_TYPE,
      },
      data: { roleId },
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      type: "staff",
      isEnableLogin: true,
      isActive: true,
    },
  });
}

/** Re-sync employee portal role for all staff logins under a company. */
export async function syncEmployeePortalRolesForCompany(companyId: bigint): Promise<number> {
  await ensureStaffRoleWithModulePermissions();

  const [employees, staffUsers] = await Promise.all([
    prisma.hrmEmployee.findMany({
      where: { createdBy: companyId, userId: { not: null } },
      select: { userId: true },
    }),
    prisma.user.findMany({
      where: { type: "staff", createdBy: companyId },
      select: { id: true },
    }),
  ]);

  const userIds = new Set<bigint>();
  for (const e of employees) {
    if (e.userId) userIds.add(e.userId);
  }
  for (const u of staffUsers) {
    userIds.add(u.id);
  }

  for (const userId of userIds) {
    await assignStaffRoleToUser(userId);
  }

  return userIds.size;
}
