/* eslint-disable no-console */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { Client } = require("pg");

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS sales_proposal_templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    calculate_tax VARCHAR(32) NULL,
    require_signature BOOLEAN NOT NULL DEFAULT true,
    payment_terms TEXT NULL,
    notes TEXT NULL,
    discount_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_type VARCHAR(16) NOT NULL DEFAULT 'fixed',
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    creator_id BIGINT NULL,
    created_by BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE INDEX IF NOT EXISTS sales_proposal_templates_created_by_idx ON sales_proposal_templates (created_by);`,
  `CREATE TABLE IF NOT EXISTS sales_proposal_template_items (
    id BIGSERIAL PRIMARY KEY,
    template_id BIGINT NOT NULL REFERENCES sales_proposal_templates(id) ON DELETE CASCADE,
    product_id BIGINT NULL,
    description TEXT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    tax_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE INDEX IF NOT EXISTS sales_proposal_template_items_template_id_idx ON sales_proposal_template_items (template_id);`,
  `CREATE INDEX IF NOT EXISTS sales_proposal_template_items_product_id_idx ON sales_proposal_template_items (product_id);`,
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
    console.log("Sales proposal templates schema OK.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
