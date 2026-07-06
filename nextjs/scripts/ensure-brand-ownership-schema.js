/* eslint-disable no-console */
// Idempotently creates Brand Ownership tables.
// Uses the Prisma client (same connection the app + seeders use) so it works
// consistently across local and production regardless of whether DATABASE_URL
// lives in .env, .env.local, or the system environment.

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ log: ["error"] });

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS ownership_brands (
    id BIGINT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    logo TEXT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ownership_brands_slug_key ON ownership_brands(slug);`,
  `CREATE INDEX IF NOT EXISTS ownership_brands_status_idx ON ownership_brands(status);`,
  `ALTER TABLE ownership_brands ADD COLUMN IF NOT EXISTS first_name VARCHAR(255) NULL;`,
  `ALTER TABLE ownership_brands ADD COLUMN IF NOT EXISTS last_name VARCHAR(255) NULL;`,

  `CREATE TABLE IF NOT EXISTS ownership_brand_holders (
    id BIGINT PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    partner_id BIGINT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(64) NULL,
    referral_code VARCHAR(255) NULL,
    current_ownership_percent NUMERIC(5,2) NOT NULL,
    minimum_ownership_percent NUMERIC(5,2) NOT NULL,
    is_primary_brand_holder BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    payout_method VARCHAR(64) NULL,
    payout_email VARCHAR(255) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE INDEX IF NOT EXISTS ownership_brand_holders_brand_id_idx ON ownership_brand_holders(brand_id);`,
  `CREATE INDEX IF NOT EXISTS ownership_brand_holders_partner_id_idx ON ownership_brand_holders(partner_id);`,
  `CREATE INDEX IF NOT EXISTS ownership_brand_holders_status_idx ON ownership_brand_holders(status);`,
  `ALTER TABLE ownership_brand_holders ADD COLUMN IF NOT EXISTS first_name VARCHAR(255) NULL;`,
  `ALTER TABLE ownership_brand_holders ADD COLUMN IF NOT EXISTS last_name VARCHAR(255) NULL;`,

  `CREATE TABLE IF NOT EXISTS ownership_brand_history (
    id BIGINT PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    holder_id BIGINT NULL,
    action VARCHAR(64) NOT NULL,
    old_current_ownership_percent NUMERIC(5,2) NULL,
    new_current_ownership_percent NUMERIC(5,2) NULL,
    old_minimum_ownership_percent NUMERIC(5,2) NULL,
    new_minimum_ownership_percent NUMERIC(5,2) NULL,
    changed_by_user_id BIGINT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS ownership_brand_history_brand_id_idx ON ownership_brand_history(brand_id);`,
  `CREATE INDEX IF NOT EXISTS ownership_brand_history_holder_id_idx ON ownership_brand_history(holder_id);`,
  `CREATE INDEX IF NOT EXISTS ownership_brand_history_created_at_idx ON ownership_brand_history(created_at);`,

  `CREATE TABLE IF NOT EXISTS ownership_brand_requests (
    id BIGINT PRIMARY KEY,
    brand_id BIGINT NOT NULL,
    partner_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(64) NULL,
    referral_code VARCHAR(255) NULL,
    requested_current_ownership NUMERIC(5,2) NOT NULL,
    requested_minimum_ownership NUMERIC(5,2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    conflict_detected BOOLEAN NOT NULL DEFAULT FALSE,
    conflict_message TEXT NULL,
    notes TEXT NULL,
    requested_by_user_id BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE INDEX IF NOT EXISTS ownership_brand_requests_brand_id_idx ON ownership_brand_requests(brand_id);`,
  `CREATE INDEX IF NOT EXISTS ownership_brand_requests_status_idx ON ownership_brand_requests(status);`,
  `ALTER TABLE ownership_brand_requests ADD COLUMN IF NOT EXISTS holder_id BIGINT NULL;`,
  `CREATE INDEX IF NOT EXISTS ownership_brand_requests_holder_id_idx ON ownership_brand_requests(holder_id);`,

  `CREATE TABLE IF NOT EXISTS ownership_partnership_agreements (
    id BIGINT PRIMARY KEY,
    holder_id BIGINT NOT NULL UNIQUE,
    sign_token VARCHAR(64) NOT NULL UNIQUE,
    brand_approval_token VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'pending_signature',
    signature_data TEXT NULL,
    signed_name VARCHAR(255) NULL,
    signed_at TIMESTAMP NULL,
    brand_approved_at TIMESTAMP NULL,
    brand_approved_by_user_id BIGINT NULL,
    brand_approved_by_name VARCHAR(255) NULL,
    brand_rejection_notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE INDEX IF NOT EXISTS ownership_partnership_agreements_status_idx ON ownership_partnership_agreements(status);`,
];

async function main() {
  console.log("Ensuring Brand Ownership schema (via Prisma connection)...");
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("Done. Brand Ownership tables are present.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
