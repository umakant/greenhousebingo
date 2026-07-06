/* eslint-disable no-console */
// Idempotently creates the Marketplace module tables.
// Uses the Prisma client (same connection the app + seeders use) so it works
// consistently across local and production regardless of whether DATABASE_URL
// lives in .env, .env.local, or the system environment.
//
// All statements only CREATE marketplace_* tables/indexes (no DDL on legacy
// tables), so the app DB user can run them without owner privileges.

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({ log: ["error"] });

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS marketplace_vendors (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NULL,
    phone VARCHAR(64) NULL,
    description TEXT NULL,
    logo_url VARCHAR(2048) NULL,
    commission_rate NUMERIC(5,2) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS marketplace_vendors_slug_key ON marketplace_vendors(slug);`,
  `CREATE INDEX IF NOT EXISTS marketplace_vendors_status_idx ON marketplace_vendors(status);`,

  `CREATE TABLE IF NOT EXISTS marketplace_products (
    id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    sku VARCHAR(128) NULL,
    description TEXT NULL,
    price NUMERIC(14,2) NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    image_url VARCHAR(2048) NULL,
    category VARCHAR(128) NULL,
    stock INTEGER NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS marketplace_products_slug_key ON marketplace_products(slug);`,
  `CREATE INDEX IF NOT EXISTS marketplace_products_vendor_id_idx ON marketplace_products(vendor_id);`,
  `CREATE INDEX IF NOT EXISTS marketplace_products_status_idx ON marketplace_products(status);`,
  `CREATE INDEX IF NOT EXISTS marketplace_products_category_idx ON marketplace_products(category);`,

  `CREATE TABLE IF NOT EXISTS marketplace_orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(64) NOT NULL,
    buyer_organization_id BIGINT NOT NULL,
    placed_by_user_id BIGINT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    payment_status VARCHAR(32) NOT NULL DEFAULT 'unpaid',
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
    total NUMERIC(14,2) NOT NULL DEFAULT 0,
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS marketplace_orders_order_number_key ON marketplace_orders(order_number);`,
  `CREATE INDEX IF NOT EXISTS marketplace_orders_buyer_organization_id_idx ON marketplace_orders(buyer_organization_id);`,
  `CREATE INDEX IF NOT EXISTS marketplace_orders_status_idx ON marketplace_orders(status);`,
  `CREATE INDEX IF NOT EXISTS marketplace_orders_payment_status_idx ON marketplace_orders(payment_status);`,

  `CREATE TABLE IF NOT EXISTS marketplace_order_lines (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NULL,
    vendor_id BIGINT NULL,
    title VARCHAR(255) NOT NULL,
    unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1,
    line_total NUMERIC(14,2) NOT NULL DEFAULT 0
  );`,
  `CREATE INDEX IF NOT EXISTS marketplace_order_lines_order_id_idx ON marketplace_order_lines(order_id);`,
  `CREATE INDEX IF NOT EXISTS marketplace_order_lines_product_id_idx ON marketplace_order_lines(product_id);`,
  `CREATE INDEX IF NOT EXISTS marketplace_order_lines_vendor_id_idx ON marketplace_order_lines(vendor_id);`,

  `CREATE TABLE IF NOT EXISTS marketplace_delivery_queues (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    region VARCHAR(128) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE INDEX IF NOT EXISTS marketplace_delivery_queues_status_idx ON marketplace_delivery_queues(status);`,

  `CREATE TABLE IF NOT EXISTS marketplace_deliveries (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    queue_id BIGINT NULL,
    buyer_organization_id BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'queued',
    assigned_to VARCHAR(255) NULL,
    address_line VARCHAR(255) NULL,
    city VARCHAR(128) NULL,
    state VARCHAR(128) NULL,
    postal_code VARCHAR(32) NULL,
    country VARCHAR(128) NULL,
    scheduled_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE INDEX IF NOT EXISTS marketplace_deliveries_order_id_idx ON marketplace_deliveries(order_id);`,
  `CREATE INDEX IF NOT EXISTS marketplace_deliveries_queue_id_idx ON marketplace_deliveries(queue_id);`,
  `CREATE INDEX IF NOT EXISTS marketplace_deliveries_buyer_organization_id_idx ON marketplace_deliveries(buyer_organization_id);`,
  `CREATE INDEX IF NOT EXISTS marketplace_deliveries_status_idx ON marketplace_deliveries(status);`,

  `CREATE TABLE IF NOT EXISTS marketplace_delivery_events (
    id BIGSERIAL PRIMARY KEY,
    delivery_id BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL,
    note TEXT NULL,
    created_by_user_id BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS marketplace_delivery_events_delivery_id_idx ON marketplace_delivery_events(delivery_id);`,

  `CREATE TABLE IF NOT EXISTS marketplace_config (
    id BIGSERIAL PRIMARY KEY,
    key VARCHAR(128) NOT NULL,
    value TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS marketplace_config_key_key ON marketplace_config(key);`,
];

async function main() {
  console.log("Ensuring Marketplace module schema (via Prisma connection)...");
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("Done. Marketplace tables are present.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
