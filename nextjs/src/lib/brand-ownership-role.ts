import "server-only";

import { prisma } from "@/lib/prisma";

const GUARD_NAME = "web";
export const MANAGE_BRAND_OWNERSHIP = "manage-brand-ownership";

export async function ensureManageBrandOwnershipPermission(): Promise<bigint> {
  const maxPerm = await prisma.permission.aggregate({ _max: { id: true } });
  let nextPermId = (maxPerm._max.id ?? 0n) + 1n;

  let perm = await prisma.permission.findFirst({
    where: { name: MANAGE_BRAND_OWNERSHIP, guardName: GUARD_NAME },
    select: { id: true },
  });

  if (!perm) {
    perm = await prisma.permission.create({
      data: {
        id: nextPermId,
        name: MANAGE_BRAND_OWNERSHIP,
        label: "Manage Brand Ownership",
        module: "Ownership",
        addOn: "general",
        guardName: GUARD_NAME,
        createdAt: new Date(),
      },
      select: { id: true },
    });
  }

  const superadminRole = await prisma.role.findFirst({
    where: { name: "superadmin", guardName: GUARD_NAME },
    select: { id: true },
  });
  if (superadminRole) {
    await prisma.roleHasPermission
      .createMany({
        data: [{ roleId: superadminRole.id, permissionId: perm.id }],
        skipDuplicates: true,
      })
      .catch(() => null);
  }

  return perm.id;
}
