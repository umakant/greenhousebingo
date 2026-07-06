/* eslint-disable no-console */
/**
 * Production HRM schema repair (idempotent):
 *  1) hrm_employees columns incl. user_id (Prisma HrmEmployee)
 *  2) hrm_announcements, hrm_events, hrm_acknowledgments (dashboard / APIs)
 *
 * Fixes Prisma P2022 (missing column user_id) and P2021 (missing hrm_announcements).
 *
 *   DATABASE_URL="postgresql://..." node scripts/ensure-hrm-production-schema.js
 *   npm run db:ensure:hrm-production
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
    "20260421170000_hrm_employees_ensure_columns",
    "migration.sql",
  ),
  path.join(
    __dirname,
    "..",
    "prisma",
    "migrations",
    "20260421180000_hrm_announcements_events_acknowledgments",
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
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hrm_employees'`,
    );
    if (exists.rowCount === 0) {
      console.log("Table public.hrm_employees does not exist — run Prisma migrate / db push first.");
      return;
    }
    for (const f of MIGRATION_FILES) {
      const sql = fs.readFileSync(f, "utf8");
      await pg.query(sql);
      console.log("Applied:", path.basename(path.dirname(f)));
    }
    console.log("OK — HRM production schema repair complete.");
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
