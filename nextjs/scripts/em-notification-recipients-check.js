/* eslint-disable no-console */
/**
 * Verifies supervisor/billing recipients exist for workflow emails in an org.
 * Run: node scripts/em-notification-recipients-check.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const MORPH = "App\\Models\\User";

async function usersWithPermission(prisma, orgId, permName) {
  const perm = await prisma.permission.findFirst({ where: { name: permName }, select: { id: true } });
  if (!perm) return [];
  const roleLinks = await prisma.roleHasPermission.findMany({
    where: { permissionId: perm.id },
    select: { roleId: true },
  });
  const roleIds = [...new Set(roleLinks.map((r) => r.roleId))];
  if (!roleIds.length) return [];
  const links = await prisma.modelHasRole.findMany({
    where: { roleId: { in: roleIds }, modelType: MORPH },
    select: { modelId: true },
  });
  const ids = [...new Set(links.map((l) => l.modelId))];
  if (!ids.length) return [];
  return prisma.user.findMany({
    where: {
      id: { in: ids },
      isActive: true,
      OR: [{ id: orgId }, { createdBy: orgId }, { creatorId: orgId }],
      email: { not: null },
    },
    select: { id: true, email: true, name: true, type: true },
  });
}

async function usersWithRole(prisma, orgId, roleName) {
  const role = await prisma.role.findFirst({ where: { name: roleName }, select: { id: true } });
  if (!role) return [];
  const links = await prisma.modelHasRole.findMany({
    where: { roleId: role.id, modelType: MORPH },
    select: { modelId: true },
  });
  const ids = links.map((l) => l.modelId);
  if (!ids.length) return [];
  return prisma.user.findMany({
    where: {
      id: { in: ids },
      isActive: true,
      OR: [{ id: orgId }, { createdBy: orgId }, { creatorId: orgId }],
      email: { not: null },
    },
    select: { id: true, email: true, name: true, type: true },
  });
}

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  const company = await prisma.user.findFirst({
    where: { type: { contains: "company", mode: "insensitive" } },
    select: { id: true, email: true },
  });
  if (!company) {
    console.error("No company user");
    process.exit(1);
  }

  const orgId = company.id;
  const supervisors = await usersWithRole(prisma, orgId, "expense-supervisor");
  const approvers = await usersWithPermission(prisma, orgId, "approve-expense-reports");
  const emAdmins = await usersWithPermission(prisma, orgId, "manage-expense-management");
  const billing = await usersWithRole(prisma, orgId, "expense-billing");
  const billingPerm = await usersWithPermission(prisma, orgId, "manage-expense-billing");
  const staff = await prisma.user.findMany({
    where: { type: "staff", createdBy: orgId, isActive: true, email: { not: null } },
    take: 5,
    select: { id: true, email: true, name: true },
  });

  console.log("EM notification recipients check\n");
  console.log(`Organization (company) id: ${orgId}`);
  console.log(`Supervisors (expense-supervisor role): ${supervisors.length}`);
  supervisors.forEach((u) => console.log(`  - ${u.email} (${u.name ?? u.type})`));
  console.log(`Users with approve-expense-reports: ${approvers.length}`);
  approvers.forEach((u) => console.log(`  - ${u.email}`));
  console.log(`Users with manage-expense-management: ${emAdmins.length}`);
  emAdmins.forEach((u) => console.log(`  - ${u.email} (${u.type})`));
  console.log(`Billing (expense-billing role): ${billing.length}`);
  billing.forEach((u) => console.log(`  - ${u.email} (${u.name ?? u.type})`));
  console.log(`Users with manage-expense-billing: ${billingPerm.length}`);
  billingPerm.forEach((u) => console.log(`  - ${u.email}`));
  console.log(`Sample employees (staff): ${staff.length}`);
  staff.forEach((u) => console.log(`  - ${u.email}`));

  let warn = 0;
  const canNotifySupervisor = supervisors.length + approvers.length + emAdmins.length > 0;
  const canNotifyBilling = billing.length + billingPerm.length + emAdmins.length > 0;
  if (!canNotifySupervisor) {
    console.warn("\nWARN: No supervisor/approver recipients — assign Expense Supervisor or company EM admin.");
    warn++;
  }
  if (!canNotifyBilling) {
    console.warn("WARN: No billing recipients — assign Expense Billing or company EM admin.");
    warn++;
  }
  if (staff.length === 0) {
    console.warn("WARN: No staff submitters — create HRM employee with portal login.");
    warn++;
  }

  await prisma.$disconnect();
  if (warn) process.exit(1);
  console.log("\nOK — recipients available for workflow notifications.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
