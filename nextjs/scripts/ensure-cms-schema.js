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
  const pg = process.env.DATABASE_URL ? new Client({ connectionString: process.env.DATABASE_URL }) : new Client(pgConfig());
  await pg.connect();

  try {
    console.log("Ensuring CMS schema...");

    await pg.query(`
      CREATE TABLE IF NOT EXISTS landing_page_settings (
        id BIGINT PRIMARY KEY,
        company_name TEXT NULL,
        contact_email TEXT NULL,
        contact_phone TEXT NULL,
        contact_address TEXT NULL,
        config_sections JSONB NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS marketplace_settings (
        id BIGSERIAL PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'Marketplace',
        subtitle TEXT NULL,
        module TEXT NULL,
        config_sections JSONB NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE INDEX IF NOT EXISTS marketplace_settings_module_idx ON marketplace_settings(module);`);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS custom_pages (
        id BIGSERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT NOT NULL,
        content TEXT NOT NULL,
        meta_title TEXT NULL,
        meta_description TEXT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        is_disabled BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE UNIQUE INDEX IF NOT EXISTS custom_pages_slug_unique ON custom_pages(slug);`);
    await pg.query(`CREATE INDEX IF NOT EXISTS custom_pages_is_active_idx ON custom_pages(is_active);`);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        subscribed_at TIMESTAMP(3) NOT NULL,
        ip_address TEXT NULL,
        country TEXT NULL,
        city TEXT NULL,
        region TEXT NULL,
        country_code VARCHAR(2) NULL,
        isp TEXT NULL,
        org TEXT NULL,
        timezone TEXT NULL,
        latitude DECIMAL(10,8) NULL,
        longitude DECIMAL(11,8) NULL,
        user_agent TEXT NULL,
        browser TEXT NULL,
        os TEXT NULL,
        device TEXT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_unique ON newsletter_subscribers(email);`);
    await pg.query(`CREATE INDEX IF NOT EXISTS newsletter_subscribers_subscribed_at_idx ON newsletter_subscribers(subscribed_at);`);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NULL,
        "from" TEXT NULL,
        module_name TEXT NULL,
        creator_id BIGINT NULL,
        created_by BIGINT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE INDEX IF NOT EXISTS email_templates_module_name_idx ON email_templates(module_name);`);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS email_template_langs (
        id BIGSERIAL PRIMARY KEY,
        parent_id BIGINT NOT NULL,
        lang TEXT NULL,
        subject TEXT NULL,
        content TEXT NULL,
        module_name TEXT NULL,
        variables JSONB NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE INDEX IF NOT EXISTS email_template_langs_parent_id_idx ON email_template_langs(parent_id);`);
    await pg.query(`CREATE INDEX IF NOT EXISTS email_template_langs_parent_id_lang_idx ON email_template_langs(parent_id, lang);`);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS notification_template_langs (
        id BIGSERIAL PRIMARY KEY,
        parent_id BIGINT NOT NULL,
        lang TEXT NULL,
        module TEXT NULL,
        content TEXT NULL,
        variables JSONB NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE INDEX IF NOT EXISTS notification_template_langs_parent_id_idx ON notification_template_langs(parent_id);`);
    await pg.query(`CREATE INDEX IF NOT EXISTS notification_template_langs_parent_id_lang_idx ON notification_template_langs(parent_id, lang);`);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS media_directories (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        parent_id BIGINT NULL,
        creator_id BIGINT NOT NULL,
        created_by BIGINT NOT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE UNIQUE INDEX IF NOT EXISTS media_directories_slug_unique ON media_directories(slug);`);
    await pg.query(`CREATE INDEX IF NOT EXISTS media_directories_parent_id_idx ON media_directories(parent_id);`);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS media (
        id BIGSERIAL PRIMARY KEY,
        model_type TEXT NOT NULL,
        model_id BIGINT NOT NULL,
        uuid UUID NULL,
        collection_name TEXT NOT NULL,
        name TEXT NOT NULL,
        file_name TEXT NOT NULL,
        mime_type TEXT NULL,
        disk TEXT NOT NULL,
        conversions_disk TEXT NULL,
        size BIGINT NOT NULL,
        manipulations JSONB NOT NULL DEFAULT '{}'::jsonb,
        custom_properties JSONB NOT NULL DEFAULT '{}'::jsonb,
        generated_conversions JSONB NOT NULL DEFAULT '{}'::jsonb,
        responsive_images JSONB NOT NULL DEFAULT '{}'::jsonb,
        order_column INTEGER NULL,
        directory_id BIGINT NULL,
        creator_id BIGINT NULL,
        created_by BIGINT NULL,
        created_at TIMESTAMP(3) NULL,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await pg.query(`CREATE UNIQUE INDEX IF NOT EXISTS media_uuid_unique ON media(uuid) WHERE uuid IS NOT NULL;`);
    await pg.query(`CREATE INDEX IF NOT EXISTS media_order_column_idx ON media(order_column);`);
    await pg.query(`CREATE INDEX IF NOT EXISTS media_directory_id_idx ON media(directory_id);`);
    await pg.query(`CREATE INDEX IF NOT EXISTS media_model_type_model_id_idx ON media(model_type, model_id);`);
    await pg.query(`CREATE INDEX IF NOT EXISTS media_created_by_idx ON media(created_by);`);

    console.log("✓ CMS schema ready");
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

