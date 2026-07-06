/* eslint-disable no-console */
/**
 * Upserts the Storefront add-on row only (does not delete other add-ons).
 * Use when Storefront is missing from Add-ons Manager but you cannot run the full add-ons seed.
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", "prisma", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.addOn.upsert({
    where: { module: "Storefront" },
    create: {
      module: "Storefront",
      name: "Storefronts",
      monthlyPrice: new Prisma.Decimal(0),
      yearlyPrice: new Prisma.Decimal(0),
      image: null,
      isEnable: true,
      forAdmin: false,
      packageName: "storefront",
      priority: 75,
      createdAt: new Date(),
    },
    update: {
      name: "Storefronts",
      packageName: "storefront",
      forAdmin: false,
      priority: 75,
      updatedAt: new Date(),
    },
  });
  console.log("OK: add_ons row for module Storefront (Storefronts) is present.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
