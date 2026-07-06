/* eslint-disable no-console */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { Client } = require("pg");

const STATEMENTS = [
  `ALTER TABLE sales_proposals ADD COLUMN IF NOT EXISTS lead_id BIGINT NULL;`,
  `ALTER TABLE sales_proposals ADD COLUMN IF NOT EXISTS deal_id BIGINT NULL;`,
  `ALTER TABLE sales_proposals ADD COLUMN IF NOT EXISTS currency VARCHAR(8) NOT NULL DEFAULT 'USD';`,
  `ALTER TABLE sales_proposals ADD COLUMN IF NOT EXISTS calculate_tax VARCHAR(32) NULL;`,
  `ALTER TABLE sales_proposals ADD COLUMN IF NOT EXISTS description TEXT NULL;`,
  `ALTER TABLE sales_proposals ADD COLUMN IF NOT EXISTS require_signature BOOLEAN NOT NULL DEFAULT true;`,
  `ALTER TABLE sales_proposals ADD COLUMN IF NOT EXISTS project_id BIGINT NULL;`,
  `ALTER TABLE sales_proposals ADD COLUMN IF NOT EXISTS project_name VARCHAR(255) NULL;`,
  `ALTER TABLE sales_proposal_items ADD COLUMN IF NOT EXISTS description TEXT NULL;`,
  `ALTER TABLE sales_proposal_items ALTER COLUMN product_id DROP NOT NULL;`,
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
    console.log("Sales proposals schema OK.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
