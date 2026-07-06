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
    console.log("Ensuring LMS events schema...");

    await pg.query(`
      CREATE TABLE IF NOT EXISTS lms_event_categories (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NULL,
        status TEXT NOT NULL DEFAULT 'published',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS lms_event_categories_org_slug_unique
        ON lms_event_categories(organization_id, slug);
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS lms_events (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NULL,
        short_description TEXT NULL,
        image_url TEXT NULL,
        category_id BIGINT NULL REFERENCES lms_event_categories(id) ON DELETE SET NULL,
        event_type TEXT NOT NULL,
        delivery_mode TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        instructor_name TEXT NULL,
        instructor_user_id BIGINT NULL,
        starts_at TIMESTAMP(3) NOT NULL,
        ends_at TIMESTAMP(3) NOT NULL,
        timezone TEXT NOT NULL DEFAULT 'America/New_York',
        venue_name TEXT NULL,
        venue_address TEXT NULL,
        venue_city TEXT NULL,
        venue_state TEXT NULL,
        venue_postal_code TEXT NULL,
        venue_country TEXT NULL,
        venue_lat DOUBLE PRECISION NULL,
        venue_lng DOUBLE PRECISION NULL,
        online_meeting_url TEXT NULL,
        capacity INTEGER NULL,
        registered_count INTEGER NOT NULL DEFAULT 0,
        is_public BOOLEAN NOT NULL DEFAULT true,
        is_free BOOLEAN NOT NULL DEFAULT false,
        price_from DECIMAL(12,2) NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        certification_available BOOLEAN NOT NULL DEFAULT false,
        certification_name TEXT NULL,
        requirements TEXT NULL,
        cancellation_policy TEXT NULL,
        linked_course_id BIGINT NULL,
        linked_live_session_id BIGINT NULL,
        revenue_total DECIMAL(14,2) NOT NULL DEFAULT 0,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS lms_events_org_slug_unique
        ON lms_events(organization_id, slug);
    `);
    await pg.query(`
      CREATE INDEX IF NOT EXISTS lms_events_org_status_starts_idx
        ON lms_events(organization_id, status, starts_at);
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS lms_event_tickets (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        event_id BIGINT NOT NULL REFERENCES lms_events(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT NULL,
        price DECIMAL(12,2) NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'USD',
        quantity INTEGER NULL,
        sold_count INTEGER NOT NULL DEFAULT 0,
        sale_starts_at TIMESTAMP(3) NULL,
        sale_ends_at TIMESTAMP(3) NULL,
        ticket_status TEXT NOT NULL DEFAULT 'available',
        is_free BOOLEAN NOT NULL DEFAULT false,
        access_rules TEXT NULL,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE INDEX IF NOT EXISTS lms_event_tickets_event_idx ON lms_event_tickets(event_id);`);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS lms_event_registrations (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        event_id BIGINT NOT NULL REFERENCES lms_events(id) ON DELETE CASCADE,
        ticket_id BIGINT NULL REFERENCES lms_event_tickets(id) ON DELETE SET NULL,
        student_user_id BIGINT NOT NULL,
        booking_status TEXT NOT NULL DEFAULT 'pending',
        attendee_name TEXT NOT NULL,
        attendee_email TEXT NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'unpaid',
        amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'USD',
        registered_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        checked_in_at TIMESTAMP(3) NULL,
        qr_token TEXT NOT NULL,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS lms_event_registrations_event_student_unique
        ON lms_event_registrations(event_id, student_user_id);
    `);
    await pg.query(`CREATE INDEX IF NOT EXISTS lms_event_registrations_org_student_idx ON lms_event_registrations(organization_id, student_user_id);`);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS lms_event_certificates (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        event_id BIGINT NOT NULL REFERENCES lms_events(id) ON DELETE CASCADE,
        registration_id BIGINT NOT NULL REFERENCES lms_event_registrations(id) ON DELETE CASCADE,
        student_user_id BIGINT NOT NULL,
        student_name TEXT NOT NULL,
        event_title TEXT NOT NULL,
        certificate_status TEXT NOT NULL DEFAULT 'not_eligible',
        issued_at TIMESTAMP(3) NULL,
        expires_at TIMESTAMP(3) NULL,
        renewal_required BOOLEAN NOT NULL DEFAULT false,
        template_id TEXT NULL,
        download_url TEXT NULL,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS lms_event_transactions (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        event_id BIGINT NOT NULL REFERENCES lms_events(id) ON DELETE CASCADE,
        registration_id BIGINT NOT NULL REFERENCES lms_event_registrations(id) ON DELETE CASCADE,
        attendee_name TEXT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        method TEXT NOT NULL DEFAULT 'card',
        status TEXT NOT NULL DEFAULT 'completed',
        processed_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS lms_event_support_tickets (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        event_id BIGINT NULL REFERENCES lms_events(id) ON DELETE SET NULL,
        registration_id BIGINT NULL REFERENCES lms_event_registrations(id) ON DELETE SET NULL,
        student_user_id BIGINT NOT NULL,
        subject TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        priority TEXT NOT NULL DEFAULT 'normal',
        last_reply_at TIMESTAMP(3) NULL,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS lms_event_notifications (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        event_id BIGINT NULL REFERENCES lms_events(id) ON DELETE SET NULL,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        read_at TIMESTAMP(3) NULL,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE INDEX IF NOT EXISTS lms_event_notifications_user_idx ON lms_event_notifications(organization_id, user_id);`);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS lms_event_wishlist (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        event_id BIGINT NOT NULL REFERENCES lms_events(id) ON DELETE CASCADE,
        student_user_id BIGINT NOT NULL,
        created_by_id BIGINT NULL,
        updated_by_id BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS lms_event_wishlist_unique
        ON lms_event_wishlist(organization_id, event_id, student_user_id);
    `);

    console.log("LMS events schema is up to date.");
  } finally {
    await pg.end();
  }
}

main().catch((err) => {
  console.error("[ensure-lms-events-schema] failed:", err);
  process.exit(1);
});
