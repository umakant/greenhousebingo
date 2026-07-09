/* eslint-disable no-console */
/**
 * Creates / updates The Social Greenhouse company tenant for Plant Bingo / Greenhouse Bingo.
 *
 * Safe to re-run (upsert by email + slug).
 *
 *   npm run db:seed:social-greenhouse
 *   node ./scripts/seed-social-greenhouse-company.js
 */
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const companyData = require("./social-greenhouse-company-data");

const prisma = new PrismaClient();
const USER_MODEL_TYPE = "App\\Models\\User";
const SUPERADMIN_ID = 1n;

async function nextUserId() {
  const agg = await prisma.user.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

async function nextPlanId() {
  const agg = await prisma.plan.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

async function nextSettingId() {
  const agg = await prisma.setting.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

async function upsertSetting(ownerId, key, value) {
  const existing = await prisma.setting.findFirst({
    where: { key, createdBy: ownerId },
    select: { id: true },
  });
  const payload = { value: value == null ? null : String(value), updatedAt: new Date() };
  if (existing) {
    await prisma.setting.update({ where: { id: existing.id }, data: payload });
    return;
  }
  await prisma.setting.create({
    data: {
      id: await nextSettingId(),
      key,
      value: value == null ? null : String(value),
      isPublic: true,
      createdBy: ownerId,
      createdAt: new Date(),
    },
  });
}

async function ensurePlan() {
  const existing = await prisma.plan.findFirst({
    where: { name: companyData.planName },
    select: { id: true, modules: true },
  });
  if (existing) {
    const modules = Array.isArray(existing.modules) ? existing.modules : [];
    const lower = modules.map((m) => String(m).toLowerCase());
    const toAdd = companyData.planModules.filter((m) => !lower.includes(m.toLowerCase()));
    if (toAdd.length > 0) {
      await prisma.plan.update({
        where: { id: existing.id },
        data: { modules: [...modules, ...toAdd], status: true, updatedAt: new Date() },
      });
    } else {
      await prisma.plan.update({
        where: { id: existing.id },
        data: { status: true, updatedAt: new Date() },
      });
    }
    return existing.id;
  }

  const id = await nextPlanId();
  await prisma.plan.create({
    data: {
      id,
      name: companyData.planName,
      description:
        "Plant Bingo operator plan with LMS, Event Platform, storefront, and community event tools.",
      numberOfUsers: 25,
      customPlan: false,
      status: true,
      freePlan: false,
      modules: companyData.planModules,
      packagePriceMonthly: 149,
      packagePriceYearly: 1490,
      pricePerUserMonthly: 0,
      pricePerUserYearly: 0,
      storageLimit: 50,
      trial: true,
      trialDays: 30,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  return id;
}

async function ensureCompanyRole(userId) {
  const companyRole = await prisma.role.findFirst({
    where: { name: "company" },
    select: { id: true },
  });
  if (!companyRole) return;
  await prisma.modelHasRole.createMany({
    data: [{ modelId: userId, roleId: companyRole.id, modelType: USER_MODEL_TYPE }],
    skipDuplicates: true,
  });
}

async function ensureSubscriptionOrder(companyId, planId) {
  const existing = await prisma.order.findFirst({
    where: { userId: companyId, planName: companyData.planName },
    select: { id: true },
  });
  if (existing) return;

  const agg = await prisma.order.aggregate({ _max: { id: true } });
  const orderId = (agg._max.id ?? 0n) + 1n;
  await prisma.order.create({
    data: {
      id: orderId,
      userId: companyId,
      planId,
      amount: 1490,
      status: "success",
      paymentMethod: "demo",
      orderId: `ORD-SGH-${Date.now()}`,
      name: companyData.name,
      email: companyData.email,
      planName: companyData.planName,
      price: 1490,
      paymentStatus: "paid",
      paymentType: "yearly",
      createdBy: SUPERADMIN_ID,
      createdAt: new Date(),
    },
  });
}

async function seedCompanySettings(orgId) {
  const settings = [
    ["company_name", companyData.name],
    ["company_address", "1401 Marshall St NE"],
    ["company_city", companyData.city],
    ["company_state", companyData.state],
    ["company_country", companyData.country],
    ["company_zipcode", "55413"],
    ["company_telephone", companyData.mobileNo],
    ["company_email", "hello@thesocialgreenhouse.com"],
    ["company_email_from_name", companyData.name],
    ["companyWebsite", companyData.website],
    ["companyNextjsThemeSlug", companyData.themeSlug],
    ["saas_lms_enabled", "1"],
    ["saas_event_platform_enabled", "1"],
    ["saas_marketplace_enabled", "1"],
    ["titleText", companyData.name],
    ["footerText", `© ${new Date().getFullYear()} ${companyData.name}. Plant Bingo • Greenhouse Bingo • Community Events`],
    ["metaTitle", "Plant Bingo Events | The Social Greenhouse | Win Plants & Connect"],
    [
      "metaDescription",
      "Join The Social Greenhouse for Plant Bingo events. Play bingo, meet new people, win plants, and experience a unique social event for plant lovers.",
    ],
    ["metaKeywords", "plant bingo, greenhouse bingo, community events, houseplants, social events, Minneapolis"],
    ["defaultCurrency", "USD"],
    ["defaultLanguage", "en"],
    ["themeColor", companyData.brandThemeColor ?? "custom"],
    ["customColor", companyData.brandCustomColor ?? "#4e735a"],
  ];

  for (const [key, value] of settings) {
    await upsertSetting(orgId, key, value);
  }
}

async function main() {
  console.log("[seed-social-greenhouse] Seeding The Social Greenhouse…");

  const planId = await ensurePlan();
  const planIdNum = Number(planId);
  if (!Number.isSafeInteger(planIdNum)) {
    throw new Error("Plan id is out of supported range for users.active_plan.");
  }

  const passwordHash = await bcrypt.hash(companyData.password, 10);
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 30);

  let company = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: companyData.email, mode: "insensitive" } },
        { slug: { equals: companyData.slug, mode: "insensitive" } },
      ],
      type: { in: ["company", "company_admin"] },
    },
    select: { id: true, email: true, slug: true },
  });

  if (company) {
    await prisma.user.update({
      where: { id: company.id },
      data: {
        name: companyData.name,
        email: companyData.email,
        slug: companyData.slug,
        password: passwordHash,
        type: "company",
        mobileNo: companyData.mobileNo,
        lang: "en",
        isActive: true,
        isEnableLogin: true,
        emailVerifiedAt: new Date(),
        activePlan: planIdNum,
        planExpireDate: trialEnds,
        updatedAt: new Date(),
      },
    });
    console.log(`  Updated company id ${company.id.toString()} (${companyData.slug})`);
  } else {
    const id = await nextUserId();
    company = await prisma.user.create({
      data: {
        id,
        name: companyData.name,
        email: companyData.email,
        password: passwordHash,
        type: "company",
        slug: companyData.slug,
        mobileNo: companyData.mobileNo,
        lang: "en",
        isActive: true,
        isEnableLogin: true,
        emailVerifiedAt: new Date(),
        activePlan: planIdNum,
        planExpireDate: trialEnds,
        creatorId: SUPERADMIN_ID,
        createdBy: SUPERADMIN_ID,
        createdAt: new Date(),
      },
      select: { id: true, email: true, slug: true },
    });
    console.log(`  Created company id ${company.id.toString()} (${companyData.slug})`);
  }

  await ensureCompanyRole(company.id);
  await seedCompanySettings(company.id);
  await ensureSubscriptionOrder(company.id, planId);

  console.log("\n[seed-social-greenhouse] ✓ Done.");
  console.log(`  Company:  ${companyData.name}`);
  console.log(`  Slug:     ${companyData.slug}`);
  console.log(`  Login:    ${companyData.email} / ${companyData.password}`);
  console.log(`  Site:     ${companyData.website}`);
  console.log(`  Fallback: ${companyData.publicSitePath ?? `/sites/${companyData.slug}`}`);
  console.log(`  Theme:    ${companyData.themeSlug}`);
  console.log(`  Plan:     ${companyData.planName} (LMS + Event Platform enabled)`);
  console.log(`  Events:   npm run db:seed:social-greenhouse:events`);
}

main()
  .catch((err) => {
    console.error("[seed-social-greenhouse] ERROR:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
