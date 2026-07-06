/* eslint-disable no-console */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

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
  const pg = process.env.DATABASE_URL
    ? new Client({ connectionString: process.env.DATABASE_URL })
    : new Client(pgConfig());
  await pg.connect();

  try {
    console.log("Ensuring storefront_events schema...");

    await pg.query(`
      CREATE TABLE IF NOT EXISTS storefront_events (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        website_id BIGINT NULL,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        location TEXT NULL,
        venue TEXT NULL,
        event_date TIMESTAMP(3) NULL,
        end_date TIMESTAMP(3) NULL,
        image_url TEXT NULL,
        link_url TEXT NULL,
        description TEXT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_featured BOOLEAN NOT NULL DEFAULT false,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);

    await pg.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS storefront_events_org_slug_unique
        ON storefront_events(organization_id, slug);
    `);
    await pg.query(`
      CREATE INDEX IF NOT EXISTS storefront_events_org_status_date_idx
        ON storefront_events(organization_id, status, event_date);
    `);
    await pg.query(`
      CREATE INDEX IF NOT EXISTS storefront_events_org_website_idx
        ON storefront_events(organization_id, website_id);
    `);

    /**
     * Structured address columns (added 2026-05). The legacy `location` column is kept as a
     * single-line display label, auto-built from city/state when the form is submitted.
     */
    await pg.query(`
      ALTER TABLE storefront_events
        ADD COLUMN IF NOT EXISTS address_line TEXT NULL,
        ADD COLUMN IF NOT EXISTS city TEXT NULL,
        ADD COLUMN IF NOT EXISTS state TEXT NULL,
        ADD COLUMN IF NOT EXISTS postal_code TEXT NULL,
        ADD COLUMN IF NOT EXISTS country TEXT NULL,
        ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION NULL,
        ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION NULL;
    `);

    console.log("storefront_events schema is up to date.");
  } finally {
    await pg.end();
  }
}

main().catch((err) => {
  console.error("[ensure-storefront-events-schema] failed:", err);
  process.exit(1);
});
