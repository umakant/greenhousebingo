import "server-only";

import { prisma } from "@/lib/prisma";
import { getActivatedPackagesForUser } from "@/lib/addons-server";
import { getPlanPermissionsForUser } from "@/lib/plan-modules";
import { warmPermissionMap } from "@/lib/permission-map";
import { getVendorPermissionKeysForUser } from "@/lib/marketplace-vendor-portal-permissions";

const PORTAL_USER_TYPES = new Set([
  "staff",
  "client",
  "vendor",
  "marketplace_vendor",
  "lms-student",
  "lms-instructor",
  "support-staff",
  "expense-supervisor",
  "expense-billing",
  "partner",
]);

export function isPortalUserType(userType: string | null | undefined): boolean {
  return PORTAL_USER_TYPES.has((userType ?? "").trim().toLowerCase());
}

export async function getRolePermissionsForUser(userId: bigint): Promise<{
  names: string[];
  ids: bigint[];
  roles: string[];
  userType: string | null;
}> {
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { type: true },
  });

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
  if (roles.length === 0 && user?.type) roles.push(user.type);

  let names: string[] = [];
  let ids: bigint[] = [];
  if (roleIds.length) {
    const permLinks = await prisma.roleHasPermission.findMany({
      where: { roleId: { in: roleIds } },
      select: { permissionId: true },
    });
    const permIds = Array.from(new Set(permLinks.map((p) => p.permissionId)));
    if (permIds.length) {
      const permRows = await prisma.permission.findMany({
        where: { id: { in: permIds } },
        select: { id: true, name: true },
      });
      names = Array.from(new Set(permRows.map((p) => p.name).filter(Boolean)));
      ids = permRows.map((p) => p.id);
    }
  }

  return { names, ids, roles, userType: user?.type ?? null };
}

/**
 * Portal users (client / staff / vendor) receive role permissions only — not the parent
 * company's full plan permission set (which would expose HRM, LMS, System Setup, etc.).
 */
export async function getEffectivePermissionNamesForUser(userId: bigint): Promise<string[]> {
  const { names, userType } = await getRolePermissionsForUser(userId);
  if ((userType ?? "").toLowerCase() === "marketplace_vendor") {
    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: { marketplaceVendorId: true },
    });
    const vendorPerms =
      user?.marketplaceVendorId != null
        ? await getVendorPermissionKeysForUser(user.marketplaceVendorId, userId)
        : [];
    const merged = [...names];
    for (const p of vendorPerms) {
      if (!merged.includes(p)) merged.push(p);
    }
    return merged;
  }
  if (isPortalUserType(userType)) {
    return names;
  }
  const planPerms = await getPlanPermissionsForUser(userId);
  const out = [...names];
  for (const p of planPerms) {
    if (!out.includes(p)) out.push(p);
  }
  return out;
}

async function permissionNamesToCookieValue(permissionNames: string[]): Promise<string> {
  if (permissionNames.length === 0) return JSON.stringify([]);

  const permRows = await prisma.permission.findMany({
    where: { name: { in: permissionNames } },
    select: { id: true },
  });
  const compact = permRows.map((r) => r.id.toString()).join(",");
  const namesJson = JSON.stringify(permissionNames);
  const pick = (s: string) => Buffer.byteLength(s, "utf8");
  if (compact && pick(compact) <= 3500) return compact;
  if (pick(namesJson) <= 3500) return namesJson;
  return namesJson;
}

/** Cookie value for pf_permissions (compact IDs when possible). */
export async function buildPermissionsCookieValueForUser(userId: bigint): Promise<string> {
  const { roles, userType } = await getRolePermissionsForUser(userId);
  if (roles.includes("superadmin")) return '["*"]';

  const permissionNames = await getEffectivePermissionNamesForUser(userId);

  if (!isPortalUserType(userType)) {
    const { ids } = await getRolePermissionsForUser(userId);
    const rolePermIdSet = new Set(ids);
    const planPermNames = await getPlanPermissionsForUser(userId);
    const allPermIdSet = new Set(rolePermIdSet);
    if (planPermNames.length > 0) {
      const planPermRows = await prisma.permission.findMany({
        where: { name: { in: planPermNames } },
        select: { id: true },
      });
      planPermRows.forEach((r) => allPermIdSet.add(r.id));
    }

    await warmPermissionMap(() => prisma.permission.findMany({ select: { id: true, name: true } }));

    const allIdsCompact = Array.from(allPermIdSet)
      .map((id) => id.toString())
      .join(",");
    const namesJson = JSON.stringify(permissionNames.length ? permissionNames : []);
    const pick = (s: string) => Buffer.byteLength(s, "utf8");
    if (allIdsCompact && pick(allIdsCompact) <= 3500) return allIdsCompact;
    return namesJson;
  }

  return permissionNamesToCookieValue(permissionNames);
}

/** Portal users only see Expense Management in the sidebar (not the whole company plan). */
export async function getEffectiveActivatedPackagesForUser(
  userId: bigint,
  isSuperadmin: boolean,
): Promise<string[]> {
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { type: true },
  });
  const type = (user?.type ?? "").toLowerCase().trim();
  if (isPortalUserType(type)) {
    const all = await getActivatedPackagesForUser(userId, false);
    if (type === "marketplace_vendor") {
      return all.filter((p) => p.toLowerCase() === "marketplace");
    }
    const addon =
      type === "lms-student" || type === "lms-instructor"
        ? "lms"
        : type === "support-staff"
          ? "supportticket"
          : "expensemanagement";
    return all.filter((p) => p.toLowerCase() === addon);
  }
  return getActivatedPackagesForUser(userId, isSuperadmin);
}

export async function resolveSessionAuthz(userId: bigint): Promise<{
  roles: string[];
  primaryRole: string;
  permissionNames: string[];
  permissionsCookieValue: string;
  activatedPackages: string[];
  isSuperadmin: boolean;
  userType: string | null;
}> {
  const { roles, userType } = await getRolePermissionsForUser(userId);
  const isSuperadmin = roles.includes("superadmin");

  if (isSuperadmin) {
    return {
      roles,
      primaryRole: "superadmin",
      permissionNames: ["*"],
      permissionsCookieValue: '["*"]',
      activatedPackages: await getActivatedPackagesForUser(userId, true),
      isSuperadmin: true,
      userType,
    };
  }

  const permissionNames = await getEffectivePermissionNamesForUser(userId);
  const permissionsCookieValue = await buildPermissionsCookieValueForUser(userId);
  const activatedPackages = await getEffectiveActivatedPackagesForUser(userId, false);
  const primaryRole = roles[0] ?? userType ?? "user";

  return {
    roles,
    primaryRole,
    permissionNames,
    permissionsCookieValue,
    activatedPackages,
    isSuperadmin: false,
    userType,
  };
}
