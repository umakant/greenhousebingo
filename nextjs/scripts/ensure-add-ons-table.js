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
  const pg = new Client(pgConfig());
  await pg.connect();
  try {
    console.log("Ensuring add_ons table exists...");
    await pg.query(`
      CREATE TABLE IF NOT EXISTS add_ons (
        id BIGSERIAL PRIMARY KEY,
        module TEXT NOT NULL,
        name TEXT NOT NULL,
        monthly_price NUMERIC(8,2) NOT NULL DEFAULT 0,
        yearly_price NUMERIC(8,2) NOT NULL DEFAULT 0,
        image TEXT NULL,
        is_enable BOOLEAN NOT NULL DEFAULT false,
        for_admin BOOLEAN NOT NULL DEFAULT false,
        package_name TEXT NOT NULL DEFAULT '',
        version TEXT NOT NULL DEFAULT '1.0.0',
        priority INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`ALTER TABLE add_ons ADD COLUMN IF NOT EXISTS version TEXT NOT NULL DEFAULT '1.0.0';`);
    await pg.query(`CREATE UNIQUE INDEX IF NOT EXISTS add_ons_module_unique ON add_ons(module);`);
    console.log("✓ add_ons ready");
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

