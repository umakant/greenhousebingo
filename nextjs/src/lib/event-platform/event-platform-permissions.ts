import "server-only";

import { prisma } from "@/lib/prisma";
import {
  EVENT_PLATFORM_COMPANY_DEFAULT_PERMISSIONS,
  EVENT_PLATFORM_PERMISSION_LABELS,
  EVENT_PLATFORM_PERMISSION_NAMES,
} from "@/lib/event-platform/permissions";

const GUARD_NAME = "web";
const ADD_ON = "Lms";
const MODULE = "EventPlatform";

/**
 * Upserts Event Platform permissions (add_on = Lms, module = EventPlatform).
 * Idempotent; safe on every server start.
 */
export async function ensureEventPlatformPermissions(): Promise<void> {
  const existing = await prisma.permission.findMany({
    where: { module: MODULE },
    select: { name: true },
  });
  const existingByName = new Set(existing.map((p) => p.name));

  const maxPerm = await prisma.permission.aggregate({ _max: { id: true } });
  let nextPermId = (maxPerm._max.id ?? 0n) + 1n;

  for (const name of EVENT_PLATFORM_PERMISSION_NAMES) {
    const label = EVENT_PLATFORM_PERMISSION_LABELS[name];
    if (existingByName.has(name)) {
      await prisma.permission
        .updateMany({
          where: { name, guardName: GUARD_NAME },
          data: { addOn: ADD_ON, module: MODULE, label },
        })
        .catch(() => null);
      continue;
    }
    await prisma.permission
      .upsert({
        where: { name_guardName: { name, guardName: GUARD_NAME } },
        update: { addOn: ADD_ON, module: MODULE, label },
        create: {
          id: nextPermId++,
          name,
          label,
          module: MODULE,
          addOn: ADD_ON,
          guardName: GUARD_NAME,
          createdAt: new Date(),
        },
      })
      .catch(() => null);
  }

  const companyPerms = await prisma.permission.findMany({
    where: {
      module: MODULE,
      name: { in: [...EVENT_PLATFORM_COMPANY_DEFAULT_PERMISSIONS] },
    },
    select: { id: true },
  });
  if (companyPerms.length === 0) return;

  const targetRoles = await prisma.role.findMany({
    where: { name: { in: ["company", "staff"] } },
    select: { id: true },
  });
  const rows: { roleId: bigint; permissionId: bigint }[] = [];
  for (const role of targetRoles) {
    for (const perm of companyPerms) {
      rows.push({ roleId: role.id, permissionId: perm.id });
    }
  }
  if (rows.length > 0) {
    await prisma.roleHasPermission.createMany({ data: rows, skipDuplicates: true }).catch(() => null);
  }
}

export async function ensureEventPlatformSetup(): Promise<void> {
  await ensureEventPlatformPermissions();
}
