/* eslint-disable no-console */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { Client } = require("pg");

async function main() {
  const pg = process.env.DATABASE_URL
    ? new Client({ connectionString: process.env.DATABASE_URL })
    : new Client({
        host: process.env.PF_PG_HOST,
        port: process.env.PF_PG_PORT ? Number(process.env.PF_PG_PORT) : 5432,
        database: process.env.PF_PG_DATABASE,
        user: process.env.PF_PG_USER,
        password: process.env.PF_PG_PASSWORD,
      });

  await pg.connect();
  try {
    console.log("Ensuring Affiliate Business schema…");

    await pg.query(`
      CREATE TABLE IF NOT EXISTS affiliate_partners (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NULL,
        referral_code VARCHAR(64) NOT NULL,
        tier VARCHAR(32) NOT NULL DEFAULT 'standard',
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10,
        total_clicks INT NOT NULL DEFAULT 0,
        total_conversions INT NOT NULL DEFAULT 0,
        lifetime_earnings DECIMAL(14,2) NOT NULL DEFAULT 0,
        joined_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS affiliate_partners_org_code_unique
      ON affiliate_partners(organization_id, referral_code);
    `);
    await pg.query(`
      CREATE INDEX IF NOT EXISTS affiliate_partners_org_status_idx
      ON affiliate_partners(organization_id, status);
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS affiliate_programs (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        commission_type VARCHAR(32) NOT NULL DEFAULT 'percentage',
        commission_value DECIMAL(10,2) NOT NULL,
        cookie_days INT NOT NULL DEFAULT 30,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`
      CREATE INDEX IF NOT EXISTS affiliate_programs_org_status_idx
      ON affiliate_programs(organization_id, status);
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS affiliate_commissions (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        partner_id BIGINT NOT NULL,
        program_id BIGINT NOT NULL,
        order_ref VARCHAR(128) NOT NULL,
        customer_email VARCHAR(255) NULL,
        amount DECIMAL(14,2) NOT NULL,
        currency VARCHAR(8) NOT NULL DEFAULT 'USD',
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        earned_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`
      CREATE INDEX IF NOT EXISTS affiliate_commissions_org_status_idx
      ON affiliate_commissions(organization_id, status);
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS affiliate_payouts (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        partner_id BIGINT NOT NULL,
        amount DECIMAL(14,2) NOT NULL,
        currency VARCHAR(8) NOT NULL DEFAULT 'USD',
        status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
        method VARCHAR(64) NOT NULL DEFAULT 'bank_transfer',
        scheduled_at TIMESTAMP(3) NOT NULL,
        paid_at TIMESTAMP(3) NULL,
        reference VARCHAR(128) NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`
      CREATE INDEX IF NOT EXISTS affiliate_payouts_org_status_idx
      ON affiliate_payouts(organization_id, status);
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS affiliate_links (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        partner_id BIGINT NOT NULL,
        program_id BIGINT NOT NULL,
        label VARCHAR(255) NULL,
        destination_url VARCHAR(2048) NULL,
        slug VARCHAR(64) NOT NULL,
        tracking_url VARCHAR(2048) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        click_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS affiliate_links_org_slug_unique
      ON affiliate_links(organization_id, slug);
    `);
    await pg.query(`
      CREATE INDEX IF NOT EXISTS affiliate_links_org_status_idx
      ON affiliate_links(organization_id, status);
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS affiliate_settings (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL UNIQUE,
        default_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10,
        cookie_window_days INT NOT NULL DEFAULT 30,
        minimum_payout DECIMAL(14,2) NOT NULL DEFAULT 50,
        auto_approve_commissions BOOLEAN NOT NULL DEFAULT false,
        notification_email VARCHAR(255) NULL,
        currency VARCHAR(8) NOT NULL DEFAULT 'USD',
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`
      ALTER TABLE affiliate_settings
      ADD COLUMN IF NOT EXISTS default_landing_url VARCHAR(2048) NULL;
    `);

    console.log("Affiliate Business schema OK.");
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
