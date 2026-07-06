/* eslint-disable no-console */
// Idempotently creates the Water Ice Express membership-plans table.
// Uses the Prisma client (same connection the app + seeders use) so it works
// consistently across local and production regardless of whether DATABASE_URL
// lives in .env, .env.local, or the system environment.

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({ log: ["error"] });

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "waterice_memberships" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "billing_period" VARCHAR(32) NOT NULL DEFAULT 'month',
    "tagline" TEXT,
    "perks" JSONB,
    "badge" VARCHAR(64),
    "cta_label" VARCHAR(64),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "waterice_memberships_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "waterice_memberships_slug_key" ON "waterice_memberships"("slug");`,
  `CREATE INDEX IF NOT EXISTS "waterice_memberships_published_idx" ON "waterice_memberships"("published");`,
];

async function main() {
  console.log("Ensuring Water Ice Express membership schema (waterice_memberships)...");
  for (const sql of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err) {
      // Tolerate limited-DDL production roles: surface a warning but do not fail the build.
      console.warn(`[ensure-waterice-membership-schema] Skipped statement (continuing): ${err?.message ?? err}`);
    }
  }
  console.log("Done. waterice_memberships is present (or was skipped due to permissions).");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
