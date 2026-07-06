/* eslint-disable no-console */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { Client } = require("pg");

function pgConfig() {
  const host = process.env.PF_PG_HOST || process.env.DATABASE_URL?.match(/@([^:]+)/)?.[1] || "localhost";
  const port = process.env.PF_PG_PORT || 5432;
  const database = process.env.PF_PG_DATABASE || process.env.DATABASE_URL?.match(/\/([^/?]+)/)?.[1] || "paper_flight";
  const user = process.env.PF_PG_USER || process.env.DATABASE_URL?.match(/:\/\/([^:]+):/)?.[1] || "postgres";
  const password = process.env.PF_PG_PASSWORD || process.env.DATABASE_URL?.match(/:([^@]+)@/)?.[1] || "";
  return { host, port, database, user, password };
}

async function main() {
  const pg = process.env.DATABASE_URL
    ? new Client({ connectionString: process.env.DATABASE_URL })
    : new Client(pgConfig());
  await pg.connect();

  try {
    console.log("Adding users.active_plan and users.plan_expire_date if missing...");
    await pg.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS active_plan INT NULL;`);
    await pg.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expire_date DATE NULL;`);
    console.log("Done.");
  } finally {
    await pg.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
