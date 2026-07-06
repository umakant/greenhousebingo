/* eslint-disable no-console */
/**
 * Ensures public.currencies exists (for app-settings currency symbol lookup).
 * Run: node scripts/ensure-currencies-schema.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { Client } = require("pg");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set in .env.local");
    process.exit(1);
  }
  const pg = new Client({ connectionString });
  await pg.connect();
  try {
    console.log("Ensuring currencies table...");
    await pg.query(`
      CREATE TABLE IF NOT EXISTS currencies (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        code VARCHAR(10) NOT NULL UNIQUE,
        symbol VARCHAR(20) NULL,
        description TEXT NULL,
        is_default BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    console.log("Done. currencies table is ready.");
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
