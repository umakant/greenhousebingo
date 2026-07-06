/* eslint-disable no-console */
/**
 * Seed Affiliate Business demo data for company org 1000 (company@example.com).
 * Run: npm run db:seed:affiliate-demo
 */
const path = require("node:path");
const { execSync } = require("node:child_process");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();
const ORG_ID = process.env.AFFILIATE_SEED_ORG_ID ? BigInt(process.env.AFFILIATE_SEED_ORG_ID) : 1000n;

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  execSync("node ./scripts/ensure-affiliate-business-schema.js", {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });

  const existing = await prisma.affiliatePartner.count({ where: { organizationId: ORG_ID } });
  if (existing > 0) {
    console.log(`Org ${ORG_ID} already has ${existing} partner(s). Skipping.`);
    return;
  }

  const partners = await Promise.all(
    [
      ["Alex Rivera", "alex.rivera@affiliate-demo.com", "ALEX10", "gold", "active", 15, 1240, 86, 4280.5, 120],
      ["Jordan Kim", "jordan.kim@affiliate-demo.com", "JKIM20", "platinum", "active", 20, 2105, 142, 9120.75, 200],
      ["Sam Patel", "sam.patel@affiliate-demo.com", "SAM15", "silver", "active", 12, 890, 54, 2650, 90],
      ["Taylor Brooks", "taylor.b@affiliate-demo.com", "TBROOKS", "standard", "pending", 10, 45, 2, 120, 14],
      ["Morgan Lee", "morgan.lee@affiliate-demo.com", "MLEE25", "gold", "active", 15, 1560, 98, 5890.25, 160],
      ["Casey Nguyen", "casey.n@affiliate-demo.com", "CASEY5", "standard", "suspended", 8, 320, 12, 480, 300],
    ].map(([name, email, code, tier, status, rate, clicks, conv, earn, days]) =>
      prisma.affiliatePartner.create({
        data: {
          organizationId: ORG_ID,
          name,
          email,
          referralCode: code,
          tier,
          status,
          commissionRate: new Prisma.Decimal(rate),
          totalClicks: clicks,
          totalConversions: conv,
          lifetimeEarnings: new Prisma.Decimal(earn),
          joinedAt: daysAgo(days),
        },
      }),
    ),
  );

  const programs = await Promise.all(
    [
      ["SaaS Annual Plans", "20% on annual subscriptions.", "percentage", 20, 45, "active"],
      ["Starter Bundle", "Flat $25 per Starter signup.", "flat", 25, 30, "active"],
      ["LMS Course Sales", "15% on course purchases.", "percentage", 15, 60, "active"],
      ["Holiday Promo 2026", "Limited Q2 boost.", "percentage", 30, 14, "paused"],
    ].map(([name, desc, type, val, cookie, status]) =>
      prisma.affiliateProgram.create({
        data: {
          organizationId: ORG_ID,
          name,
          description: desc,
          commissionType: type,
          commissionValue: new Prisma.Decimal(val),
          cookieDays: cookie,
          status,
        },
      }),
    ),
  );

  const commissions = [
    [0, 0, "ORD-10041", "buyer1@example.com", 149.5, "approved", 2],
    [0, 2, "ORD-10038", "learner@example.com", 22.35, "pending", 5],
    [1, 0, "ORD-10035", "corp@acme.io", 890, "approved", 8],
    [1, 1, "ORD-10030", "trial@startup.co", 25, "paid", 12],
    [2, 2, "ORD-10028", "student@school.edu", 44.85, "approved", 15],
    [4, 0, "ORD-10022", "ops@bigco.com", 1200, "approved", 20],
    [4, 2, "ORD-10019", "dev@code.test", 67.5, "pending", 22],
    [1, 2, "ORD-10015", "pm@product.io", 89.1, "rejected", 25],
    [2, 1, "ORD-10012", "founder@saas.dev", 25, "paid", 30],
    [0, 1, "ORD-10008", "hello@mail.com", 25, "paid", 35],
    [4, 1, "ORD-10005", "team@agency.net", 25, "approved", 40],
    [5, 2, "ORD-10002", "old@client.com", 18, "rejected", 60],
  ];

  for (const [pi, pri, ref, email, amt, status, days] of commissions) {
    await prisma.affiliateCommission.create({
      data: {
        organizationId: ORG_ID,
        partnerId: partners[pi].id,
        programId: programs[pri].id,
        orderRef: ref,
        customerEmail: email,
        amount: new Prisma.Decimal(amt),
        status,
        earnedAt: daysAgo(days),
      },
    });
  }

  const payouts = [
    [1, 2500, "paid", "bank_transfer", 3, "PAY-2026-0412"],
    [0, 890.5, "processing", "paypal", 0, "PAY-2026-0418"],
    [4, 1200, "scheduled", "bank_transfer", -7, null],
    [2, 450, "paid", "bank_transfer", 10, "PAY-2026-0401"],
    [0, 320, "failed", "paypal", 5, "PAY-2026-0398"],
  ];

  for (const [pi, amt, status, method, days, ref] of payouts) {
    const scheduledAt = daysAgo(Math.max(0, days));
    await prisma.affiliatePayout.create({
      data: {
        organizationId: ORG_ID,
        partnerId: partners[pi].id,
        amount: new Prisma.Decimal(amt),
        status,
        method,
        scheduledAt,
        paidAt: status === "paid" ? scheduledAt : null,
        reference: ref,
      },
    });
  }

  await prisma.affiliateSettings.create({
    data: {
      organizationId: ORG_ID,
      defaultCommissionRate: new Prisma.Decimal(10),
      cookieWindowDays: 30,
      minimumPayout: new Prisma.Decimal(50),
      autoApproveCommissions: false,
      notificationEmail: "affiliates@paperflight.demo",
      currency: "USD",
    },
  });

  console.log(`Affiliate Business demo seeded for org ${ORG_ID}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
