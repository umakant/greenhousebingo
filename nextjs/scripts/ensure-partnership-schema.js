/* eslint-disable no-console */
// Idempotently creates the Partnership module tables/columns.
// Uses the Prisma client (same connection the app + seeders use) so it works
// consistently across local and production regardless of whether DATABASE_URL
// lives in .env, .env.local, or the system environment.

const path = require("path");
// Load both files (non-overriding) for parity with how Prisma resolves env.
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({ log: ["error"] });

const STATEMENTS = [
  // users referral columns
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_id BIGINT NULL;`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_source VARCHAR(255) NULL;`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_at TIMESTAMP NULL;`,
  `CREATE INDEX IF NOT EXISTS users_partner_id_idx ON users(partner_id);`,

  // partners
  `CREATE TABLE IF NOT EXISTS partners (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    phone VARCHAR(64) NULL,
    brand_name VARCHAR(255) NULL,
    slug VARCHAR(255) NOT NULL,
    referral_code VARCHAR(255) NOT NULL,
    commission_rate NUMERIC(5,2) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    payout_method VARCHAR(64) NULL,
    payout_email VARCHAR(255) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS partners_slug_key ON partners(slug);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS partners_referral_code_key ON partners(referral_code);`,
  `CREATE INDEX IF NOT EXISTS partners_user_id_idx ON partners(user_id);`,
  `CREATE INDEX IF NOT EXISTS partners_status_idx ON partners(status);`,
  `ALTER TABLE partners ADD COLUMN IF NOT EXISTS marketplace_commission_type VARCHAR(16) NULL;`,
  `ALTER TABLE partners ADD COLUMN IF NOT EXISTS marketplace_commission_value NUMERIC(10,2) NULL;`,

  // partner_referrals
  `CREATE TABLE IF NOT EXISTS partner_referrals (
    id BIGINT PRIMARY KEY,
    partner_id BIGINT NOT NULL,
    company_id BIGINT NULL,
    referral_code VARCHAR(255) NULL,
    partner_slug VARCHAR(255) NULL,
    source_url TEXT NULL,
    signup_date TIMESTAMP NULL,
    referral_status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE INDEX IF NOT EXISTS partner_referrals_partner_id_idx ON partner_referrals(partner_id);`,
  `CREATE INDEX IF NOT EXISTS partner_referrals_company_id_idx ON partner_referrals(company_id);`,

  // partner_commissions
  `CREATE TABLE IF NOT EXISTS partner_commissions (
    id BIGINT PRIMARY KEY,
    partner_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    subscription_id BIGINT NULL,
    invoice_id BIGINT NULL,
    order_ref VARCHAR(255) NULL,
    amount NUMERIC(10,2) NOT NULL,
    commission_rate NUMERIC(5,2) NOT NULL,
    commission_amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    payout_id BIGINT NULL,
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS partner_commissions_order_ref_key ON partner_commissions(order_ref);`,
  `CREATE INDEX IF NOT EXISTS partner_commissions_partner_id_idx ON partner_commissions(partner_id);`,
  `CREATE INDEX IF NOT EXISTS partner_commissions_company_id_idx ON partner_commissions(company_id);`,
  `CREATE INDEX IF NOT EXISTS partner_commissions_status_idx ON partner_commissions(status);`,
  `CREATE INDEX IF NOT EXISTS partner_commissions_payout_id_idx ON partner_commissions(payout_id);`,
  `ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS source_type VARCHAR(32) NOT NULL DEFAULT 'subscription';`,
  `ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS marketplace_order_id BIGINT NULL;`,
  `CREATE INDEX IF NOT EXISTS partner_commissions_source_type_idx ON partner_commissions(source_type);`,
  `CREATE INDEX IF NOT EXISTS partner_commissions_marketplace_order_id_idx ON partner_commissions(marketplace_order_id);`,

  // partner_payouts
  `CREATE TABLE IF NOT EXISTS partner_payouts (
    id BIGINT PRIMARY KEY,
    partner_id BIGINT NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    payout_method VARCHAR(64) NULL,
    payout_reference VARCHAR(255) NULL,
    notes TEXT NULL,
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE INDEX IF NOT EXISTS partner_payouts_partner_id_idx ON partner_payouts(partner_id);`,
  `CREATE INDEX IF NOT EXISTS partner_payouts_status_idx ON partner_payouts(status);`,

  // partner_landing_pages
  `CREATE TABLE IF NOT EXISTS partner_landing_pages (
    id BIGINT PRIMARY KEY,
    partner_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    headline VARCHAR(255) NULL,
    subheadline VARCHAR(255) NULL,
    industry_module VARCHAR(255) NULL,
    logo VARCHAR(255) NULL,
    description TEXT NULL,
    call_to_action_text VARCHAR(255) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS partner_landing_pages_partner_slug_key ON partner_landing_pages(partner_id, slug);`,
  `CREATE INDEX IF NOT EXISTS partner_landing_pages_partner_id_idx ON partner_landing_pages(partner_id);`,
];

async function main() {
  console.log("Ensuring Partnership module schema (via Prisma connection)...");
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("Done. Partnership tables/columns are present.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
