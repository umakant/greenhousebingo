/* eslint-disable no-console */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PERMS = [
  { id: 995, name: "manage-routing", label: "Manage Routing" },
  { id: 996, name: "manage-routing-dashboard", label: "Routing Dashboard" },
  { id: 997, name: "manage-routing-routes", label: "Manage Employee Routes" },
  { id: 998, name: "manage-routing-fieldmap", label: "Manage FieldMap" },
  { id: 999, name: "manage-routing-my-routes", label: "My Routes" },
];

async function main() {
  const addon = await prisma.addOn.upsert({
    where: { module: "Routing" },
    update: { isEnable: true, name: "Routing", packageName: "routing" },
    create: {
      module: "Routing",
      name: "Routing",
      packageName: "routing",
      monthlyPrice: 0,
      yearlyPrice: 0,
      isEnable: true,
      forAdmin: false,
      priority: 52,
    },
  });
  console.log("[routing] add-on:", addon.module, "enabled:", addon.isEnable);

  for (const perm of PERMS) {
    await prisma.permission.upsert({
      where: { name_guardName: { name: perm.name, guardName: "web" } },
      update: { addOn: "Routing", module: "Routing", label: perm.label },
      create: {
        id: BigInt(perm.id),
        name: perm.name,
        label: perm.label,
        module: "Routing",
        addOn: "Routing",
        guardName: "web",
        createdAt: new Date(),
      },
    });
  }

  const dbPerms = await prisma.permission.findMany({ where: { addOn: "Routing" } });
  const roles = await prisma.role.findMany({ where: { name: { in: ["company", "staff"] } } });
  const rows = [];
  for (const role of roles) {
    for (const perm of dbPerms) {
      rows.push({ roleId: role.id, permissionId: perm.id });
    }
  }
  if (rows.length) {
    await prisma.roleHasPermission.createMany({ data: rows, skipDuplicates: true });
  }

  console.log("[routing] permissions:", dbPerms.map((p) => p.name).join(", "));
  console.log("[routing] assigned to roles:", roles.map((r) => r.name).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
