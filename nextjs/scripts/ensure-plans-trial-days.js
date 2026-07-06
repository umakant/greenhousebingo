/* eslint-disable no-console */
/** Set trial = true and trial_days = 30 on all non-free subscription plans. Idempotent. */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ log: ["error"] });

const TRIAL_DAYS = 30;

async function main() {
  console.log(`Ensuring all paid plans use ${TRIAL_DAYS}-day trial...`);

  const result = await prisma.plan.updateMany({
    where: { freePlan: false },
    data: {
      trial: true,
      trialDays: TRIAL_DAYS,
      updatedAt: new Date(),
    },
  });

  console.log(`✓ Updated ${result.count} plan(s) to ${TRIAL_DAYS}-day trial`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
