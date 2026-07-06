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
  // Prefer DATABASE_URL so we align the same DB Prisma uses.
  const pg = process.env.DATABASE_URL
    ? new Client({ connectionString: process.env.DATABASE_URL })
    : new Client(pgConfig());
  await pg.connect();

  try {
    console.log("Ensuring helpdesk schema...");

    // Categories
    await pg.query(`
      CREATE TABLE IF NOT EXISTS helpdesk_categories (
        id BIGINT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NULL,
        color TEXT NOT NULL DEFAULT '#3B82F6',
        is_active BOOLEAN NOT NULL DEFAULT true,
        creator_id BIGINT NULL,
        created_by BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`ALTER TABLE helpdesk_categories ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT '#3B82F6';`);
    await pg.query(`ALTER TABLE helpdesk_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;`);
    await pg.query(`ALTER TABLE helpdesk_categories ADD COLUMN IF NOT EXISTS creator_id BIGINT NULL;`);

    // Tickets
    await pg.query(`
      CREATE TABLE IF NOT EXISTS helpdesk_tickets (
        id BIGINT PRIMARY KEY,
        ticket_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        priority TEXT NOT NULL DEFAULT 'medium',
        category_id BIGINT NULL,
        created_by BIGINT NULL,
        resolved_at TIMESTAMP(3) NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE UNIQUE INDEX IF NOT EXISTS helpdesk_tickets_ticket_id_unique ON helpdesk_tickets(ticket_id);`);

    // If an older schema exists (subject column), map it to title.
    await pg.query(`ALTER TABLE helpdesk_tickets ADD COLUMN IF NOT EXISTS title TEXT;`);
    await pg.query(`ALTER TABLE helpdesk_tickets ADD COLUMN IF NOT EXISTS subject TEXT NULL;`).catch(() => null);
    await pg.query(`ALTER TABLE helpdesk_tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP(3) NULL;`);
    await pg.query(`ALTER TABLE helpdesk_tickets ADD COLUMN IF NOT EXISTS created_by BIGINT NULL;`);
    await pg.query(`ALTER TABLE helpdesk_tickets ADD COLUMN IF NOT EXISTS category_id BIGINT NULL;`);
    await pg.query(`ALTER TABLE helpdesk_tickets ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';`);
    await pg.query(`ALTER TABLE helpdesk_tickets ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';`);
    await pg.query(
      `ALTER TABLE helpdesk_tickets ADD COLUMN IF NOT EXISTS created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
    );
    await pg.query(`ALTER TABLE helpdesk_tickets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(3) NULL;`);

    // Populate title from subject if needed.
    await pg
      .query(`
        UPDATE helpdesk_tickets
        SET title = COALESCE(title, subject, '')
        WHERE title IS NULL;
      `)
      .catch(() => null);

    // Populate subject from title if needed (older Laravel UIs read "subject").
    await pg
      .query(`
        UPDATE helpdesk_tickets
        SET subject = COALESCE(subject, title, '')
        WHERE subject IS NULL;
      `)
      .catch(() => null);

    // If subject exists and is NOT NULL (legacy), relax it so inserts that only provide title won't fail.
    await pg.query(`ALTER TABLE helpdesk_tickets ALTER COLUMN subject DROP NOT NULL;`).catch(() => null);
    await pg.query(`ALTER TABLE helpdesk_tickets ALTER COLUMN subject SET DEFAULT '';`).catch(() => null);

    // Enforce NOT NULL when safe.
    await pg.query(`ALTER TABLE helpdesk_tickets ALTER COLUMN title SET NOT NULL;`).catch(() => null);

    // Keep legacy "subject" and new "title" in sync for inserts/updates.
    await pg
      .query(`
        CREATE OR REPLACE FUNCTION helpdesk_tickets_sync_subject_title()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NEW.title IS NULL OR NEW.title = '' THEN
            NEW.title := COALESCE(NULLIF(NEW.subject, ''), NEW.title, '');
          END IF;

          IF NEW.subject IS NULL OR NEW.subject = '' THEN
            NEW.subject := COALESCE(NULLIF(NEW.title, ''), NEW.subject, '');
          END IF;

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `)
      .catch(() => null);

    await pg.query(`DROP TRIGGER IF EXISTS trg_helpdesk_tickets_sync_subject_title ON helpdesk_tickets;`).catch(() => null);
    await pg
      .query(`
        CREATE TRIGGER trg_helpdesk_tickets_sync_subject_title
        BEFORE INSERT OR UPDATE ON helpdesk_tickets
        FOR EACH ROW
        EXECUTE FUNCTION helpdesk_tickets_sync_subject_title();
      `)
      .catch(() => null);

    // Replies
    await pg.query(`
      CREATE TABLE IF NOT EXISTS helpdesk_replies (
        id BIGINT PRIMARY KEY,
        ticket_id BIGINT NOT NULL,
        message TEXT NOT NULL,
        attachments JSONB NULL,
        is_internal BOOLEAN NOT NULL DEFAULT false,
        created_by BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`ALTER TABLE helpdesk_replies ADD COLUMN IF NOT EXISTS attachments JSONB NULL;`);
    await pg.query(`ALTER TABLE helpdesk_replies ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;`);
    await pg.query(`ALTER TABLE helpdesk_replies ADD COLUMN IF NOT EXISTS created_by BIGINT NULL;`);

    // Backfill is_internal from old is_agent if present.
    await pg
      .query(`
        UPDATE helpdesk_replies
        SET is_internal = COALESCE(is_internal, is_agent, false)
        WHERE is_internal IS NULL;
      `)
      .catch(() => null);

    // Backfill created_by from old user_id if present.
    await pg
      .query(`
        UPDATE helpdesk_replies
        SET created_by = COALESCE(created_by, user_id)
        WHERE created_by IS NULL;
      `)
      .catch(() => null);

    console.log("✓ helpdesk schema ready");
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

