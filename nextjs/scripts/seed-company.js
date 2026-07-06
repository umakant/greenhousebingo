/* eslint-disable no-console */
/**
 * seed-company.js
 *
 * Creates/updates the demo company and its staff with realistic profile data,
 * seeds all company-level settings (brand, system, company info, currency),
 * and ensures the company is on an active paid plan.
 *
 * Safe to re-run: all operations use upsert / skipDuplicates / update.
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const COMPANY_ID   = 1000n;  // company@example.com
const SUPERADMIN_ID = 1n;    // superadmin@example.com
const USER_MODEL_TYPE = "App\\Models\\User";

// ─── helpers ─────────────────────────────────────────────────────────────────

async function nextSettingId() {
  const agg = await prisma.setting.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

async function upsertSetting(ownerId, key, value) {
  const existing = await prisma.setting.findFirst({ where: { key, createdBy: ownerId } });
  if (existing) {
    await prisma.setting.update({ where: { id: existing.id }, data: { value: value == null ? null : String(value), updatedAt: new Date() } });
  } else {
    await prisma.setting.create({
      data: { id: await nextSettingId(), key, value: value == null ? null : String(value), createdBy: ownerId, createdAt: new Date() },
    });
  }
}

async function upsertUser(data) {
  const { id, ...rest } = data;
  await prisma.user.upsert({
    where: { id },
    create: { id, ...rest },
    update: rest,
  });
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("[seed-company] Starting company seed…");

  const demoHash = await bcrypt.hash("1234", 10);

  // ── 1. Company (owner) user ─────────────────────────────────────────────────
  console.log("[seed-company] Upserting company user…");
  await upsertUser({
    id: COMPANY_ID,
    email: "company@example.com",
    name: "PaperFlight Inc.",
    password: demoHash,
    type: "company",
    mobileNo: "+1-212-555-0100",
    isActive: true,
    isEnableLogin: true,
    emailVerifiedAt: new Date(),
    // Active plan: Professional Plan (id=4), no expiry = lifetime for demo
    activePlan: 4,
    planExpireDate: null,
  });

  // ── 2. Staff users ──────────────────────────────────────────────────────────
  console.log("[seed-company] Upserting staff users…");

  const staffUsers = [
    { id: 1001n, email: "staff@example.com",    name: "Alex Morgan",      type: "staff",  mobileNo: "+1-212-555-1001" },
    { id: 1010n, email: "hr@example.com",        name: "Sarah Johnson",    type: "staff",  mobileNo: "+1-212-555-1010" },
    { id: 1011n, email: "finance@example.com",   name: "Michael Chen",     type: "staff",  mobileNo: "+1-212-555-1011" },
    { id: 1012n, email: "sales@example.com",     name: "Emma Williams",    type: "staff",  mobileNo: "+1-212-555-1012" },
    { id: 1013n, email: "support@example.com",   name: "James Rodriguez",  type: "staff",  mobileNo: "+1-212-555-1013" },
    { id: 1002n, email: "client@example.com",    name: "Acme Corp Client", type: "client", mobileNo: "+1-312-555-2001" },
    { id: 1003n, email: "vendor@example.com",    name: "Global Vendor Ltd",type: "vendor", mobileNo: "+1-312-555-3001" },
  ];

  for (const u of staffUsers) {
    await upsertUser({
      ...u,
      password: demoHash,
      isActive: true,
      isEnableLogin: true,
      emailVerifiedAt: new Date(),
      createdBy: COMPANY_ID,
      creatorId: COMPANY_ID,
    });
  }

  // Assign staff role to new staff users
  const staffRole = await prisma.role.findFirst({ where: { name: "staff" }, select: { id: true } });
  if (staffRole) {
    const newStaffIds = [1010n, 1011n, 1012n, 1013n];
    await prisma.modelHasRole.createMany({
      data: newStaffIds.map((mid) => ({
        modelId: mid,
        roleId: staffRole.id,
        modelType: USER_MODEL_TYPE,
      })),
      skipDuplicates: true,
    });
  }

  // Assign client/vendor roles
  const clientRole = await prisma.role.findFirst({ where: { name: "client" }, select: { id: true } });
  const vendorRole = await prisma.role.findFirst({ where: { name: "vendor" }, select: { id: true } });
  if (clientRole) {
    await prisma.modelHasRole.createMany({
      data: [{ modelId: 1002n, roleId: clientRole.id, modelType: USER_MODEL_TYPE }],
      skipDuplicates: true,
    });
  }
  if (vendorRole) {
    await prisma.modelHasRole.createMany({
      data: [{ modelId: 1003n, roleId: vendorRole.id, modelType: USER_MODEL_TYPE }],
      skipDuplicates: true,
    });
  }

  // ── 3. Company profile settings ─────────────────────────────────────────────
  console.log("[seed-company] Seeding company profile settings…");
  const companySettings = [
    ["company_name",           "PaperFlight Inc."],
    ["company_address",        "350 Fifth Avenue, Suite 4200"],
    ["company_city",           "New York"],
    ["company_state",          "New York"],
    ["company_country",        "United States"],
    ["company_zipcode",        "10118"],
    ["company_telephone",      "+1-212-555-0100"],
    ["company_email",          "info@paperflight.demo"],
    ["company_email_from_name","PaperFlight Inc."],
    ["registration_number",    "PF-2019-12345"],
  ];
  for (const [key, value] of companySettings) {
    await upsertSetting(COMPANY_ID, key, value);
  }

  // ── 4. System / brand settings (superadmin-owned, shared across all tenants) ─
  console.log("[seed-company] Seeding system/brand settings…");
  const systemSettings = [
    // Brand
    ["titleText",                  "PaperFlight"],
    ["footerText",                 "© 2026 PaperFlight Inc. All rights reserved."],
    ["sidebarVariant",             "default"],
    ["sidebarStyle",               "icon-text"],
    ["layoutDirection",            "ltr"],
    ["themeMode",                  "light"],
    ["themeColor",                 "blue"],
    // System
    ["defaultLanguage",            "en"],
    ["dateFormat",                 "m/d/Y"],
    ["timeFormat",                 "h:i A"],
    ["calendarStartDay",           "0"],
    ["enableRegistration",         "on"],
    ["enableEmailVerification",    "off"],
    ["landingPageEnabled",         "1"],
    // Currency
    ["defaultCurrency",            "USD"],
    ["decimalFormat",              "2"],
    ["decimalSeparator",           "."],
    ["thousandsSeparator",         ","],
    ["floatNumber",                "2"],
    ["currencySymbolSpace",        "1"],
    ["currencySymbolPosition",     "before"],
    // SEO
    ["metaTitle",                  "PaperFlight — Business Management Platform"],
    ["metaDescription",            "PaperFlight is a powerful business management platform covering HRM, Accounting, Projects, Recruitment, Appointments, and more."],
    ["metaKeywords",               "business management, HRM, accounting, project management, SaaS"],
  ];
  for (const [key, value] of systemSettings) {
    await upsertSetting(SUPERADMIN_ID, key, value);
  }

  // ── 5. Ensure Professional Plan exists and company is assigned to it ─────────
  console.log("[seed-company] Ensuring Professional Plan…");
  const allModules = [
    "Hrm", "Taskly", "Account", "Appointment", "Recruitment",
    "Lead", "Pos", "Messenger", "Proposal", "Helpdesk", "Plan",
  ];

  await prisma.plan.upsert({
    where: { id: 4n },
    create: {
      id: 4n,
      name: "Professional Plan",
      description: "Full access to all modules including HRM, Accounting, Projects, Recruitment, Appointment, and Messenger.",
      numberOfUsers: 50,
      customPlan: false,
      status: true,
      freePlan: false,
      modules: allModules,
      packagePriceMonthly: 99,
      packagePriceYearly: 990,
      pricePerUserMonthly: 5,
      pricePerUserYearly: 50,
      storageLimit: 100,
      trial: false,
      trialDays: 0,
    },
    update: {
      name: "Professional Plan",
      modules: allModules,
      status: true,
    },
  });

  // ── 6. Create a demo Order / subscription record for the company ────────────
  console.log("[seed-company] Ensuring demo subscription order…");
  const existingOrder = await prisma.order.findFirst({ where: { userId: COMPANY_ID } });
  if (!existingOrder) {
    const agg = await prisma.order.aggregate({ _max: { id: true } });
    const orderId = (agg._max.id ?? 0n) + 1n;
    await prisma.order.create({
      data: {
        id: orderId,
        userId: COMPANY_ID,
        planId: 4n,
        amount: 990,
        status: "success",
        paymentMethod: "demo",
        orderId: `ORD-DEMO-${Date.now()}`,
        name: "PaperFlight Inc.",
        email: "company@example.com",
        planName: "Professional Plan",
        price: 990,
        paymentStatus: "paid",
        paymentType: "yearly",
        createdBy: SUPERADMIN_ID,
      },
    });
  }

  // ── 7. Ensure all add-ons are enabled for the company ───────────────────────
  console.log("[seed-company] Ensuring add-ons enabled…");
  const addOns = ["Hrm", "Taskly", "Account", "Appointment", "Recruitment", "Messenger", "Lead"];
  for (const module of addOns) {
    await prisma.addOn.updateMany({ where: { module }, data: { isEnable: true } });
  }

  console.log("[seed-company] ✓ Company seed complete.");
  console.log("[seed-company] Demo credentials (password: 1234):");
  console.log("  company@example.com   → PaperFlight Inc. (company owner)");
  console.log("  staff@example.com     → Alex Morgan (staff)");
  console.log("  hr@example.com        → Sarah Johnson (HR staff)");
  console.log("  finance@example.com   → Michael Chen (Finance staff)");
  console.log("  sales@example.com     → Emma Williams (Sales staff)");
  console.log("  support@example.com   → James Rodriguez (Support staff)");
  console.log("  client@example.com    → Acme Corp Client");
  console.log("  vendor@example.com    → Global Vendor Ltd");
}

main()
  .catch((e) => { console.error("[seed-company] ERROR:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
