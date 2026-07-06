import "server-only";

import { prisma } from "@/lib/prisma";
import { LARAVEL_USER_MORPH_TYPE } from "@/lib/laravel-user-model-type";

export const CUSTOMER_CLIENT_ROLE_NAME = "client";
const GUARD_NAME = "web";

/**
 * Operational expense management for customer portal logins.
 * Excludes `manage-expense-management` (org-wide admin / system setup).
 */
export const CUSTOMER_EXPENSE_PERMISSION_NAMES: readonly string[] = [
  "manage-expense-management-dashboard",
  "manage-expense-reports",
  "manage-expense-entries",
  "manage-expense-receipts",
  "manage-expense-analytics",
];

/**
 * Portal permissions for accounting customers (users.type = client).
 * Customers only see and manage their own expense records (API-scoped by user id).
 */
export const CUSTOMER_PORTAL_PERMISSION_NAMES: readonly string[] = [
  "manage-dashboard",
  "manage-profile",
  "edit-profile",
  "change-password-profile",
  ...CUSTOMER_EXPENSE_PERMISSION_NAMES,
];

function titleizePermission(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Ensures the `client` role exists with customer portal permissions only. */
export async function ensureCustomerClientRoleWithPermissions(): Promise<bigint> {
  let role = await prisma.role.findFirst({
    where: { name: CUSTOMER_CLIENT_ROLE_NAME, guardName: GUARD_NAME },
    select: { id: true, label: true },
  });

  if (!role) {
    const maxRole = await prisma.role.aggregate({ _max: { id: true } });
    const newId = (maxRole._max.id ?? 0n) + 1n;
    role = await prisma.role.create({
      data: {
        id: newId,
        name: CUSTOMER_CLIENT_ROLE_NAME,
        label: "Customer",
        guardName: GUARD_NAME,
        editable: false,
      },
      select: { id: true, label: true },
    });
  } else if (role.label !== "Customer") {
    await prisma.role.update({
      where: { id: role.id },
      data: { label: "Customer" },
    });
  }

  const maxPerm = await prisma.permission.aggregate({ _max: { id: true } });
  let nextPermId = (maxPerm._max.id ?? 0n) + 1n;
  const permissionIds: bigint[] = [];

  for (const name of CUSTOMER_PORTAL_PERMISSION_NAMES) {
    let perm = await prisma.permission.findFirst({
      where: { name, guardName: GUARD_NAME },
      select: { id: true },
    });
    if (!perm) {
      const isExpense = (CUSTOMER_EXPENSE_PERMISSION_NAMES as readonly string[]).includes(name);
      perm = await prisma.permission.create({
        data: {
          id: nextPermId++,
          name,
          guardName: GUARD_NAME,
          addOn: isExpense ? "ExpenseManagement" : "general",
          module: isExpense ? "ExpenseManagement" : "general",
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

/** Assign the customer portal role to a user (creates model_has_roles row if missing). */
export async function assignCustomerClientRoleToUser(userId: bigint): Promise<void> {
  const roleId = await ensureCustomerClientRoleWithPermissions();

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
      type: "client",
      isEnableLogin: true,
      isActive: true,
    },
  });
}

/** Re-assign portal role for every customer login under a company. */
export async function syncCustomerPortalRolesForCompany(companyId: bigint): Promise<number> {
  await ensureCustomerClientRoleWithPermissions();

  const customers = await prisma.customer.findMany({
    where: { createdBy: companyId, userId: { not: null } },
    select: { userId: true },
  });

  const userIds = new Set<bigint>();
  for (const c of customers) {
    if (c.userId) userIds.add(c.userId);
  }
  const clientUsers = await prisma.user.findMany({
    where: { type: "client", createdBy: companyId },
    select: { id: true },
  });
  for (const u of clientUsers) {
    userIds.add(u.id);
  }

  for (const userId of userIds) {
    await assignCustomerClientRoleToUser(userId);
  }

  return userIds.size;
}
