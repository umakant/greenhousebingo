import "server-only";

import { prisma } from "@/lib/prisma";
import { LARAVEL_USER_MORPH_TYPE } from "@/lib/laravel-user-model-type";
import { EM_WORKFLOW_PERMISSIONS } from "@/lib/em-expense-workflow";

export const EXPENSE_BILLING_ROLE_NAME = "expense-billing";
const GUARD_NAME = "web";

export const EXPENSE_BILLING_PERMISSION_NAMES: readonly string[] = [
  "manage-dashboard",
  "manage-profile",
  "edit-profile",
  "change-password-profile",
  "manage-expense-management-dashboard",
  "manage-expense-reports",
  "manage-expense-entries",
  "manage-expense-receipts",
  "manage-expense-analytics",
  EM_WORKFLOW_PERMISSIONS.BILLING,
];

function titleizePermission(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function ensureExpenseBillingRoleWithPermissions(): Promise<bigint> {
  let role = await prisma.role.findFirst({
    where: { name: EXPENSE_BILLING_ROLE_NAME, guardName: GUARD_NAME },
    select: { id: true, label: true },
  });

  if (!role) {
    const maxRole = await prisma.role.aggregate({ _max: { id: true } });
    const newId = (maxRole._max.id ?? 0n) + 1n;
    role = await prisma.role.create({
      data: {
        id: newId,
        name: EXPENSE_BILLING_ROLE_NAME,
        label: "Expense Billing",
        guardName: GUARD_NAME,
        editable: false,
      },
      select: { id: true, label: true },
    });
  } else if (role.label !== "Expense Billing") {
    await prisma.role.update({ where: { id: role.id }, data: { label: "Expense Billing" } });
  }

  await syncRolePermissions(role.id, [...EXPENSE_BILLING_PERMISSION_NAMES]);
  return role.id;
}

async function syncRolePermissions(roleId: bigint, names: readonly string[]): Promise<void> {
  const maxPerm = await prisma.permission.aggregate({ _max: { id: true } });
  let nextPermId = (maxPerm._max.id ?? 0n) + 1n;
  const permissionIds: bigint[] = [];

  for (const name of names) {
    let perm = await prisma.permission.findFirst({
      where: { name, guardName: GUARD_NAME },
      select: { id: true },
    });
    if (!perm) {
      const isEm = name.includes("expense");
      perm = await prisma.permission.create({
        data: {
          id: nextPermId++,
          name,
          guardName: GUARD_NAME,
          addOn: isEm ? "ExpenseManagement" : "general",
          module: isEm ? "ExpenseManagement" : "general",
          label: titleizePermission(name),
        },
        select: { id: true },
      });
    }
    permissionIds.push(perm.id);
  }

  const existingLinks = await prisma.roleHasPermission.findMany({
    where: { roleId },
    select: { permissionId: true },
  });
  const allowed = new Set(permissionIds.map((id) => id.toString()));
  const toCreate = permissionIds
    .filter((id) => !existingLinks.some((l) => l.permissionId === id))
    .map((permissionId) => ({ roleId, permissionId }));

  if (toCreate.length) {
    await prisma.roleHasPermission.createMany({ data: toCreate, skipDuplicates: true });
  }

  const toRemove = existingLinks
    .filter((l) => !allowed.has(l.permissionId.toString()))
    .map((l) => l.permissionId);

  if (toRemove.length) {
    await prisma.roleHasPermission.deleteMany({
      where: { roleId, permissionId: { in: toRemove } },
    });
  }
}

export async function assignExpenseBillingRoleToUser(userId: bigint): Promise<void> {
  const roleId = await ensureExpenseBillingRoleWithPermissions();
  const existing = await prisma.modelHasRole.findFirst({
    where: { modelId: userId, modelType: LARAVEL_USER_MORPH_TYPE },
    select: { roleId: true },
  });

  if (!existing) {
    await prisma.modelHasRole.create({
      data: { roleId, modelId: userId, modelType: LARAVEL_USER_MORPH_TYPE },
    });
  } else if (existing.roleId !== roleId) {
    await prisma.modelHasRole.updateMany({
      where: { modelId: userId, modelType: LARAVEL_USER_MORPH_TYPE },
      data: { roleId },
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { type: "expense-billing", isEnableLogin: true, isActive: true },
  });
}
