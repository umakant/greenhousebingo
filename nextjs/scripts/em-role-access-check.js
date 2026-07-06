/* eslint-disable no-console */
/**
 * Validates Expense Management permissions on system portal roles + company role.
 * Run: node scripts/em-role-access-check.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const PORTAL_ROLES = ["client", "staff", "vendor"];
const WORKFLOW_ROLES = ["expense-supervisor", "expense-billing"];
const LMS_SKIP = ["lms-student", "lms-instructor", "support-staff"];

const PORTAL_EM = [
  "manage-expense-management-dashboard",
  "manage-expense-reports",
  "manage-expense-entries",
  "manage-expense-receipts",
  "manage-expense-analytics",
];

const FORBIDDEN_PORTAL = ["manage-expense-management"];

async function rolePermNames(prisma, roleId) {
  const links = await prisma.roleHasPermission.findMany({
    where: { roleId },
    select: { permissionId: true },
  });
  const ids = links.map((l) => l.permissionId);
  if (!ids.length) return [];
  const rows = await prisma.permission.findMany({
    where: { id: { in: ids } },
    select: { name: true },
  });
  return rows.map((r) => r.name);
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  console.log("Expense Management role access check\n");
  console.log("(If roles are missing, open Settings → User Management → Sync system roles.)\n");

  let failed = 0;

  for (const roleName of PORTAL_ROLES) {
    const role = await prisma.role.findFirst({ where: { name: roleName }, select: { id: true, label: true } });
    if (!role) {
      console.error(`FAIL: missing role "${roleName}" — run Sync system roles or restart server.`);
      failed++;
      continue;
    }
    const perms = await rolePermNames(prisma, role.id);
    for (const need of PORTAL_EM) {
      if (!perms.includes(need)) {
        console.error(`FAIL: role "${roleName}" missing permission ${need}`);
        failed++;
      }
    }
    for (const bad of FORBIDDEN_PORTAL) {
      if (perms.includes(bad)) {
        console.error(`FAIL: role "${roleName}" must not have ${bad}`);
        failed++;
      }
    }
    console.log(`OK  ${roleName} (${role.label}): ${perms.filter((p) => p.includes("expense")).length} EM permissions`);
  }

  for (const roleName of WORKFLOW_ROLES) {
    const role = await prisma.role.findFirst({ where: { name: roleName }, select: { id: true, label: true } });
    if (!role) {
      console.error(`FAIL: missing role "${roleName}" — run Sync system roles.`);
      failed++;
      continue;
    }
    const perms = await rolePermNames(prisma, role.id);
    const need =
      roleName === "expense-supervisor" ? "approve-expense-reports" : "manage-expense-billing";
    if (!perms.includes(need)) {
      console.error(`FAIL: role "${roleName}" missing ${need}`);
      failed++;
    }
    if (!perms.includes("manage-expense-reports")) {
      console.error(`FAIL: role "${roleName}" missing manage-expense-reports`);
      failed++;
    }
    console.log(`OK  ${roleName} (${role.label}): workflow permission ${need}`);
  }

  const company = await prisma.role.findFirst({ where: { name: "company" }, select: { id: true } });
  if (company) {
    const perms = await rolePermNames(prisma, company.id);
    const hasAdmin = perms.includes("manage-expense-management");
    const hasOps = PORTAL_EM.every((p) => perms.includes(p));
    if (!hasAdmin && !hasOps) {
      console.warn("WARN: company role has no expense permissions (plan may add at runtime).");
    } else {
      console.log(`OK  company: admin=${hasAdmin}, operational=${hasOps}`);
    }
  } else {
    console.warn("WARN: company role not found");
  }

  await prisma.$disconnect();

  if (failed) {
    console.error(`\n${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll EM portal role checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
