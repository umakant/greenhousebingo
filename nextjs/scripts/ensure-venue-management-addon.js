/* eslint-disable no-console */
/**
 * Ensures Venue Management add-on, permissions, role assignments, and plan modules.
 * Usage: npm run db:ensure:venue-management-addon
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const VENUE_MANAGEMENT_PERMISSIONS = [
  { id: 1000, name: "manage-venue-management", label: "Manage Venue Management" },
  { id: 1001, name: "manage-venue-management-dashboard", label: "Venue Management Dashboard" },
  { id: 1002, name: "venues.view", label: "View Venues" },
  { id: 1003, name: "venues.manage", label: "Manage Venues" },
];

async function ensurePermissions() {
  const maxPerm = await prisma.permission.aggregate({ _max: { id: true } });
  let nextPermId = (maxPerm._max.id ?? 0n) + 1n;

  for (const perm of VENUE_MANAGEMENT_PERMISSIONS) {
    try {
      const existing = await prisma.permission.findFirst({
        where: { name: perm.name, guardName: "web" },
        select: { id: true },
      });
      if (existing) {
        await prisma.permission.update({
          where: { id: existing.id },
          data: { label: perm.label, addOn: "VenueManagement", module: "VenueManagement" },
        });
        continue;
      }
      await prisma.permission.create({
        data: {
          id: nextPermId++,
          name: perm.name,
          label: perm.label,
          module: "VenueManagement",
          addOn: "VenueManagement",
          guardName: "web",
          createdAt: new Date(),
        },
      });
    } catch (e) {
      console.error(`Failed permission ${perm.name}:`, e.message ?? e);
    }
  }

  const allPerms = await prisma.permission.findMany({
    where: { addOn: "VenueManagement" },
    select: { id: true },
  });

  const targetRoles = await prisma.role.findMany({
    where: { name: { in: ["company", "staff"] } },
    select: { id: true, name: true },
  });

  const rows = [];
  for (const role of targetRoles) {
    for (const perm of allPerms) {
      rows.push({ roleId: role.id, permissionId: perm.id });
    }
  }
  if (rows.length) {
    await prisma.roleHasPermission.createMany({ data: rows, skipDuplicates: true }).catch(() => null);
    console.log(
      `✓ Assigned ${allPerms.length} venue management permissions to: ${targetRoles.map((r) => r.name).join(", ")}`,
    );
  }
}

async function ensurePlanModules() {
  const plans = await prisma.plan.findMany({ select: { id: true, name: true, modules: true } });
  let updated = 0;
  for (const plan of plans) {
    const existing = Array.isArray(plan.modules) ? plan.modules : [];
    if (existing.length === 0) continue;
    const lower = existing.map((m) => String(m).toLowerCase());
    if (lower.includes("venuemanagement")) continue;
    const hasEventPlatform = lower.includes("eventplatform");
    if (!hasEventPlatform) continue;
    await prisma.plan.update({
      where: { id: plan.id },
      data: { modules: [...existing, "VenueManagement"] },
    });
    updated += 1;
    console.log(`✓ Plan "${plan.name}": added VenueManagement module (Event Platform bundle)`);
  }
  if (!updated) {
    console.log("✓ Plans already include VenueManagement or have no Event Platform module.");
  }
}

async function main() {
  console.log("Ensuring Venue Management add-on for company tenants…");

  await prisma.addOn.upsert({
    where: { module: "VenueManagement" },
    update: { isEnable: true, name: "Venue Management", packageName: "venuemanagement" },
    create: {
      module: "VenueManagement",
      name: "Venue Management",
      monthlyPrice: 0,
      yearlyPrice: 0,
      isEnable: true,
      forAdmin: false,
      packageName: "venuemanagement",
      priority: 78,
    },
  });
  console.log("✓ add_ons row for VenueManagement");

  await ensurePermissions();
  await ensurePlanModules();

  console.log("\nDone. Company users may need to re-login or refresh session for the menu to update.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
