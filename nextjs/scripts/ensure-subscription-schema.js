/* eslint-disable no-console */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { Client } = require("pg");

function required(name, value) {
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

function pgConfig() {
  return {
    host: required("PF_PG_HOST", process.env.PF_PG_HOST),
    port: process.env.PF_PG_PORT ? Number(process.env.PF_PG_PORT) : 5432,
    database: required("PF_PG_DATABASE", process.env.PF_PG_DATABASE),
    user: required("PF_PG_USER", process.env.PF_PG_USER),
    password: required("PF_PG_PASSWORD", process.env.PF_PG_PASSWORD),
  };
}

async function main() {
  const pg = process.env.DATABASE_URL ? new Client({ connectionString: process.env.DATABASE_URL }) : new Client(pgConfig());
  await pg.connect();

  try {
    console.log("Ensuring subscription schema (orders/coupons/bank transfer)...");

    // Coupons
    await pg.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NULL,
        code TEXT NOT NULL,
        discount NUMERIC(10,2) NOT NULL DEFAULT 0,
        "limit" INT NULL,
        type TEXT NOT NULL DEFAULT 'percentage',
        minimum_spend NUMERIC(10,2) NULL,
        maximum_spend NUMERIC(10,2) NULL,
        limit_per_user INT NULL,
        expiry_date TIMESTAMP(3) NULL,
        included_module JSONB NULL,
        excluded_module JSONB NULL,
        status BOOLEAN NOT NULL DEFAULT true,
        created_by BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_unique ON coupons(code);`);
    await pg.query(`CREATE INDEX IF NOT EXISTS coupons_status_expiry_idx ON coupons(status, expiry_date);`);

    // User coupon usage records
    await pg.query(`
      CREATE TABLE IF NOT EXISTS user_coupons (
        id BIGSERIAL PRIMARY KEY,
        coupon_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        order_id TEXT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE INDEX IF NOT EXISTS user_coupons_coupon_user_idx ON user_coupons(coupon_id, user_id);`);

    // Bank transfer requests
    await pg.query(`
      CREATE TABLE IF NOT EXISTS bank_transfer_payments (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL,
        price NUMERIC(10,2) NULL,
        order_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        price_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        attachment TEXT NULL,
        request TEXT NULL,
        type TEXT NULL,
        created_by BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE UNIQUE INDEX IF NOT EXISTS bank_transfer_payments_order_id_unique ON bank_transfer_payments(order_id);`);
    await pg.query(`CREATE INDEX IF NOT EXISTS bank_transfer_payments_status_idx ON bank_transfer_payments(status);`);

    // Orders: keep existing minimal schema columns, add Laravel columns if missing.
    await pg.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_id TEXT NULL;`).catch(() => null);
    await pg.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS name TEXT NULL;`).catch(() => null);
    await pg.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS email TEXT NULL;`).catch(() => null);
    await pg.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS card_number TEXT NULL;`).catch(() => null);
    await pg.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS card_exp_month INT NULL;`).catch(() => null);
    await pg.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS card_exp_year INT NULL;`).catch(() => null);
    await pg.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS plan_name TEXT NULL;`).catch(() => null);
    await pg.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) NULL;`).catch(() => null);
    await pg.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;`).catch(() => null);
    await pg.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD';`).catch(() => null);
    await pg.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS txn_id TEXT NULL;`).catch(() => null);
    await pg.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT NULL;`).catch(() => null);
    await pg.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_type TEXT NULL;`).catch(() => null);
    await pg.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS receipt TEXT NULL;`).catch(() => null);
    await pg.query(`CREATE UNIQUE INDEX IF NOT EXISTS orders_order_id_unique ON orders(order_id) WHERE order_id IS NOT NULL;`).catch(() => null);

    console.log("✓ subscription schema ready");
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

