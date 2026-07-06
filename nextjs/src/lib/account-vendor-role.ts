import "server-only";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { LARAVEL_USER_MORPH_TYPE } from "@/lib/laravel-user-model-type";

/** RBAC role name for vendor portal users (users.type = vendor). */
export const VENDOR_PORTAL_ROLE_NAME = "vendor";
const GUARD_NAME = "web";

/**
 * Operational expense management for vendor portal logins.
 * Excludes `manage-expense-management` (org-wide admin / system setup).
 */
export const VENDOR_EXPENSE_PERMISSION_NAMES: readonly string[] = [
  "manage-expense-management-dashboard",
  "manage-expense-reports",
  "manage-expense-entries",
  "manage-expense-receipts",
  "manage-expense-analytics",
];

/**
 * Portal permissions for accounting vendors (users.type = vendor).
 * Vendors manage their own expense records (API-scoped by user id).
 */
export const VENDOR_PORTAL_PERMISSION_NAMES: readonly string[] = [
  "manage-dashboard",
  "manage-profile",
  "edit-profile",
  "change-password-profile",
  ...VENDOR_EXPENSE_PERMISSION_NAMES,
];

function titleizePermission(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Ensures the `vendor` role exists with vendor portal permissions only. */
export async function ensureVendorRoleWithPermissions(): Promise<bigint> {
  let role = await prisma.role.findFirst({
    where: { name: VENDOR_PORTAL_ROLE_NAME, guardName: GUARD_NAME },
    select: { id: true, label: true },
  });

  if (!role) {
    const maxRole = await prisma.role.aggregate({ _max: { id: true } });
    const newId = (maxRole._max.id ?? 0n) + 1n;
    role = await prisma.role.create({
      data: {
        id: newId,
        name: VENDOR_PORTAL_ROLE_NAME,
        label: "Vendor",
        guardName: GUARD_NAME,
        editable: false,
      },
      select: { id: true, label: true },
    });
  } else if (role.label !== "Vendor") {
    await prisma.role.update({
      where: { id: role.id },
      data: { label: "Vendor" },
    });
  }

  const maxPerm = await prisma.permission.aggregate({ _max: { id: true } });
  let nextPermId = (maxPerm._max.id ?? 0n) + 1n;
  const permissionIds: bigint[] = [];

  for (const name of VENDOR_PORTAL_PERMISSION_NAMES) {
    let perm = await prisma.permission.findFirst({
      where: { name, guardName: GUARD_NAME },
      select: { id: true },
    });
    if (!perm) {
      const isExpense = (VENDOR_EXPENSE_PERMISSION_NAMES as readonly string[]).includes(name);
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

/** Assign the vendor portal role to a user (creates model_has_roles row if missing). */
export async function assignVendorRoleToUser(userId: bigint): Promise<void> {
  const roleId = await ensureVendorRoleWithPermissions();

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
      type: "vendor",
      isEnableLogin: true,
      isActive: true,
    },
  });
}

export type EnsureVendorPortalUserResult = {
  userId: bigint | null;
  created: boolean;
  plainPassword: string | null;
  error?: string;
};

/** Create or refresh a vendor portal login for a vendor row (matched by email under the company). */
export async function ensureVendorPortalUserForVendor(
  vendor: { name: string; email: string | null },
  companyId: bigint,
): Promise<EnsureVendorPortalUserResult> {
  const email = (vendor.email ?? "").trim().toLowerCase();
  if (!email) {
    return { userId: null, created: false, plainPassword: null, error: "Vendor has no email." };
  }

  const existingInOrg = await prisma.user.findFirst({
    where: { email, createdBy: companyId },
    select: { id: true },
  });

  if (existingInOrg) {
    await assignVendorRoleToUser(existingInOrg.id);
    return { userId: existingInOrg.id, created: false, plainPassword: null };
  }

  const takenElsewhere = await prisma.user.findFirst({
    where: { email },
    select: { id: true },
  });
  if (takenElsewhere) {
    return {
      userId: null,
      created: false,
      plainPassword: null,
      error: `Email ${email} is already used by another account.`,
    };
  }

  const plainPassword = crypto.randomBytes(6).toString("base64url").slice(0, 10);
  const hashed = await bcrypt.hash(plainPassword, 10);
  const maxUser = await prisma.user.aggregate({ _max: { id: true } });
  const newId = (maxUser._max.id ?? 0n) + 1n;

  await prisma.user.create({
    data: {
      id: newId,
      name: vendor.name.trim() || email,
      email,
      password: hashed,
      type: "vendor",
      isActive: true,
      isEnableLogin: true,
      createdBy: companyId,
      emailVerifiedAt: new Date(),
    },
  });

  await assignVendorRoleToUser(newId);

  return { userId: newId, created: true, plainPassword };
}

/**
 * Ensures every vendor with an email has a portal user + vendor role.
 * Returns count of vendors that now have a linkable login.
 */
export async function syncVendorPortalAccessForCompany(companyId: bigint): Promise<{
  linked: number;
  created: number;
  skipped: number;
}> {
  await ensureVendorRoleWithPermissions();

  const vendors = await prisma.vendor.findMany({
    where: { createdBy: companyId },
    select: { name: true, email: true },
  });

  let linked = 0;
  let created = 0;
  let skipped = 0;

  for (const v of vendors) {
    const result = await ensureVendorPortalUserForVendor(v, companyId);
    if (result.userId) {
      linked++;
      if (result.created) created++;
    } else {
      skipped++;
    }
  }

  await syncVendorPortalRolesForCompany(companyId);

  return { linked, created, skipped };
}

/** Re-assign portal role for every vendor login under a company. */
export async function syncVendorPortalRolesForCompany(companyId: bigint): Promise<number> {
  await ensureVendorRoleWithPermissions();

  const vendorUsers = await prisma.user.findMany({
    where: { type: "vendor", createdBy: companyId },
    select: { id: true },
  });

  for (const u of vendorUsers) {
    await assignVendorRoleToUser(u.id);
  }

  return vendorUsers.length;
}
