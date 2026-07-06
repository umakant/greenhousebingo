/* eslint-disable no-console */
/**
 * Ensures public.crm_leads has first_name / last_name and backfills `name` where NULL.
 * Applies prisma/migrations/20260421150000_* and 20260421160000_*.
 *
 * Use on production when Prisma errors: column crm_leads.first_name does not exist,
 * or: field "name" expected non-nullable String but found null.
 *
 * Run (local .env / .env.local):
 *   node scripts/ensure-crm-leads-columns.js
 *
 * Run against another DB (e.g. production):
 *   DATABASE_URL="postgresql://..." node scripts/ensure-crm-leads-columns.js
 */
const path = require("path");
const fs = require("fs");
const { Client } = require("pg");

require("dotenv").config({ path: path.join(__dirname, "..", "prisma", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const MIGRATION_FILES = [
  path.join(
    __dirname,
    "..",
    "prisma",
    "migrations",
    "20260421150000_crm_leads_ensure_first_last_name",
    "migration.sql",
  ),
  path.join(
    __dirname,
    "..",
    "prisma",
    "migrations",
    "20260421160000_crm_leads_backfill_name",
    "migration.sql",
  ),
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  for (const f of MIGRATION_FILES) {
    if (!fs.existsSync(f)) {
      console.error("Missing migration file:", f);
      process.exit(1);
    }
  }
  const pg = new Client({ connectionString });
  await pg.connect();
  try {
    const exists = await pg.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crm_leads'`,
    );
    if (exists.rowCount === 0) {
      console.log("Table public.crm_leads does not exist — create CRM tables first (Prisma migrate / push).");
      return;
    }
    for (const f of MIGRATION_FILES) {
      await pg.query(fs.readFileSync(f, "utf8"));
    }
    console.log(
      "OK — crm_leads columns repaired (20260421150000) and name backfilled where null (20260421160000).",
    );
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
