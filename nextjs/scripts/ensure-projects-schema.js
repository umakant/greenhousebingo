/* eslint-disable no-console */
/**
 * Ensures public.projects exists (Laravel/Taskly + Next.js Prisma parity).
 * Run: node scripts/ensure-projects-schema.js
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
    console.log("Ensuring projects table...");
    await pg.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NULL,
        budget DECIMAL(10, 2) NULL,
        start_date DATE NULL,
        end_date DATE NULL,
        status TEXT NULL DEFAULT 'Not Started',
        creator_id BIGINT NULL,
        created_by BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE INDEX IF NOT EXISTS projects_created_by_idx ON projects(created_by);`);
    await pg.query(`CREATE INDEX IF NOT EXISTS projects_creator_id_idx ON projects(creator_id);`);
    console.log("Done. projects table is ready.");
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
