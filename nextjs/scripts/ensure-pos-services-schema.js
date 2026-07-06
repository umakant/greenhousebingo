/* eslint-disable no-console */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { Client } = require("pg");

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS pos_services (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    code VARCHAR(64) NULL,
    rate DECIMAL(15,4) NOT NULL DEFAULT 0,
    unit_id BIGINT NULL,
    tax_id BIGINT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    organization_id BIGINT NULL,
    created_by BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE INDEX IF NOT EXISTS pos_services_organization_id_idx ON pos_services (organization_id);`,
  `CREATE INDEX IF NOT EXISTS pos_services_unit_id_idx ON pos_services (unit_id);`,
  `CREATE INDEX IF NOT EXISTS pos_services_tax_id_idx ON pos_services (tax_id);`,
  `ALTER TABLE sales_proposal_items ADD COLUMN IF NOT EXISTS service_id BIGINT NULL;`,
  `ALTER TABLE sales_proposal_template_items ADD COLUMN IF NOT EXISTS service_id BIGINT NULL;`,
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
      try {
        await client.query(sql);
      } catch (e) {
        if (!String(e.message).includes("does not exist")) throw e;
      }
    }
    console.log("POS services schema OK.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
