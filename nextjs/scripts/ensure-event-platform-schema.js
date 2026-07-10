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
      CREATE TABLE IF NOT EXISTS event_venues (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NULL,
        website TEXT NULL,
        address TEXT NULL,
        city TEXT NULL,
        state TEXT NULL,
        zip TEXT NULL,
        latitude DECIMAL(10, 7) NULL,
        longitude DECIMAL(10, 7) NULL,
        contact_first_name TEXT NULL,
        contact_last_name TEXT NULL,
        contact_phone TEXT NULL,
        contact_email TEXT NULL,
        seating INT NULL,
        age_21_plus BOOLEAN NOT NULL DEFAULT FALSE,
        drinks_alcohol BOOLEAN NOT NULL DEFAULT FALSE,
        food BOOLEAN NOT NULL DEFAULT FALSE,
        business_hours JSONB NULL,
        status TEXT NOT NULL DEFAULT 'active',
        archived_at TIMESTAMP(3) NULL,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE INDEX IF NOT EXISTS event_venues_org_status_idx ON event_venues(organization_id, status);`);
    await pg.query(`ALTER TABLE event_venues ADD COLUMN IF NOT EXISTS address_2 TEXT NULL;`);
    await pg.query(`ALTER TABLE event_venues ADD COLUMN IF NOT EXISTS category TEXT NULL;`);
    await pg.query(`ALTER TABLE event_venues ADD COLUMN IF NOT EXISTS venue_type TEXT NULL;`);
    await pg.query(`ALTER TABLE event_venues ADD COLUMN IF NOT EXISTS image_url TEXT NULL;`);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS event_venue_categories (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        name TEXT NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL,
        UNIQUE (organization_id, name)
      );
    `);
    await pg.query(`CREATE INDEX IF NOT EXISTS event_venue_categories_org_active_idx ON event_venue_categories(organization_id, is_active);`);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS event_venue_types (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        name TEXT NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL,
        UNIQUE (organization_id, name)
      );
    `);
    await pg.query(`CREATE INDEX IF NOT EXISTS event_venue_types_org_active_idx ON event_venue_types(organization_id, is_active);`);

    const DEFAULT_VENUE_CATEGORIES = [
      "Entertainment",
      "Food & Beverage",
      "Hospitality",
      "Outdoor",
      "Community",
      "Retail",
    ];
    const DEFAULT_VENUE_TYPES = [
      "Brewery",
      "Greenhouse",
      "Cidery",
      "Taproom",
      "Nursery",
      "Beer Hall",
      "Event Hall",
      "Lounge",
      "Restaurant",
      "Bar",
    ];

    const { rows: orgRows } = await pg.query(`
      SELECT DISTINCT organization_id AS id FROM event_venues
      UNION
      SELECT id FROM users WHERE LOWER(COALESCE(type, '')) IN ('company', 'company_admin')
    `);

    for (const { id } of orgRows) {
      for (let i = 0; i < DEFAULT_VENUE_CATEGORIES.length; i++) {
        await pg.query(
          `INSERT INTO event_venue_categories (organization_id, name, sort_order, is_active)
           VALUES ($1, $2, $3, TRUE)
           ON CONFLICT (organization_id, name) DO NOTHING`,
          [id, DEFAULT_VENUE_CATEGORIES[i], i],
        );
      }
      for (let i = 0; i < DEFAULT_VENUE_TYPES.length; i++) {
        await pg.query(
          `INSERT INTO event_venue_types (organization_id, name, sort_order, is_active)
           VALUES ($1, $2, $3, TRUE)
           ON CONFLICT (organization_id, name) DO NOTHING`,
          [id, DEFAULT_VENUE_TYPES[i], i],
        );
      }
    }
    if (orgRows.length > 0) {
      console.log(`  Seeded venue categories/types for ${orgRows.length} organization(s).`);
    }

    await pg.query(`
      CREATE TABLE IF NOT EXISTS event_hosts (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        display_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NULL,
        bio TEXT NULL,
        image_url TEXT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        linked_user_id BIGINT NULL,
        archived_at TIMESTAMP(3) NULL,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE INDEX IF NOT EXISTS event_hosts_org_status_idx ON event_hosts(organization_id, status);`);
    await pg.query(`CREATE INDEX IF NOT EXISTS event_hosts_org_email_idx ON event_hosts(organization_id, email);`);
    await pg.query(`ALTER TABLE event_hosts ADD COLUMN IF NOT EXISTS first_name TEXT NULL;`);
    await pg.query(`ALTER TABLE event_hosts ADD COLUMN IF NOT EXISTS last_name TEXT NULL;`);
    await pg.query(`
      UPDATE event_hosts
      SET
        first_name = COALESCE(NULLIF(TRIM(first_name), ''), SPLIT_PART(display_name, ' ', 1)),
        last_name = COALESCE(
          NULLIF(TRIM(last_name), ''),
          NULLIF(TRIM(SUBSTRING(display_name FROM POSITION(' ' IN display_name) + 1)), '')
        )
      WHERE COALESCE(TRIM(first_name), '') = ''
        AND COALESCE(TRIM(last_name), '') = ''
        AND COALESCE(TRIM(display_name), '') <> '';
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS event_host_invitations (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        host_id BIGINT NOT NULL REFERENCES event_hosts(id) ON DELETE CASCADE,
        event_id BIGINT NOT NULL,
        invite_token TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending',
        message TEXT NULL,
        invited_by_id BIGINT NULL,
        responded_at TIMESTAMP(3) NULL,
        expires_at TIMESTAMP(3) NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE INDEX IF NOT EXISTS event_host_invitations_org_status_idx ON event_host_invitations(organization_id, status);`);
    await pg.query(`CREATE INDEX IF NOT EXISTS event_host_invitations_host_event_idx ON event_host_invitations(host_id, event_id);`);
    await pg.query(`CREATE INDEX IF NOT EXISTS event_host_invitations_event_status_idx ON event_host_invitations(event_id, status);`);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS event_sponsors (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        name TEXT NOT NULL,
        address TEXT NULL,
        phone TEXT NULL,
        perk TEXT NULL,
        image_url TEXT NULL,
        website TEXT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        archived_at TIMESTAMP(3) NULL,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE INDEX IF NOT EXISTS event_sponsors_org_status_idx ON event_sponsors(organization_id, status);`);
    await pg.query(`ALTER TABLE event_sponsors ADD COLUMN IF NOT EXISTS first_name TEXT NULL;`);
    await pg.query(`ALTER TABLE event_sponsors ADD COLUMN IF NOT EXISTS last_name TEXT NULL;`);
    await pg.query(`ALTER TABLE event_sponsors ADD COLUMN IF NOT EXISTS company TEXT NULL;`);
    await pg.query(`
      UPDATE event_sponsors
      SET company = name
      WHERE COALESCE(TRIM(company), '') = ''
        AND COALESCE(TRIM(first_name), '') = ''
        AND COALESCE(TRIM(last_name), '') = ''
        AND COALESCE(TRIM(name), '') <> '';
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS event_bingo_games (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        name TEXT NOT NULL,
        pattern TEXT NOT NULL,
        difficulty TEXT NOT NULL DEFAULT 'Easy',
        prize TEXT NOT NULL,
        description TEXT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        archived_at TIMESTAMP(3) NULL,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE INDEX IF NOT EXISTS event_bingo_games_org_status_idx ON event_bingo_games(organization_id, status);`);
    await pg.query(`CREATE INDEX IF NOT EXISTS event_bingo_games_org_sort_idx ON event_bingo_games(organization_id, sort_order);`);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS event_bingo_faqs (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        archived_at TIMESTAMP(3) NULL,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE INDEX IF NOT EXISTS event_bingo_faqs_org_status_idx ON event_bingo_faqs(organization_id, status);`);
    await pg.query(`CREATE INDEX IF NOT EXISTS event_bingo_faqs_org_sort_idx ON event_bingo_faqs(organization_id, sort_order);`);

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
