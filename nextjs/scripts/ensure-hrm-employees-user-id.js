/* eslint-disable no-console */
/**
 * Adds hrm_employees.user_id (portal user link) if the DB predates that Prisma field.
 * Run: node scripts/ensure-hrm-employees-user-id.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { Client } = require("pg");

function pgConfig() {
  const host =
    process.env.PF_PG_HOST || process.env.DATABASE_URL?.match(/@([^/:]+)/)?.[1] || "localhost";
  const port = Number(process.env.PF_PG_PORT || 5432);
  const database =
    process.env.PF_PG_DATABASE || process.env.DATABASE_URL?.match(/\/([^/?]+)(\?|$)/)?.[1] || "paper_flight";
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
    console.log("Ensuring hrm_employees.user_id exists...");
    await pg.query(`
      ALTER TABLE "hrm_employees"
      ADD COLUMN IF NOT EXISTS "user_id" BIGINT NULL;
    `);

    await pg.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'hrm_employees_user_id_fkey'
        ) THEN
          ALTER TABLE "hrm_employees"
            ADD CONSTRAINT "hrm_employees_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    await pg.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "hrm_employees_user_id_key" ON "hrm_employees" ("user_id");
    `);

    console.log("Done. hrm_employees.user_id is ready.");
  } finally {
    await pg.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
