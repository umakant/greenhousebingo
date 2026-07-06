/* eslint-disable no-console */
/**
 * Sync system portal roles + permissions (client, staff, vendor, lms-*, support-staff).
 * Run: node scripts/sync-portal-roles.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const GUARD = "web";

const ROLES = {
  client: {
    label: "Customer",
    perms: [
      "manage-dashboard",
      "manage-profile",
      "edit-profile",
      "change-password-profile",
      "manage-expense-management-dashboard",
      "manage-expense-reports",
      "manage-expense-entries",
      "manage-expense-receipts",
      "manage-expense-analytics",
    ],
    userType: "client",
  },
  staff: {
    label: "Employee",
    perms: [
      "manage-dashboard",
      "manage-profile",
      "edit-profile",
      "change-password-profile",
      "manage-expense-management-dashboard",
      "manage-expense-reports",
      "manage-expense-entries",
      "manage-expense-receipts",
      "manage-expense-analytics",
    ],
    userType: "staff",
  },
  vendor: {
    label: "Vendor",
    perms: [
      "manage-dashboard",
      "manage-profile",
      "edit-profile",
      "change-password-profile",
      "manage-expense-management-dashboard",
      "manage-expense-reports",
      "manage-expense-entries",
      "manage-expense-receipts",
      "manage-expense-analytics",
    ],
    userType: "vendor",
  },
};

async function ensurePerm(prisma, name, addOn, module, nextIdRef) {
  let p = await prisma.permission.findFirst({ where: { name, guardName: GUARD } });
  if (!p) {
    const id = nextIdRef.value++;
    p = await prisma.permission.create({
      data: {
        id: BigInt(id),
        name,
        guardName: GUARD,
        addOn,
        module,
        label: name
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
      },
    });
  }
  return p.id;
}

async function syncRole(prisma, roleName, spec, nextIdRef) {
  let role = await prisma.role.findFirst({ where: { name: roleName, guardName: GUARD } });
  if (!role) {
    const max = await prisma.role.aggregate({ _max: { id: true } });
    const id = (max._max.id ?? 0n) + 1n;
    role = await prisma.role.create({
      data: {
        id,
        name: roleName,
        label: spec.label,
        guardName: GUARD,
        editable: false,
        createdBy: null,
      },
    });
  } else {
    await prisma.role.update({
      where: { id: role.id },
      data: { label: spec.label, editable: false, createdBy: null },
    });
  }

  const permIds = [];
  for (const name of spec.perms) {
    const isEm = name.includes("expense");
    const id = await ensurePerm(
      prisma,
      name,
      isEm ? "ExpenseManagement" : "general",
      isEm ? "ExpenseManagement" : "general",
      nextIdRef,
    );
    permIds.push(id);
  }

  const existing = await prisma.roleHasPermission.findMany({
    where: { roleId: role.id },
    select: { permissionId: true },
  });
  const allowed = new Set(permIds.map((id) => id.toString()));
  const toCreate = permIds
    .filter((id) => !existing.some((e) => e.permissionId === id))
    .map((permissionId) => ({ roleId: role.id, permissionId }));
  if (toCreate.length) {
    await prisma.roleHasPermission.createMany({ data: toCreate, skipDuplicates: true });
  }
  const toRemove = existing
    .filter((e) => !allowed.has(e.permissionId.toString()))
    .map((e) => e.permissionId);
  if (toRemove.length) {
    await prisma.roleHasPermission.deleteMany({
      where: { roleId: role.id, permissionId: { in: toRemove } },
    });
  }

  console.log(`Synced role ${roleName} (${spec.perms.length} permissions)`);
}

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  const maxPerm = await prisma.permission.aggregate({ _max: { id: true } });
  const nextIdRef = { value: Number((maxPerm._max.id ?? 0n) + 1n) };

  for (const [name, spec] of Object.entries(ROLES)) {
    await syncRole(prisma, name, spec, nextIdRef);
  }

  await prisma.$disconnect();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
