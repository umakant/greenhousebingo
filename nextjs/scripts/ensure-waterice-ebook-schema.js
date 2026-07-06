/* eslint-disable no-console */
// Idempotently adds the Water Ice Express landing eBook metadata column to pos_products.
// Uses the Prisma client (same connection the app + seeders use) so it works
// consistently across local and production regardless of whether DATABASE_URL
// lives in .env, .env.local, or the system environment.

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({ log: ["error"] });

const STATEMENTS = [
  `ALTER TABLE pos_products ADD COLUMN IF NOT EXISTS ebook_meta JSONB NULL;`,
];

async function main() {
  console.log("Ensuring Water Ice Express eBook schema (pos_products.ebook_meta)...");
  for (const sql of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err) {
      // Tolerate limited-DDL production roles: surface a warning but do not fail the build.
      console.warn(`[ensure-waterice-ebook-schema] Skipped statement (continuing): ${err?.message ?? err}`);
    }
  }
  console.log("Done. pos_products.ebook_meta is present (or was skipped due to permissions).");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
