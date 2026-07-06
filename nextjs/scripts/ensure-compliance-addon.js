/* eslint-disable no-console */
/**
 * Ensures Compliance add-on, permissions, role assignments, and plan modules.
 * Usage: npm run db:ensure:compliance-addon
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const COMPLIANCE_PERMISSIONS = [
  { id: 971, name: "manage-compliance", label: "Manage Compliance" },
  { id: 972, name: "manage-compliance-dashboard", label: "Compliance Dashboard" },
  { id: 973, name: "manage-compliance-frameworks", label: "Manage Compliance Frameworks" },
  { id: 974, name: "manage-compliance-controls", label: "Manage Compliance Controls" },
  { id: 975, name: "manage-compliance-evidence", label: "Manage Compliance Evidence" },
  { id: 976, name: "manage-compliance-policies", label: "Manage Compliance Policies" },
  { id: 977, name: "manage-compliance-documents", label: "Manage Compliance Documents" },
  { id: 978, name: "manage-compliance-monitors", label: "Manage Compliance Monitors" },
  { id: 979, name: "manage-compliance-risks", label: "Manage Compliance Risks" },
  { id: 980, name: "manage-compliance-vendors", label: "Manage Compliance Vendor Reviews" },
  { id: 981, name: "manage-compliance-access-reviews", label: "Manage Compliance Access Reviews" },
  { id: 982, name: "manage-compliance-vulnerabilities", label: "Manage Compliance Vulnerabilities" },
  { id: 983, name: "manage-compliance-audits", label: "Manage Compliance Audits" },
  { id: 984, name: "manage-compliance-trust-center", label: "Manage Compliance Trust Center" },
  { id: 985, name: "manage-compliance-integrations", label: "Manage Compliance Integrations" },
  { id: 986, name: "manage-compliance-settings", label: "Manage Compliance Settings" },
  { id: 987, name: "manage-compliance-launchpad", label: "Manage Compliance Launchpad" },
  { id: 988, name: "manage-compliance-reports", label: "Manage Compliance Reports" },
  { id: 989, name: "manage-compliance-tasks", label: "Manage Compliance Tasks" },
];

async function ensurePermissions() {
  for (const perm of COMPLIANCE_PERMISSIONS) {
    try {
      await prisma.permission.upsert({
        where: { name_guardName: { name: perm.name, guardName: "web" } },
        update: { label: perm.label, addOn: "Compliance", module: "Compliance" },
        create: {
          id: BigInt(perm.id),
          name: perm.name,
          label: perm.label,
          module: "Compliance",
          addOn: "Compliance",
          guardName: "web",
          createdAt: new Date(),
        },
      });
    } catch (e) {
      console.error(`Failed permission ${perm.name}:`, e.message ?? e);
    }
  }

  const allPerms = await prisma.permission.findMany({
    where: { addOn: "Compliance" },
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
    console.log(`✓ Assigned ${allPerms.length} compliance permissions to: ${targetRoles.map((r) => r.name).join(", ")}`);
  }
}

async function ensurePlanModules() {
  const plans = await prisma.plan.findMany({ select: { id: true, name: true, modules: true } });
  let updated = 0;
  for (const plan of plans) {
    const existing = Array.isArray(plan.modules) ? plan.modules : [];
    if (existing.length === 0) continue;
    const lower = existing.map((m) => String(m).toLowerCase());
    if (lower.includes("compliance")) continue;
    await prisma.plan.update({
      where: { id: plan.id },
      data: { modules: [...existing, "Compliance"] },
    });
    updated += 1;
    console.log(`✓ Plan "${plan.name}": added Compliance module`);
  }
  if (!updated) console.log("✓ All plans already include Compliance (or use empty modules = all add-ons).");
}

async function main() {
  console.log("Ensuring Compliance add-on for company tenants…");

  await prisma.addOn.upsert({
    where: { module: "Compliance" },
    update: { isEnable: true, name: "Compliance", packageName: "compliance" },
    create: {
      module: "Compliance",
      name: "Compliance",
      monthlyPrice: 0,
      yearlyPrice: 0,
      isEnable: true,
      forAdmin: false,
      packageName: "compliance",
      priority: 78,
    },
  });
  console.log("✓ add_ons row for Compliance");

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
