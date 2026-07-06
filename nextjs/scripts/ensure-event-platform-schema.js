/* eslint-disable no-console */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { Client } = require("pg");

function pgClient() {
  if (process.env.DATABASE_URL) return new Client({ connectionString: process.env.DATABASE_URL });
  const required = (name) => {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var ${name}`);
    return v;
  };
  return new Client({
    host: required("PF_PG_HOST"),
    port: process.env.PF_PG_PORT ? Number(process.env.PF_PG_PORT) : 5432,
    database: required("PF_PG_DATABASE"),
    user: required("PF_PG_USER"),
    password: required("PF_PG_PASSWORD"),
  });
}

async function main() {
  const pg = pgClient();
  await pg.connect();
  try {
    console.log("Ensuring Event Platform schema...");

    await pg.query(`
      CREATE TABLE IF NOT EXISTS event_vendors (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        vendor_name TEXT NOT NULL,
        company_name TEXT NULL,
        contact_name TEXT NULL,
        email TEXT NULL,
        phone TEXT NULL,
        website TEXT NULL,
        business_type TEXT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        default_commission_rate DECIMAL(5,2) NULL,
        override_commission_rate DECIMAL(5,2) NULL,
        payout_method TEXT NULL,
        tax_id TEXT NULL,
        address_line1 TEXT NULL,
        address_line2 TEXT NULL,
        city TEXT NULL,
        state TEXT NULL,
        postal_code TEXT NULL,
        country TEXT NULL,
        notes TEXT NULL,
        linked_user_id BIGINT NULL,
        archived_at TIMESTAMP(3) NULL,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE INDEX IF NOT EXISTS event_vendors_org_status_idx ON event_vendors(organization_id, status);`);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS event_vendor_commission_rules (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        vendor_id BIGINT NULL REFERENCES event_vendors(id) ON DELETE CASCADE,
        event_id BIGINT NULL,
        commission_rate DECIMAL(5,2) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS event_vendor_payouts (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        vendor_id BIGINT NOT NULL REFERENCES event_vendors(id) ON DELETE CASCADE,
        batch_ref TEXT NULL,
        total_amount DECIMAL(14,2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL DEFAULT 'pending',
        paid_at TIMESTAMP(3) NULL,
        notes TEXT NULL,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS event_commission_ledger (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        vendor_id BIGINT NOT NULL REFERENCES event_vendors(id) ON DELETE CASCADE,
        event_id BIGINT NULL,
        registration_id BIGINT NULL,
        transaction_id BIGINT NULL,
        gross_amount DECIMAL(14,2) NOT NULL,
        platform_commission DECIMAL(14,2) NOT NULL,
        vendor_net DECIMAL(14,2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL DEFAULT 'pending',
        payout_id BIGINT NULL,
        paid_at TIMESTAMP(3) NULL,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);

    await pg.query(`
      DO $$ BEGIN
        ALTER TABLE event_commission_ledger
          ADD CONSTRAINT event_commission_ledger_payout_fk
          FOREIGN KEY (payout_id) REFERENCES event_vendor_payouts(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS event_vendor_payout_items (
        id BIGSERIAL PRIMARY KEY,
        payout_id BIGINT NOT NULL REFERENCES event_vendor_payouts(id) ON DELETE CASCADE,
        ledger_id BIGINT NOT NULL,
        amount DECIMAL(14,2) NOT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(payout_id, ledger_id)
      );
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS event_seatmap_templates (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NULL,
        layout_json JSONB NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'active',
        archived_at TIMESTAMP(3) NULL,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS event_custom_pages (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        title TEXT NOT NULL,
        slug TEXT NOT NULL,
        content_html TEXT NULL,
        seo_title TEXT NULL,
        seo_description TEXT NULL,
        featured_image TEXT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        visibility TEXT NOT NULL DEFAULT 'public',
        published_at TIMESTAMP(3) NULL,
        archived_at TIMESTAMP(3) NULL,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL,
        UNIQUE(organization_id, slug)
      );
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS event_menus (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS event_menu_items (
        id BIGSERIAL PRIMARY KEY,
        menu_id BIGINT NOT NULL REFERENCES event_menus(id) ON DELETE CASCADE,
        parent_id BIGINT NULL,
        label TEXT NOT NULL,
        item_type TEXT NOT NULL DEFAULT 'url',
        page_id BIGINT NULL,
        url TEXT NULL,
        target TEXT NOT NULL DEFAULT '_self',
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS event_announcement_popups (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        title TEXT NOT NULL,
        popup_type TEXT NOT NULL,
        content_html TEXT NULL,
        media_url TEXT NULL,
        button_text TEXT NULL,
        button_url TEXT NULL,
        is_active BOOLEAN NOT NULL DEFAULT FALSE,
        priority_order INTEGER NOT NULL DEFAULT 0,
        starts_at TIMESTAMP(3) NULL,
        ends_at TIMESTAMP(3) NULL,
        display_location TEXT NOT NULL DEFAULT 'all',
        frequency TEXT NOT NULL DEFAULT 'once_per_session',
        audience TEXT NOT NULL DEFAULT 'all',
        archived_at TIMESTAMP(3) NULL,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS event_audit_logs (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        actor_user_id BIGINT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NULL,
        metadata_json JSONB NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Event Platform schema ensured.");
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
