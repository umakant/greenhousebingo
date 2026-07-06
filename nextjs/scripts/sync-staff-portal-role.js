#!/usr/bin/env node
/* eslint-disable no-console */
/** Sync Employee (staff) portal role permissions — mirrors hrm-employee-role.ts */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const GUARD = "web";
const STAFF_ROLE = "staff";

const STAFF_PERMISSIONS = [
  "manage-dashboard",
  "manage-profile",
  "edit-profile",
  "change-password-profile",
  "manage-expense-management-dashboard",
  "manage-expense-reports",
  "manage-expense-entries",
  "manage-expense-receipts",
  "manage-expense-analytics",
  "manage-routing-my-routes",
  "view-lms-student-dashboard",
  "manage-lms-student-dashboard",
];

function permMeta(name) {
  if (name.includes("expense")) return { addOn: "ExpenseManagement", module: "ExpenseManagement" };
  if (name.includes("routing")) return { addOn: "Routing", module: "Routing" };
  if (name.includes("lms")) return { addOn: "Lms", module: "Lms" };
  return { addOn: "general", module: "general" };
}

function titleize(name) {
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  let role = await prisma.role.findFirst({ where: { name: STAFF_ROLE, guardName: GUARD } });
  if (!role) {
    const maxRole = await prisma.role.aggregate({ _max: { id: true } });
    role = await prisma.role.create({
      data: {
        id: (maxRole._max.id ?? 0n) + 1n,
        name: STAFF_ROLE,
        label: "Employee",
        guardName: GUARD,
        editable: false,
      },
    });
  }

  const maxPerm = await prisma.permission.aggregate({ _max: { id: true } });
  let nextPermId = (maxPerm._max.id ?? 0n) + 1n;
  const permissionIds = [];

  for (const name of STAFF_PERMISSIONS) {
    let perm = await prisma.permission.findFirst({ where: { name, guardName: GUARD } });
    if (!perm) {
      const meta = permMeta(name);
      perm = await prisma.permission.create({
        data: {
          id: nextPermId++,
          name,
          guardName: GUARD,
          addOn: meta.addOn,
          module: meta.module,
          label: titleize(name),
        },
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

  if (toCreate.length) {
    await prisma.roleHasPermission.createMany({ data: toCreate, skipDuplicates: true });
  }

  const toRemove = existingLinks
    .filter((l) => !allowed.has(l.permissionId.toString()))
    .map((l) => l.permissionId);

  if (toRemove.length) {
    await prisma.roleHasPermission.deleteMany({
      where: { roleId: role.id, permissionId: { in: toRemove } },
    });
  }

  console.log(`[sync-staff-portal-role] Staff role synced (${STAFF_PERMISSIONS.length} permissions).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
