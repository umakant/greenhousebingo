import "server-only";

import { prisma } from "@/lib/prisma";
import { LARAVEL_USER_MORPH_TYPE } from "@/lib/laravel-user-model-type";

export const LMS_INSTRUCTOR_ROLE_NAME = "lms-instructor";
const GUARD_NAME = "web";

/** LMS instructor portal — assigned courses and profile, not tenant LMS admin. */
export const LMS_INSTRUCTOR_PORTAL_PERMISSION_NAMES: readonly string[] = [
  "manage-dashboard",
  "manage-profile",
  "edit-profile",
  "change-password-profile",
  "manage-lms-instructor-dashboard",
  "manage-lms-instructor-profile",
  "view-lms-instructor-assignments",
  "manage-lms-instructor-courses",
];

function titleizePermission(name: string): string {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function ensureLmsInstructorRoleWithPermissions(): Promise<bigint> {
  let role = await prisma.role.findFirst({
    where: { name: LMS_INSTRUCTOR_ROLE_NAME, guardName: GUARD_NAME },
    select: { id: true, label: true },
  });

  if (!role) {
    const maxRole = await prisma.role.aggregate({ _max: { id: true } });
    const newId = (maxRole._max.id ?? 0n) + 1n;
    role = await prisma.role.create({
      data: {
        id: newId,
        name: LMS_INSTRUCTOR_ROLE_NAME,
        label: "LMS Instructor",
        guardName: GUARD_NAME,
        editable: false,
      },
      select: { id: true, label: true },
    });
  } else if (role.label !== "LMS Instructor") {
    await prisma.role.update({
      where: { id: role.id },
      data: { label: "LMS Instructor" },
    });
  }

  const maxPerm = await prisma.permission.aggregate({ _max: { id: true } });
  let nextPermId = (maxPerm._max.id ?? 0n) + 1n;
  const permissionIds: bigint[] = [];

  for (const name of LMS_INSTRUCTOR_PORTAL_PERMISSION_NAMES) {
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
          addOn: "Lms",
          module: "Lms",
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
  const allowed = new Set(permissionIds.map((id) => id.toString()));
  const toCreate = permissionIds
    .filter((id) => !existingLinks.some((l) => l.permissionId === id))
    .map((permissionId) => ({ roleId: role.id, permissionId }));

  if (toCreate.length > 0) {
    await prisma.roleHasPermission.createMany({ data: toCreate, skipDuplicates: true });
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

export async function assignLmsInstructorRoleToUser(userId: bigint): Promise<void> {
  const roleId = await ensureLmsInstructorRoleWithPermissions();

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
    data: { type: "lms-instructor", isEnableLogin: true, isActive: true },
  });
}
