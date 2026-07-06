/* eslint-disable no-console */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({ log: ["error"] });

const GUARD = "web";
const ADD_ON = "general";

function titleize(name) {
  return String(name)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

async function main() {
  console.log("Seeding RBAC roles, permissions, and demo users...");

  // Permissions are taken from:
  // - database/seeders/PermissionRoleSeeder.php (superadmin + company)
  // - app/Models/User.php::MakeRole() (staff/client/vendor)
  const staffPermissions = [
    "manage-dashboard",
    "manage-media",
    "manage-own-media",
    "create-media",
    "download-media",
    "delete-media",
    "manage-media-directories",
    "manage-own-media-directories",
    "create-media-directories",
    "edit-media-directories",
    "delete-media-directories",
    "manage-profile",
    "edit-profile",
    "change-password-profile",
    "manage-messenger",
    "send-messages",
    "view-messages",
    "toggle-favorite-messages",
    "toggle-pinned-messages",
    // CRM permissions for staff
    "manage-crm",
    "manage-crm-dashboard",
    "manage-leads",
    "create-leads",
    "edit-leads",
    "view-leads",
    "manage-deals",
    "create-deals",
    "edit-deals",
    "view-deals",
    "view-reports",
    // POS permissions for staff
    "manage-pos-dashboard",
    "view-pos",
    "view-sales",
    "view-purchases",
    "view-quotations",
    "view-products",
    "view-categories",
    "view-brands",
    "view-units",
    "view-taxes",
    "view-customers",
    "view-vendors",
    "view-expenses",
    "view-expense-categories",
    "view-branches",
    "view-cash-registers",
    "view-branch-sales-targets",
    "manage-pos-sessions",
    "view-sale-returns",
    "view-purchase-returns",
    "view-barcode",
    "view-referrals",
    "view-calendar",
  ];

  const clientPermissions = [
    "manage-dashboard",
    "manage-profile",
    "edit-profile",
    "change-password-profile",
    "manage-expense-management",
    "manage-expense-management-dashboard",
    "manage-expense-reports",
    "manage-expense-entries",
    "manage-expense-receipts",
    "manage-expense-analytics",
    "manage-media",
    "manage-own-media",
    "create-media",
    "download-media",
    "delete-media",
    "manage-media-directories",
    "manage-own-media-directories",
    "create-media-directories",
    "edit-media-directories",
    "delete-media-directories",
    "manage-messenger",
    "send-messages",
    "view-messages",
    "toggle-favorite-messages",
    "toggle-pinned-messages",
    "manage-sales-invoices",
    "manage-own-sales-invoices",
    "view-sales-invoices",
    "print-sales-invoices",
    "manage-sales-return-invoices",
    "manage-own-sales-return-invoices",
    "view-sales-return-invoices",
    "manage-sales-proposals",
    "manage-own-sales-proposals",
    "view-sales-proposals",
    "print-sales-proposals",
    "accept-sales-proposals",
    "reject-sales-proposals",
  ];

  const vendorPermissions = [
    "manage-dashboard",
    "manage-media",
    "manage-own-media",
    "create-media",
    "download-media",
    "delete-media",
    "manage-media-directories",
    "manage-own-media-directories",
    "create-media-directories",
    "edit-media-directories",
    "delete-media-directories",
    "manage-profile",
    "edit-profile",
    "change-password-profile",
    "manage-messenger",
    "send-messages",
    "view-messages",
    "toggle-favorite-messages",
    "toggle-pinned-messages",
    "manage-purchase-invoices",
    "manage-own-purchase-invoices",
    "view-purchase-invoices",
    "print-purchase-invoices",
    "manage-purchase-return-invoices",
    "manage-own-purchase-return-invoices",
    "view-purchase-return-invoices",
  ];

  const companyPermissions = [
    "manage-dashboard",
    "manage-account",
    "manage-account-dashboard",
    "manage-customers",
    "manage-vendors",
    "manage-bank-accounts",
    "manage-bank-transactions",
    "manage-bank-transfers",
    "manage-chart-of-accounts",
    "manage-vendor-payments",
    "manage-customer-payments",
    "manage-revenues",
    "manage-expenses",
    "manage-debit-notes",
    "manage-credit-notes",
    "manage-account-reports",
    "manage-account-types",
    "manage-users",
    "manage-any-users",
    "manage-own-users",
    "create-users",
    "edit-users",
    "delete-users",
    "change-password-users",
    "toggle-status-users",
    "impersonate-users",
    "view-login-history",
    "manage-roles",
    "view-roles",
    "create-roles",
    "edit-roles",
    "delete-roles",
    "manage-warehouses",
    "manage-any-warehouses",
    "manage-own-warehouses",
    "create-warehouses",
    "edit-warehouses",
    "delete-warehouses",
    "manage-transfers",
    "manage-any-transfers",
    "manage-own-transfers",
    "create-transfers",
    "edit-transfers",
    "delete-transfers",
    "manage-helpdesk-tickets",
    "manage-own-helpdesk-tickets",
    "view-helpdesk-tickets",
    "create-helpdesk-tickets",
    "edit-helpdesk-tickets",
    "manage-helpdesk-replies",
    "create-helpdesk-replies",
    "manage-settings",
    "edit-settings",
    "manage-brand-settings",
    "edit-brand-settings",
    "manage-company-settings",
    "edit-company-settings",
    "manage-system-settings",
    "edit-system-settings",
    "manage-email-settings",
    "edit-email-settings",
    "test-email",
    "manage-email-notification-settings",
    "manage-notification-templates",
    "edit-notification-templates",
    "manage-currency-settings",
    "edit-currency-settings",
    "manage-media",
    "manage-own-media",
    "create-media",
    "download-media",
    "delete-media",
    "manage-media-directories",
    "manage-own-media-directories",
    "create-media-directories",
    "edit-media-directories",
    "delete-media-directories",
    "manage-plans",
    "manage-any-plans",
    "manage-own-plans",
    "view-plans",
    "create-plans",
    "edit-plans",
    "delete-plans",
    "manage-bank-transfer-requests",
    "delete-bank-transfer-requests",
    "manage-orders",
    "view-orders",
    "manage-profile",
    "edit-profile",
    "change-password-profile",
    "manage-messenger",
    "send-messages",
    "view-messages",
    "edit-messages",
    "delete-messages",
    "toggle-favorite-messages",
    "toggle-pinned-messages",
    "manage-purchase-invoices",
    "manage-any-purchase-invoices",
    "manage-own-purchase-invoices",
    "view-purchase-invoices",
    "create-purchase-invoices",
    "edit-purchase-invoices",
    "delete-purchase-invoices",
    "post-purchase-invoices",
    "print-purchase-invoices",
    "manage-purchase-return-invoices",
    "manage-any-purchase-return-invoices",
    "manage-own-purchase-return-invoices",
    "view-purchase-return-invoices",
    "create-purchase-return-invoices",
    "edit-purchase-return-invoices",
    "delete-purchase-return-invoices",
    "approve-purchase-returns-invoices",
    "complete-purchase-returns-invoices",
    "manage-sales-invoices",
    "manage-any-sales-invoices",
    "manage-own-sales-invoices",
    "view-sales-invoices",
    "create-sales-invoices",
    "edit-sales-invoices",
    "delete-sales-invoices",
    "post-sales-invoices",
    "print-sales-invoices",
    "manage-sales-return-invoices",
    "manage-any-sales-return-invoices",
    "manage-own-sales-return-invoices",
    "view-sales-return-invoices",
    "create-sales-return-invoices",
    "delete-sales-return-invoices",
    "approve-sales-returns-invoices",
    "complete-sales-returns-invoices",
    "manage-sales-proposals",
    "manage-any-sales-proposals",
    "manage-own-sales-proposals",
    "view-sales-proposals",
    "create-sales-proposals",
    "edit-sales-proposals",
    "delete-sales-proposals",
    "print-sales-proposals",
    "sent-sales-proposals",
    "accept-sales-proposals",
    "convert-sales-proposals",
    "reject-sales-proposals",
    // CRM permissions
    "manage-crm",
    "manage-crm-dashboard",
    "manage-leads",
    "create-leads",
    "edit-leads",
    "delete-leads",
    "view-leads",
    "manage-deals",
    "create-deals",
    "edit-deals",
    "delete-deals",
    "view-deals",
    "manage-pipelines",
    "create-pipelines",
    "edit-pipelines",
    "delete-pipelines",
    "view-reports",
    "manage-lead-activities",
    "manage-deal-activities",
    // POS permissions
    "manage-pos-dashboard",
    "view-pos",
    "view-sales",
    "create-sales",
    "edit-sales",
    "delete-sales",
    "view-purchases",
    "create-purchases",
    "edit-purchases",
    "delete-purchases",
    "view-quotations",
    "create-quotations",
    "edit-quotations",
    "delete-quotations",
    "view-products",
    "create-products",
    "edit-products",
    "delete-products",
    "view-categories",
    "create-categories",
    "edit-categories",
    "delete-categories",
    "view-brands",
    "create-brands",
    "edit-brands",
    "delete-brands",
    "view-units",
    "create-units",
    "edit-units",
    "delete-units",
    "view-taxes",
    "create-taxes",
    "edit-taxes",
    "delete-taxes",
    "view-customers",
    "create-customers",
    "edit-customers",
    "delete-customers",
    "view-vendors",
    "create-vendors",
    "edit-vendors",
    "delete-vendors",
    "view-expenses",
    "create-expenses",
    "edit-expenses",
    "delete-expenses",
    "view-expense-categories",
    "create-expense-categories",
    "edit-expense-categories",
    "delete-expense-categories",
    "view-branches",
    "create-branches",
    "edit-branches",
    "delete-branches",
    "view-cash-registers",
    "create-cash-registers",
    "edit-cash-registers",
    "delete-cash-registers",
    "view-branch-sales-targets",
    "create-branch-sales-targets",
    "edit-branch-sales-targets",
    "delete-branch-sales-targets",
    "manage-pos-sessions",
    "view-sale-returns",
    "create-sale-returns",
    "delete-sale-returns",
    "view-purchase-returns",
    "create-purchase-returns",
    "delete-purchase-returns",
    "view-barcode",
    "print-barcode",
    "view-referrals",
    "manage-referrals",
    "view-calendar",
    "manage-warehouses",
  ];

  const partnerPermissions = [
    "access-partner-portal",
    "view-partner-dashboard",
    "manage-partner-referrals",
    "view-partner-commissions",
    "view-partner-payouts",
    "edit-partner-profile",
  ];

  const partnershipAdminPermissions = ["manage-partnerships"];

  const allPermissionNames = Array.from(
    new Set([
      ...staffPermissions,
      ...clientPermissions,
      ...vendorPermissions,
      ...companyPermissions,
      ...partnerPermissions,
      ...partnershipAdminPermissions,
    ]),
  );

  // Roles (IDs are stable for demo; DB has no autoincrement in this project setup)
  const roleDefs = [
    { id: 1n, name: "superadmin", label: "Super Admin", createdBy: 1n },
    { id: 2n, name: "company", label: "Company", createdBy: 1n },
    { id: 3n, name: "staff", label: "Employee", createdBy: 2n },
    { id: 4n, name: "client", label: "Client", createdBy: 2n },
    { id: 5n, name: "vendor", label: "Vendor", createdBy: 2n },
    { id: 6n, name: "partner", label: "Partner", createdBy: 1n },
  ];

  for (const r of roleDefs) {
    await prisma.role.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        name: r.name,
        label: r.label,
        guardName: GUARD,
        editable: false,
        createdBy: r.createdBy,
      },
      update: {
        name: r.name,
        label: r.label,
        guardName: GUARD,
        editable: false,
        createdBy: r.createdBy,
      },
    });
  }

  // Permissions — find the current max id so new creates don't collide
  const maxPerm = await prisma.permission.aggregate({ _max: { id: true } });
  let nextPermId = (maxPerm._max.id ?? BigInt(0)) + BigInt(1);

  for (let i = 0; i < allPermissionNames.length; i++) {
    const name = allPermissionNames[i];
    const existing = await prisma.permission.findUnique({
      where: { name_guardName: { name, guardName: GUARD } },
    });
    if (existing) {
      await prisma.permission.update({
        where: { id: existing.id },
        data: { addOn: ADD_ON, module: "general", label: titleize(name) },
      });
    } else {
      await prisma.permission.create({
        data: {
          id: nextPermId++,
          name,
          guardName: GUARD,
          addOn: ADD_ON,
          module: "general",
          label: titleize(name),
        },
      });
    }
  }

  const perms = await prisma.permission.findMany({
    where: { guardName: GUARD },
    select: { id: true, name: true },
  });
  const permIdByName = new Map(perms.map((p) => [p.name, p.id]));

  function linksFor(roleId, permissionNames) {
    return permissionNames
      .map((name) => permIdByName.get(name))
      .filter(Boolean)
      .map((permissionId) => ({ roleId, permissionId }));
  }

  await prisma.roleHasPermission.createMany({
    data: [
      ...linksFor(2n, companyPermissions),
      ...linksFor(3n, staffPermissions),
      ...linksFor(4n, clientPermissions),
      ...linksFor(5n, vendorPermissions),
      ...linksFor(6n, partnerPermissions),
      // superadmin: give all seeded permissions
      ...linksFor(1n, allPermissionNames),
    ],
    skipDuplicates: true,
  });

  // Demo users
  const demoPassword = "1234";
  const demoHash = await bcrypt.hash(demoPassword, 10);

  const demoUsers = [
    // These two match the Laravel seeder expectations
    { id: 1n, email: "superadmin@example.com", name: "Super Admin", type: "superadmin" },
    { id: 1000n, email: "company@example.com", name: "Company", type: "company" },
    // Per-role demo accounts
    { id: 1001n, email: "staff@example.com", name: "Staff User", type: "staff" },
    { id: 1002n, email: "client@example.com", name: "Client User", type: "client" },
    { id: 1003n, email: "vendor@example.com", name: "Vendor User", type: "vendor" },
    { id: 1004n, email: "partner@example.com", name: "Partner User", type: "partner" },
  ];

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        email: u.email,
        name: u.name,
        password: demoHash,
        type: u.type,
        emailVerifiedAt: new Date(),
      },
      update: {
        email: u.email,
        name: u.name,
        password: demoHash,
        type: u.type,
      },
    });
  }

  // Assign roles to demo users
  const roleIdByName = new Map(roleDefs.map((r) => [r.name, r.id]));
  const USER_MODEL_TYPE = "App\\Models\\User";
  const modelHasRoles = [
    { modelId: 1n, roleId: roleIdByName.get("superadmin"), modelType: USER_MODEL_TYPE },
    { modelId: 1000n, roleId: roleIdByName.get("company"), modelType: USER_MODEL_TYPE },
    { modelId: 1001n, roleId: roleIdByName.get("staff"), modelType: USER_MODEL_TYPE },
    { modelId: 1002n, roleId: roleIdByName.get("client"), modelType: USER_MODEL_TYPE },
    { modelId: 1003n, roleId: roleIdByName.get("vendor"), modelType: USER_MODEL_TYPE },
    { modelId: 1004n, roleId: roleIdByName.get("partner"), modelType: USER_MODEL_TYPE },
  ].filter((x) => x.roleId);

  await prisma.modelHasRole.createMany({
    data: modelHasRoles,
    skipDuplicates: true,
  });

  // Demo partner profile row linked to the partner login user.
  try {
    const maxPartner = await prisma.partner.aggregate({ _max: { id: true } });
    const existingPartner = await prisma.partner.findFirst({ where: { userId: 1004n }, select: { id: true } });
    if (!existingPartner) {
      await prisma.partner.create({
        data: {
          id: (maxPartner._max.id ?? 0n) + 1n,
          userId: 1004n,
          name: "Partner User",
          email: "partner@example.com",
          brandName: "Demo Partner Co",
          slug: "demo-partner",
          referralCode: "DEMO-PARTNER",
          status: "active",
          commissionRate: null,
        },
      });
    }
  } catch (err) {
    console.warn("Skipped demo partner profile (run db:ensure:partnership first):", err?.message ?? err);
  }

  console.log("Seed complete.");
  console.log("Demo credentials (password for all): 1234");
  console.log("- superadmin@example.com  (role: superadmin)");
  console.log("- company@example.com     (role: company)");
  console.log("- staff@example.com       (role: staff)");
  console.log("- client@example.com      (role: client)");
  console.log("- vendor@example.com      (role: vendor)");
  console.log("- partner@example.com     (role: partner)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

