import "server-only";

import { prisma } from "@/lib/prisma";

export const MARKETPLACE_VENDOR_PORTAL_ROLE_NAME = "marketplace_vendor";
export const MARKETPLACE_VENDOR_USER_TYPE = "marketplace_vendor";

export const VENDOR_STAFF_ROLES = ["vendor_admin", "vendor_manager", "vendor_staff"] as const;
export type VendorStaffRole = (typeof VENDOR_STAFF_ROLES)[number];

export const MARKETPLACE_VENDOR_PERMISSION_KEYS = [
  "marketplace.vendor_portal.dashboard.view",
  "marketplace.vendor_portal.products.view",
  "marketplace.vendor_portal.products.create",
  "marketplace.vendor_portal.products.edit",
  "marketplace.vendor_portal.products.delete",
  "marketplace.vendor_portal.orders.view",
  "marketplace.vendor_portal.orders.update_status",
  "marketplace.vendor_portal.delivery_queue.view",
  "marketplace.vendor_portal.delivery.assign",
  "marketplace.vendor_portal.reports.view",
  "marketplace.vendor_portal.customers.view",
  "marketplace.vendor_portal.profile.manage",
  "marketplace.vendor_portal.staff.manage",
] as const;

export type MarketplaceVendorPermissionKey = (typeof MARKETPLACE_VENDOR_PERMISSION_KEYS)[number];

export const VENDOR_PERMISSION_LABELS: Record<MarketplaceVendorPermissionKey, string> = {
  "marketplace.vendor_portal.dashboard.view": "View dashboard",
  "marketplace.vendor_portal.products.view": "View products",
  "marketplace.vendor_portal.products.create": "Add products",
  "marketplace.vendor_portal.products.edit": "Edit products",
  "marketplace.vendor_portal.products.delete": "Delete products",
  "marketplace.vendor_portal.orders.view": "View orders",
  "marketplace.vendor_portal.orders.update_status": "Update order status",
  "marketplace.vendor_portal.delivery_queue.view": "View delivery queue",
  "marketplace.vendor_portal.delivery.assign": "Assign delivery",
  "marketplace.vendor_portal.reports.view": "View reports",
  "marketplace.vendor_portal.customers.view": "View customers",
  "marketplace.vendor_portal.profile.manage": "Manage vendor profile",
  "marketplace.vendor_portal.staff.manage": "Manage vendor staff",
};

const GUARD_NAME = "web";

export const VENDOR_ROLE_PRESETS: Record<VendorStaffRole, MarketplaceVendorPermissionKey[]> = {
  vendor_admin: [...MARKETPLACE_VENDOR_PERMISSION_KEYS],
  vendor_manager: [
    "marketplace.vendor_portal.dashboard.view",
    "marketplace.vendor_portal.products.view",
    "marketplace.vendor_portal.products.create",
    "marketplace.vendor_portal.products.edit",
    "marketplace.vendor_portal.products.delete",
    "marketplace.vendor_portal.orders.view",
    "marketplace.vendor_portal.orders.update_status",
    "marketplace.vendor_portal.delivery_queue.view",
    "marketplace.vendor_portal.delivery.assign",
    "marketplace.vendor_portal.reports.view",
    "marketplace.vendor_portal.customers.view",
    "marketplace.vendor_portal.profile.manage",
  ],
  vendor_staff: [
    "marketplace.vendor_portal.dashboard.view",
    "marketplace.vendor_portal.orders.view",
    "marketplace.vendor_portal.orders.update_status",
    "marketplace.vendor_portal.delivery_queue.view",
    "marketplace.vendor_portal.profile.manage",
  ],
};

export function presetPermissionsForRole(role: VendorStaffRole): MarketplaceVendorPermissionKey[] {
  return [...VENDOR_ROLE_PRESETS[role]];
}

export function permissionsRecordFromKeys(keys: string[]): Record<string, boolean> {
  const set = new Set(keys);
  return Object.fromEntries(MARKETPLACE_VENDOR_PERMISSION_KEYS.map((k) => [k, set.has(k)]));
}

export function enabledKeysFromRecord(record: Record<string, boolean>): MarketplaceVendorPermissionKey[] {
  return MARKETPLACE_VENDOR_PERMISSION_KEYS.filter((k) => record[k]);
}

/** Upsert RBAC permission rows for marketplace vendor portal keys. */
export async function ensureMarketplaceVendorPortalPermissions(): Promise<void> {
  const maxPerm = await prisma.permission.aggregate({ _max: { id: true } });
  let nextPermId = (maxPerm._max.id ?? 0n) + 1n;

  for (const name of MARKETPLACE_VENDOR_PERMISSION_KEYS) {
    const existing = await prisma.permission.findFirst({
      where: { name, guardName: GUARD_NAME },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.permission.create({
      data: {
        id: nextPermId++,
        name,
        label: VENDOR_PERMISSION_LABELS[name],
        module: "Marketplace",
        addOn: "Marketplace",
        guardName: GUARD_NAME,
        createdAt: new Date(),
      },
    });
  }

  let role = await prisma.role.findFirst({
    where: { name: MARKETPLACE_VENDOR_PORTAL_ROLE_NAME, guardName: GUARD_NAME },
    select: { id: true },
  });
  if (!role) {
    const maxRole = await prisma.role.aggregate({ _max: { id: true } });
    role = await prisma.role.create({
      data: {
        id: (maxRole._max.id ?? 0n) + 1n,
        name: MARKETPLACE_VENDOR_PORTAL_ROLE_NAME,
        label: "Marketplace Vendor",
        guardName: GUARD_NAME,
        editable: false,
      },
      select: { id: true },
    });
  }

  const permRows = await prisma.permission.findMany({
    where: { name: { in: [...MARKETPLACE_VENDOR_PERMISSION_KEYS] } },
    select: { id: true },
  });
  const links = permRows.map((p) => ({ roleId: role!.id, permissionId: p.id }));
  if (links.length) {
    await prisma.roleHasPermission.createMany({ data: links, skipDuplicates: true });
  }
}

export async function getVendorPermissionKeysForUser(
  vendorId: bigint,
  userId: bigint,
): Promise<string[]> {
  const rows = await prisma.marketplaceVendorPermission.findMany({
    where: {
      vendorId,
      OR: [{ userId }, { userId: null }],
    },
    select: { permissionKey: true, enabled: true, userId: true },
  });

  const byKey = new Map<string, boolean>();
  for (const row of rows.filter((r) => r.userId == null)) {
    byKey.set(row.permissionKey, row.enabled);
  }
  for (const row of rows.filter((r) => r.userId != null)) {
    byKey.set(row.permissionKey, row.enabled);
  }

  return MARKETPLACE_VENDOR_PERMISSION_KEYS.filter((k) => byKey.get(k));
}

export async function saveVendorPermissionsForUser(
  vendorId: bigint,
  userId: bigint,
  enabledKeys: string[],
): Promise<void> {
  const enabled = new Set(enabledKeys);
  await prisma.marketplaceVendorPermission.deleteMany({
    where: { vendorId, userId },
  });
  const data = MARKETPLACE_VENDOR_PERMISSION_KEYS.map((permissionKey) => ({
    vendorId,
    userId,
    permissionKey,
    enabled: enabled.has(permissionKey),
  })).filter((r) => r.enabled);

  if (data.length) {
    await prisma.marketplaceVendorPermission.createMany({ data });
  }
}

export async function loadVendorLoginAccess(vendorId: bigint): Promise<{
  enabled: boolean;
  loginEmail: string | null;
  vendorRole: VendorStaffRole;
  permissions: Record<string, boolean>;
  userId: string | null;
  forcePasswordReset: boolean;
}> {
  const vendor = await prisma.marketplaceVendor.findFirst({
    where: { id: vendorId },
    select: { primaryUserId: true, contactEmail: true },
  });
  if (!vendor?.primaryUserId) {
    return {
      enabled: false,
      loginEmail: vendor?.contactEmail ?? null,
      vendorRole: "vendor_admin",
      permissions: permissionsRecordFromKeys(VENDOR_ROLE_PRESETS.vendor_admin),
      userId: null,
      forcePasswordReset: false,
    };
  }

  const [user, staff, permKeys] = await Promise.all([
    prisma.user.findFirst({
      where: { id: vendor.primaryUserId },
      select: { email: true, forcePasswordReset: true },
    }),
    prisma.marketplaceVendorStaff.findFirst({
      where: { vendorId, userId: vendor.primaryUserId },
      select: { role: true },
    }),
    getVendorPermissionKeysForUser(vendorId, vendor.primaryUserId),
  ]);

  const role = (staff?.role ?? "vendor_admin") as VendorStaffRole;

  return {
    enabled: true,
    loginEmail: user?.email ?? vendor.contactEmail,
    vendorRole: VENDOR_STAFF_ROLES.includes(role) ? role : "vendor_admin",
    permissions: permissionsRecordFromKeys(permKeys.length ? permKeys : VENDOR_ROLE_PRESETS[role]),
    userId: vendor.primaryUserId.toString(),
    forcePasswordReset: user?.forcePasswordReset ?? false,
  };
}
