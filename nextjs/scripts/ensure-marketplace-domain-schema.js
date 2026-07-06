/* eslint-disable no-console */
// Idempotently extends the Marketplace module with the water-ice wholesale domain
// schema: new columns on existing marketplace_* tables + new domain tables
// (categories, company links, order items, delivery city queues, delivery events,
// delivery event orders).
//
// Strictly additive: only CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS,
// and CREATE INDEX IF NOT EXISTS. No existing columns/tables are dropped or altered
// in a breaking way, so this is safe to run repeatedly on local and production.

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({ log: ["error"] });

const STATEMENTS = [
  // --- Additive columns on existing marketplace_vendors ---
  `ALTER TABLE marketplace_vendors ADD COLUMN IF NOT EXISTS logo VARCHAR(2048) NULL;`,
  `ALTER TABLE marketplace_vendors ADD COLUMN IF NOT EXISTS banner_image VARCHAR(2048) NULL;`,

  // --- Additive columns on existing marketplace_products ---
  `ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS category_id BIGINT NULL;`,
  `ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS image VARCHAR(2048) NULL;`,
  `ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS bucket_count_value INTEGER NULL;`,
  `ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS inventory_count INTEGER NULL;`,
  `ALTER TABLE marketplace_products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;`,
  `CREATE INDEX IF NOT EXISTS marketplace_products_category_id_idx ON marketplace_products(category_id);`,

  // --- Additive columns on existing marketplace_orders ---
  `ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS company_id BIGINT NULL;`,
  `ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS vendor_id BIGINT NULL;`,
  `ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS order_status VARCHAR(32) NULL;`,
  `ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(32) NULL;`,
  `ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS city VARCHAR(128) NULL;`,
  `ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS state VARCHAR(128) NULL;`,
  `ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS total_bucket_count INTEGER NULL;`,
  `ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS tax NUMERIC(14,2) NULL;`,
  `ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(14,2) NULL;`,
  `ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14,2) NULL;`,
  `ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255) NULL;`,
  `ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS partner_id BIGINT NULL;`,
  `ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS referral_source VARCHAR(255) NULL;`,
  // Accounting links populated when an order is paid (revenues / customer_payments rows).
  `ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS accounting_revenue_id BIGINT NULL;`,
  `ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS accounting_customer_payment_id BIGINT NULL;`,
  `CREATE UNIQUE INDEX IF NOT EXISTS marketplace_orders_accounting_revenue_id_key ON marketplace_orders(accounting_revenue_id);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS marketplace_orders_accounting_customer_payment_id_key ON marketplace_orders(accounting_customer_payment_id);`,
  `CREATE INDEX IF NOT EXISTS marketplace_orders_company_id_idx ON marketplace_orders(company_id);`,
  `CREATE INDEX IF NOT EXISTS marketplace_orders_vendor_id_idx ON marketplace_orders(vendor_id);`,
  `CREATE INDEX IF NOT EXISTS marketplace_orders_partner_id_idx ON marketplace_orders(partner_id);`,

  // --- marketplace_categories ---
  `CREATE TABLE IF NOT EXISTS marketplace_categories (
    id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS marketplace_categories_vendor_id_slug_key ON marketplace_categories(vendor_id, slug);`,
  `CREATE INDEX IF NOT EXISTS marketplace_categories_vendor_id_idx ON marketplace_categories(vendor_id);`,
  `CREATE INDEX IF NOT EXISTS marketplace_categories_is_active_idx ON marketplace_categories(is_active);`,

  // --- company_marketplace_links ---
  `CREATE TABLE IF NOT EXISTS company_marketplace_links (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL,
    vendor_id BIGINT NOT NULL,
    custom_slug VARCHAR(255) NULL,
    link_url VARCHAR(2048) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE INDEX IF NOT EXISTS company_marketplace_links_company_id_idx ON company_marketplace_links(company_id);`,
  `CREATE INDEX IF NOT EXISTS company_marketplace_links_vendor_id_idx ON company_marketplace_links(vendor_id);`,

  // --- marketplace_order_items ---
  `CREATE TABLE IF NOT EXISTS marketplace_order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_price NUMERIC(14,2) NOT NULL DEFAULT 0,
    bucket_count_value INTEGER NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS marketplace_order_items_order_id_idx ON marketplace_order_items(order_id);`,
  `CREATE INDEX IF NOT EXISTS marketplace_order_items_product_id_idx ON marketplace_order_items(product_id);`,

  // --- delivery_city_queues ---
  `CREATE TABLE IF NOT EXISTS delivery_city_queues (
    id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL,
    city VARCHAR(128) NOT NULL,
    state VARCHAR(128) NOT NULL,
    required_bucket_minimum INTEGER NOT NULL DEFAULT 50,
    current_bucket_total INTEGER NOT NULL DEFAULT 0,
    company_count INTEGER NOT NULL DEFAULT 0,
    queue_status VARCHAR(32) NOT NULL DEFAULT 'waiting',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS delivery_city_queues_vendor_id_city_state_key ON delivery_city_queues(vendor_id, city, state);`,
  `CREATE INDEX IF NOT EXISTS delivery_city_queues_vendor_id_idx ON delivery_city_queues(vendor_id);`,
  `CREATE INDEX IF NOT EXISTS delivery_city_queues_queue_status_idx ON delivery_city_queues(queue_status);`,

  // --- delivery_events ---
  `CREATE TABLE IF NOT EXISTS delivery_events (
    id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL,
    city_queue_id BIGINT NULL,
    city VARCHAR(128) NOT NULL,
    state VARCHAR(128) NOT NULL,
    delivery_date TIMESTAMP NULL,
    start_time VARCHAR(32) NULL,
    end_time VARCHAR(32) NULL,
    delivery_address VARCHAR(512) NULL,
    delivery_notes TEXT NULL,
    driver_name VARCHAR(255) NULL,
    driver_phone VARCHAR(64) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE INDEX IF NOT EXISTS delivery_events_vendor_id_idx ON delivery_events(vendor_id);`,
  `CREATE INDEX IF NOT EXISTS delivery_events_city_queue_id_idx ON delivery_events(city_queue_id);`,
  `CREATE INDEX IF NOT EXISTS delivery_events_status_idx ON delivery_events(status);`,

  // --- delivery_event_orders ---
  `CREATE TABLE IF NOT EXISTS delivery_event_orders (
    id BIGSERIAL PRIMARY KEY,
    delivery_event_id BIGINT NOT NULL,
    order_id BIGINT NOT NULL,
    company_id BIGINT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS delivery_event_orders_delivery_event_id_idx ON delivery_event_orders(delivery_event_id);`,
  `CREATE INDEX IF NOT EXISTS delivery_event_orders_order_id_idx ON delivery_event_orders(order_id);`,
  `CREATE INDEX IF NOT EXISTS delivery_event_orders_company_id_idx ON delivery_event_orders(company_id);`,
];

async function main() {
  console.log("Ensuring Marketplace domain schema (categories, links, order items, delivery queues/events)...");
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("Done. Marketplace domain tables/columns are present.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
