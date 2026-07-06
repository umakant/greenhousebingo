import "server-only";

import { prisma } from "@/lib/prisma";
import { LARAVEL_USER_MORPH_TYPE } from "@/lib/laravel-user-model-type";

export const PARTNER_ROLE_NAME = "partner";
const GUARD_NAME = "web";

/**
 * Portal permissions for partnership accounts (users.type = partner).
 * Partners only see and manage their own referral / commission data (API-scoped by partner id).
 */
export const PARTNER_PERMISSION_NAMES: readonly string[] = [
  "access-partner-portal",
  "view-partner-dashboard",
  "manage-partner-referrals",
  "view-partner-commissions",
  "view-partner-payouts",
  "edit-partner-profile",
];

function titleizePermission(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Ensures the `partner` role exists with partner portal permissions only. */
export async function ensurePartnerRoleWithPermissions(): Promise<bigint> {
  let role = await prisma.role.findFirst({
    where: { name: PARTNER_ROLE_NAME, guardName: GUARD_NAME },
    select: { id: true, label: true },
  });

  if (!role) {
    const maxRole = await prisma.role.aggregate({ _max: { id: true } });
    const newId = (maxRole._max.id ?? 0n) + 1n;
    role = await prisma.role.create({
      data: {
        id: newId,
        name: PARTNER_ROLE_NAME,
        label: "Partner",
        guardName: GUARD_NAME,
        editable: false,
      },
      select: { id: true, label: true },
    });
  } else if (role.label !== "Partner") {
    await prisma.role.update({
      where: { id: role.id },
      data: { label: "Partner" },
    });
  }

  const maxPerm = await prisma.permission.aggregate({ _max: { id: true } });
  let nextPermId = (maxPerm._max.id ?? 0n) + 1n;
  const permissionIds: bigint[] = [];

  for (const name of PARTNER_PERMISSION_NAMES) {
    let perm = await prisma.permission.findFirst({
      where: { name, guardName: GUARD_NAME },
      select: { id: true },
    });
    if (!perm) {
      perm = await prisma.permission.create({
        data: {
          id: nextPermId++,
          name,
          guardName: GUARD_NAME,
          addOn: "Partnership",
          module: "Partnership",
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

/**
 * Ensures the superadmin-side `manage-partnerships` permission exists.
 * Superadmin already holds `*`, so this is only needed for menu/permission metadata.
 */
export async function ensureManagePartnershipsPermission(): Promise<bigint> {
  let perm = await prisma.permission.findFirst({
    where: { name: "manage-partnerships", guardName: GUARD_NAME },
    select: { id: true },
  });
  if (!perm) {
    const maxPerm = await prisma.permission.aggregate({ _max: { id: true } });
    const newId = (maxPerm._max.id ?? 0n) + 1n;
    perm = await prisma.permission.create({
      data: {
        id: newId,
        name: "manage-partnerships",
        guardName: GUARD_NAME,
        addOn: "Partnership",
        module: "Partnership",
        label: "Manage Partnerships",
      },
      select: { id: true },
    });
  }
  return perm.id;
}

/** Assign the partner portal role to a user (creates model_has_roles row if missing). */
export async function assignPartnerRoleToUser(userId: bigint): Promise<void> {
  const roleId = await ensurePartnerRoleWithPermissions();

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
      type: PARTNER_ROLE_NAME,
      isEnableLogin: true,
      isActive: true,
    },
  });
}
