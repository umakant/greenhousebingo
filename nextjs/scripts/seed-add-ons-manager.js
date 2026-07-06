/* eslint-disable no-console */
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * Add-ons for the Add-ons Manager UI.
 * module = Laravel module.json "name" or Next.js add-on key (used in add_ons.module and plan.modules).
 * Storefront is Next-only (no packages/workdo folder); keep in sync with instrumentation ensureStorefrontSetup.
 */
const ADDONS = [
  { module: "Taskly", name: "Project", packageName: "taskly", priority: 10, forAdmin: false },
  { module: "Account", name: "Accounting", packageName: "account", priority: 20, forAdmin: false },
  { module: "Hrm", name: "HRM", packageName: "hrm", priority: 30, forAdmin: false },
  { module: "Lead", name: "CRM", packageName: "lead", priority: 40, forAdmin: false },
  { module: "Pos", name: "POS", packageName: "pos", priority: 50, forAdmin: false },
  { module: "RecurringInvoiceBill", name: "Recurring Invoice/Purchase", packageName: "recurring-invoice-bill", priority: 190, forAdmin: false },
  { module: "Recruitment", name: "Recruitment", packageName: "recruitment", priority: 60, forAdmin: false },
  { module: "Appointment", name: "Appointment", packageName: "appointment", priority: 70, forAdmin: false },
  { module: "Storefront", name: "Storefronts", packageName: "storefront", priority: 75, forAdmin: false },
  { module: "Lms", name: "LMS", packageName: "lms", priority: 76, forAdmin: false },
  { module: "Routing", name: "Routing", packageName: "routing", priority: 52, forAdmin: false },
  { module: "AffiliateBusiness", name: "Affiliate Business", packageName: "affiliatebusiness", priority: 77, forAdmin: false },
  { module: "Compliance", name: "Compliance", packageName: "compliance", priority: 78, forAdmin: false },
  { module: "ExpenseManagement", name: "Expense Management", packageName: "expensemanagement", priority: 79, forAdmin: false },
  { module: "FormBuilder", name: "Form Builder", packageName: "formbuilder", priority: 80, forAdmin: false },
  { module: "ResumeBuilder", name: "Resume Builder", packageName: "resumebuilder", priority: 81, forAdmin: false },
  { module: "SupportTicket", name: "Support Ticket", packageName: "supportticket", priority: 82, forAdmin: false },
  { module: "Assets", name: "Assets", packageName: "assets", priority: 83, forAdmin: false },
  { module: "WhatsAppChat", name: "WhatsApp Chat", packageName: "whatsappchat", priority: 84, forAdmin: false },
  { module: "Marketplace", name: "Marketplace", packageName: "marketplace", priority: 85, forAdmin: false },
  { module: "Stripe", name: "Stripe", packageName: "stripe", priority: 1500, forAdmin: false },
  { module: "Paypal", name: "Paypal", packageName: "paypal", priority: 1510, forAdmin: false },
  { module: "BusinessModules", name: "Business Modules", packageName: "business-modules", priority: 0, forAdmin: true },
];

function asDecimal(x) {
  const n = typeof x === "number" ? x : Number(String(x ?? ""));
  const safe = Number.isFinite(n) ? n : 0;
  return new Prisma.Decimal(safe);
}

function packageName(row) {
  return row.packageName || row.module.toLowerCase();
}

async function main() {
  console.log("Seeding Add-ons Manager (Laravel list only)...");

  const allowedModules = new Set(ADDONS.map((r) => r.module));
  const existingAll = await prisma.addOn.findMany({ select: { module: true } });
  const toRemove = existingAll.filter((e) => !allowedModules.has(e.module));
  if (toRemove.length > 0) {
    for (const r of toRemove) {
      await prisma.addOn.delete({ where: { module: r.module } });
    }
    console.log(`Removed ${toRemove.length} add-on(s) not in Laravel list: ${toRemove.map((x) => x.module).join(", ")}`);
  }

  let created = 0;
  let updated = 0;

  for (const row of ADDONS) {
    const pkg = packageName(row);
    const existing = await prisma.addOn.findUnique({
      where: { module: row.module },
      select: { id: true },
    });

    const forAdmin = row.forAdmin === true;
    const addonVersion = row.version && String(row.version).trim() ? String(row.version).trim() : "1.0.0";

    if (existing) {
      await prisma.addOn.update({
        where: { module: row.module },
        data: {
          name: row.name,
          monthlyPrice: asDecimal(0),
          yearlyPrice: asDecimal(0),
          isEnable: true,
          forAdmin,
          packageName: pkg,
          priority: row.priority,
          version: addonVersion,
          updatedAt: new Date(),
        },
      });
      updated++;
    } else {
      await prisma.addOn.create({
        data: {
          module: row.module,
          name: row.name,
          monthlyPrice: asDecimal(0),
          yearlyPrice: asDecimal(0),
          image: null,
          isEnable: true,
          forAdmin,
          packageName: pkg,
          priority: row.priority,
          version: addonVersion,
          createdAt: new Date(),
          updatedAt: null,
        },
      });
      created++;
    }
  }

  console.log(`Done. Created: ${created}, updated: ${updated}, total: ${ADDONS.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
