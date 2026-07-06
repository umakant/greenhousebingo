import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Marketplace module permissions (dot-notation, per the product spec).
 * Stored with add_on = module = "Marketplace" so they group in the roles editor.
 * `hasPermission()` does a plain string match, so dot-notation works fine.
 */
export const MARKETPLACE_PERMISSION_NAMES = [
  "marketplace.view",
  "marketplace.manage",
  "marketplace.vendor.view",
  "marketplace.vendor.manage",
  "marketplace.orders.view",
  "marketplace.orders.manage",
  "marketplace.delivery_queue.view",
  "marketplace.delivery_queue.manage",
  "marketplace.delivery_events.create",
  "marketplace.reports.view",
  "marketplace.settings.manage",
] as const;

export type MarketplacePermission = (typeof MARKETPLACE_PERMISSION_NAMES)[number];

const GUARD_NAME = "web";

const LABELS: Record<string, string> = {
  "marketplace.view": "View Marketplace",
  "marketplace.manage": "Manage Marketplace",
  "marketplace.vendor.view": "View Marketplace Vendors",
  "marketplace.vendor.manage": "Manage Marketplace Vendors",
  "marketplace.orders.view": "View Marketplace Orders",
  "marketplace.orders.manage": "Manage Marketplace Orders",
  "marketplace.delivery_queue.view": "View Marketplace Delivery Queues",
  "marketplace.delivery_queue.manage": "Manage Marketplace Delivery Queues",
  "marketplace.delivery_events.create": "Create Marketplace Delivery Events",
  "marketplace.reports.view": "View Marketplace Reports",
  "marketplace.settings.manage": "Manage Marketplace Settings",
};

/** Permissions that buyer-side (company) users typically need to browse + order. */
export const MARKETPLACE_COMPANY_PERMISSION_NAMES: readonly string[] = [
  "marketplace.view",
  "marketplace.orders.view",
  "marketplace.orders.manage",
];

/**
 * Upserts the Marketplace Permission rows (add_on/module = "Marketplace").
 * Idempotent; safe to call on every server start.
 */
export async function ensureMarketplacePermissions(): Promise<void> {
  const existing = await prisma.permission.findMany({
    where: { addOn: "Marketplace" },
    select: { name: true },
  });
  const existingByName = new Set(existing.map((p) => p.name));

  // The Permission.id column has no auto-increment default (Laravel-migrated),
  // so creates must supply an explicit id (matches the other module seeders).
  const maxPerm = await prisma.permission.aggregate({ _max: { id: true } });
  let nextPermId = (maxPerm._max.id ?? 0n) + 1n;

  for (const name of MARKETPLACE_PERMISSION_NAMES) {
    if (existingByName.has(name)) continue;
    await prisma.permission
      .upsert({
        where: { name_guardName: { name, guardName: GUARD_NAME } },
        update: { addOn: "Marketplace", module: "Marketplace", label: LABELS[name] ?? name },
        create: {
          id: nextPermId++,
          name,
          label: LABELS[name] ?? name,
          module: "Marketplace",
          addOn: "Marketplace",
          guardName: GUARD_NAME,
          createdAt: new Date(),
        },
      })
      .catch(() => null);
  }

  // Grant buyer-side permissions to company + staff roles so plan-gated tenants
  // get menu + basic access (matches how other add-ons assign to company/staff).
  const companyPerms = await prisma.permission.findMany({
    where: { addOn: "Marketplace", name: { in: [...MARKETPLACE_COMPANY_PERMISSION_NAMES] } },
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

/**
 * Ensures the `add_ons` row exists + enabled and all Marketplace permissions exist.
 * Mirrors ensureAffiliateBusinessSetup() in instrumentation.ts.
 */
export async function ensureMarketplaceSetup(): Promise<void> {
  await prisma.addOn
    .upsert({
      where: { module: "Marketplace" },
      update: {},
      create: {
        module: "Marketplace",
        name: "Marketplace",
        monthlyPrice: 0,
        yearlyPrice: 0,
        isEnable: true,
        forAdmin: false,
        packageName: "marketplace",
        priority: 78,
      },
    })
    .catch((e: unknown) => {
      console.error("[instrumentation] Marketplace add_ons upsert failed:", e);
    });

  await ensureMarketplacePermissions();

  const { ensureMarketplaceVendorPortalPermissions } = await import(
    "@/lib/marketplace-vendor-portal-permissions"
  );
  await ensureMarketplaceVendorPortalPermissions();
}
