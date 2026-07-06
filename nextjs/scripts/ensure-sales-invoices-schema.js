/* eslint-disable no-console */
/**
 * Ensures sales_invoices + sales_invoice_items tables exist (idempotent).
 * Usage: node ./scripts/ensure-sales-invoices-schema.js
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { Client } = require("pg");

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS sales_invoices (
    id BIGSERIAL PRIMARY KEY,
    invoice_number VARCHAR(64) NOT NULL,
    short_code VARCHAR(12) NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NULL,
    customer_id BIGINT NOT NULL,
    project_id BIGINT NULL,
    project_name VARCHAR(512) NULL,
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    notes TEXT NULL,
    terms TEXT NULL,
    payment_token VARCHAR(64) NULL,
    proposal_id BIGINT NULL,
    creator_id BIGINT NULL,
    created_by BIGINT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NULL
  );`,
  `CREATE INDEX IF NOT EXISTS sales_invoices_customer_id ON sales_invoices(customer_id);`,
  `CREATE INDEX IF NOT EXISTS sales_invoices_status_date ON sales_invoices(status, invoice_date);`,
  `CREATE INDEX IF NOT EXISTS sales_invoices_created_by ON sales_invoices(created_by);`,
  `CREATE TABLE IF NOT EXISTS sales_invoice_items (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    tax_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    product_id BIGINT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NULL
  );`,
  `CREATE INDEX IF NOT EXISTS sales_invoice_items_invoice_id ON sales_invoice_items(invoice_id);`,
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    for (const sql of STATEMENTS) {
      await client.query(sql);
    }
    console.log("Sales invoices schema OK.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
