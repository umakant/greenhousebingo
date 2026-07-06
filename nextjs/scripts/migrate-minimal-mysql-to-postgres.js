/* eslint-disable no-console */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const mysql = require("mysql2/promise");
const { Client } = require("pg");

function required(name, value) {
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

function pgConfig() {
  if (!process.env.PF_PG_PASSWORD || process.env.PF_PG_PASSWORD === "CHANGE_ME") {
    throw new Error(
      "Set PF_PG_PASSWORD in nextjs/.env.local to your local Postgres password, then rerun: npm run db:migrate:pg:minimal"
    );
  }

  return {
    host: required("PF_PG_HOST", process.env.PF_PG_HOST),
    port: process.env.PF_PG_PORT ? Number(process.env.PF_PG_PORT) : 5432,
    database: required("PF_PG_DATABASE", process.env.PF_PG_DATABASE),
    user: required("PF_PG_USER", process.env.PF_PG_USER),
    password: required("PF_PG_PASSWORD", process.env.PF_PG_PASSWORD),
  };
}

function pgAdminConfig() {
  // Connect to the default maintenance DB to create the target DB if needed.
  const cfg = pgConfig();
  return { ...cfg, database: "postgres" };
}

function mysqlConfig() {
  return {
    host: required("PF_MYSQL_HOST", process.env.PF_MYSQL_HOST),
    port: process.env.PF_MYSQL_PORT ? Number(process.env.PF_MYSQL_PORT) : 3306,
    database: required("PF_MYSQL_DATABASE", process.env.PF_MYSQL_DATABASE),
    user: required("PF_MYSQL_USER", process.env.PF_MYSQL_USER),
    password: process.env.PF_MYSQL_PASSWORD || "",
  };
}

async function ensureDatabaseExists() {
  const admin = new Client(pgAdminConfig());
  await admin.connect();
  try {
    const dbName = pgConfig().database;
    const res = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (res.rowCount === 0) {
      console.log(`Creating Postgres database: ${dbName}`);
      await admin.query(`CREATE DATABASE "${dbName}"`);
    } else {
      console.log(`Postgres database exists: ${dbName}`);
    }
  } finally {
    await admin.end();
  }
}

async function ensureMinimalSchema(pg) {
  // Minimal subset required for current Next.js pages:
  // - dashboard stats: orders/plans/users(type)
  // - landing settings: landing_page_settings + settings(created_by,key,value)
  // - RBAC demo: roles/permissions pivots + users(email/password)
  console.log("Ensuring minimal schema...");

  await pg.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT PRIMARY KEY,
      type TEXT NULL
    );
  `);

  // Add/align columns for auth + RBAC demo users
  await pg.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT NULL;`);
  await pg.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT NULL;`);
  await pg.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT NULL;`);
  await pg.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS slug TEXT NULL;`);
  await pg.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_no TEXT NULL;`);
  await pg.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT NULL;`);
  await pg.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS lang TEXT NULL;`);
  await pg.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_enable_login BOOLEAN NULL;`);
  await pg.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NULL;`);
  await pg.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS active_plan INT NULL;`);
  await pg.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_expire_date DATE NULL;`);
  await pg.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS creator_id BIGINT NULL;`);
  await pg.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by BIGINT NULL;`);
  await pg.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP(3) NULL;`);
  await pg.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
  );
  await pg.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(3) NULL;`);
  await pg.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);`);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS plans (
      id BIGINT PRIMARY KEY
    );
  `);

  // Align columns for subscription plans
  await pg.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS name TEXT NULL;`);
  await pg.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS description TEXT NULL;`);
  await pg.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS number_of_users INT NOT NULL DEFAULT 1;`);
  await pg.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS custom_plan BOOLEAN NOT NULL DEFAULT false;`);
  await pg.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS status BOOLEAN NOT NULL DEFAULT true;`);
  await pg.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS free_plan BOOLEAN NOT NULL DEFAULT false;`);
  await pg.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS modules JSONB NULL;`);
  await pg.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS package_price_yearly NUMERIC(10,2) NOT NULL DEFAULT 0;`);
  await pg.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS package_price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0;`);
  await pg.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_per_user_monthly NUMERIC(10,2) NOT NULL DEFAULT 0;`);
  await pg.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_per_user_yearly NUMERIC(10,2) NOT NULL DEFAULT 0;`);
  await pg.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS storage_limit INT NOT NULL DEFAULT 0;`);
  await pg.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_per_storage_monthly NUMERIC(10,2) NOT NULL DEFAULT 0;`);
  await pg.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS price_per_storage_yearly NUMERIC(10,2) NOT NULL DEFAULT 0;`);
  await pg.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS trial BOOLEAN NOT NULL DEFAULT false;`);
  await pg.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS trial_days INT NOT NULL DEFAULT 0;`);
  await pg.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS created_by BIGINT NULL;`);
  await pg.query(
    `ALTER TABLE plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
  );
  await pg.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(3) NULL;`);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGINT PRIMARY KEY,
      user_id BIGINT NULL,
      plan_id BIGINT NULL,
      amount NUMERIC(10,2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT NULL,
      transaction_id TEXT NULL,
      metadata TEXT NULL,
      created_by BIGINT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NULL
    );
  `);

  // Add-ons (required for Subscription Setting + Create Plan UI)
  await pg.query(`
    CREATE TABLE IF NOT EXISTS add_ons (
      id BIGINT PRIMARY KEY,
      module TEXT NOT NULL,
      name TEXT NOT NULL,
      monthly_price NUMERIC(8,2) NOT NULL DEFAULT 0,
      yearly_price NUMERIC(8,2) NOT NULL DEFAULT 0,
      image TEXT NULL,
      is_enable BOOLEAN NOT NULL DEFAULT false,
      for_admin BOOLEAN NOT NULL DEFAULT false,
      package_name TEXT NOT NULL,
      version TEXT NOT NULL DEFAULT '1.0.0',
      priority INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NULL
    );
  `);
  await pg.query(`ALTER TABLE add_ons ADD COLUMN IF NOT EXISTS version TEXT NOT NULL DEFAULT '1.0.0';`);
  await pg.query(`CREATE UNIQUE INDEX IF NOT EXISTS add_ons_module_unique ON add_ons(module);`);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS settings (
      id BIGINT PRIMARY KEY,
      key TEXT NOT NULL,
      value TEXT NULL,
      is_public BOOLEAN NOT NULL DEFAULT true,
      created_by BIGINT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NULL
    );
  `);

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

  // Helpdesk tables (tickets, categories, replies)
  await pg.query(`
    CREATE TABLE IF NOT EXISTS helpdesk_categories (
      id BIGINT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NULL,
      created_by BIGINT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NULL
    );
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS helpdesk_tickets (
      id BIGINT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      priority TEXT NOT NULL DEFAULT 'medium',
      category_id BIGINT NULL,
      user_id BIGINT NULL,
      assigned_to BIGINT NULL,
      created_by BIGINT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NULL
    );
  `);
  await pg.query(`CREATE UNIQUE INDEX IF NOT EXISTS helpdesk_tickets_ticket_id_unique ON helpdesk_tickets(ticket_id);`);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS helpdesk_replies (
      id BIGINT PRIMARY KEY,
      ticket_id BIGINT NOT NULL,
      user_id BIGINT NULL,
      message TEXT NOT NULL,
      is_agent BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NULL
    );
  `);

  // Business modules (needed for Companies -> generate company ID + module selection)
  await pg.query(`
    CREATE TABLE IF NOT EXISTS business_modules (
      id BIGINT PRIMARY KEY,
      code TEXT NULL,
      name TEXT NOT NULL,
      description TEXT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      sort_order INT NOT NULL DEFAULT 0,
      created_by BIGINT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NULL
    );
  `);
  await pg.query(`CREATE UNIQUE INDEX IF NOT EXISTS business_modules_code_unique ON business_modules(code);`);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS business_module_features (
      id BIGINT PRIMARY KEY,
      business_module_id BIGINT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NULL
    );
  `);
  await pg.query(
    `CREATE INDEX IF NOT EXISTS business_module_features_module_id_idx ON business_module_features(business_module_id);`,
  );

  // Spatie RBAC pivot — must match Prisma `ModelHasRole` (role_id, model_id, model_type)
  await pg.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id BIGINT PRIMARY KEY,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      guard_name TEXT NOT NULL,
      editable BOOLEAN NOT NULL DEFAULT true,
      created_by BIGINT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NULL
    );
  `);
  await pg.query(`CREATE UNIQUE INDEX IF NOT EXISTS roles_name_guard_unique ON roles(name, guard_name);`);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id BIGINT PRIMARY KEY,
      add_on TEXT NOT NULL,
      module TEXT NOT NULL,
      label TEXT NOT NULL,
      name TEXT NOT NULL,
      guard_name TEXT NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NULL
    );
  `);
  await pg.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS permissions_name_guard_unique ON permissions(name, guard_name);`,
  );

  await pg.query(`
    CREATE TABLE IF NOT EXISTS role_has_permissions (
      role_id BIGINT NOT NULL,
      permission_id BIGINT NOT NULL,
      PRIMARY KEY (role_id, permission_id)
    );
  `);

  await pg.query(`
    CREATE TABLE IF NOT EXISTS model_has_roles (
      role_id BIGINT NOT NULL,
      model_id BIGINT NOT NULL,
      model_type VARCHAR(255) NOT NULL,
      PRIMARY KEY (role_id, model_id, model_type)
    );
  `);
  await pg.query(
    `CREATE INDEX IF NOT EXISTS model_has_roles_model_id_model_type_index ON model_has_roles (model_id, model_type);`,
  );
}

async function copyTable(mysqlConn, pg, table, columns) {
  console.log(`Copying ${table}...`);
  const selectCols = columns.map((c) => `\`${c}\``).join(", ");
  const [rows] = await mysqlConn.query(`SELECT ${selectCols} FROM \`${table}\``);
  console.log(`- rows: ${rows.length}`);

  if (rows.length === 0) return;

  const colList = columns.map((c) => `"${c}"`).join(", ");
  const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(", ");
  const updates = columns
    .filter((c) => c !== "id")
    .map((c) => `"${c}" = EXCLUDED."${c}"`)
    .join(", ");

  const sql = `
    INSERT INTO "${table}" (${colList})
    VALUES (${placeholders})
    ON CONFLICT ("id") DO UPDATE SET ${updates};
  `;

  for (const r of rows) {
    const values = columns.map((c) => {
      const v = r[c];
      // MySQL JSON columns may come through as string; keep as-is for JSONB (pg will parse if JSON string)
      if (c === "config_sections" && typeof v === "string") return JSON.parse(v);
      if (c === "modules" && typeof v === "string" && v.trim()) {
        try {
          return JSON.parse(v);
        } catch {
          return v;
        }
      }
      return v;
    });
    await pg.query(sql, values);
  }
}

async function copyPivotTable(mysqlConn, pg, table, columns) {
  console.log(`Copying ${table}...`);
  const selectCols = columns.map((c) => `\`${c}\``).join(", ");
  const [rows] = await mysqlConn.query(`SELECT ${selectCols} FROM \`${table}\``);
  console.log(`- rows: ${rows.length}`);

  if (rows.length === 0) return;

  const colList = columns.map((c) => `"${c}"`).join(", ");
  const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(", ");
  const conflictCols = columns.map((c) => `"${c}"`).join(", ");
  const sql = `
    INSERT INTO "${table}" (${colList})
    VALUES (${placeholders})
    ON CONFLICT (${conflictCols}) DO NOTHING;
  `;

  for (const r of rows) {
    const values = columns.map((c) => r[c]);
    await pg.query(sql, values);
  }
}

async function main() {
  await ensureDatabaseExists();

  const my = await mysql.createConnection(mysqlConfig());
  const pg = new Client(pgConfig());
  await pg.connect();

  try {
    await ensureMinimalSchema(pg);

    // These columns match your MySQL schema observed earlier in this project.
    await copyTable(my, pg, "users", [
      "id",
      "name",
      "email",
      "password",
      "type",
      "slug",
      "mobile_no",
      "avatar",
      "lang",
      "is_enable_login",
      "is_active",
      "creator_id",
      "created_by",
      "email_verified_at",
      "created_at",
      "updated_at",
    ]);
    await copyTable(my, pg, "plans", [
      "id",
      "name",
      "description",
      "number_of_users",
      "custom_plan",
      "status",
      "free_plan",
      "modules",
      "package_price_yearly",
      "package_price_monthly",
      "price_per_user_monthly",
      "price_per_user_yearly",
      "storage_limit",
      "price_per_storage_monthly",
      "price_per_storage_yearly",
      "trial",
      "trial_days",
      "created_by",
      "created_at",
      "updated_at",
    ]);
    await copyTable(my, pg, "add_ons", [
      "id",
      "module",
      "name",
      "monthly_price",
      "yearly_price",
      "image",
      "is_enable",
      "for_admin",
      "package_name",
      "priority",
      "created_at",
      "updated_at",
    ]);
    await copyTable(my, pg, "orders", [
      "id",
      "user_id",
      "plan_id",
      "amount",
      "status",
      "payment_method",
      "transaction_id",
      "metadata",
      "created_by",
      "created_at",
      "updated_at",
    ]);
    await copyTable(my, pg, "settings", ["id", "key", "value", "is_public", "created_by", "created_at", "updated_at"]);
    await copyTable(my, pg, "landing_page_settings", [
      "id",
      "company_name",
      "contact_email",
      "contact_phone",
      "contact_address",
      "config_sections",
      "created_at",
      "updated_at",
    ]);

    await copyTable(my, pg, "helpdesk_categories", ["id", "name", "description", "created_by", "created_at", "updated_at"]);
    await copyTable(my, pg, "helpdesk_tickets", [
      "id",
      "ticket_id",
      "subject",
      "description",
      "status",
      "priority",
      "category_id",
      "user_id",
      "assigned_to",
      "created_by",
      "created_at",
      "updated_at",
    ]);
    await copyTable(my, pg, "helpdesk_replies", [
      "id",
      "ticket_id",
      "user_id",
      "message",
      "is_agent",
      "created_at",
      "updated_at",
    ]);

    // MySQL schema may differ across installs; best-effort copy
    try {
      await copyTable(my, pg, "business_modules", [
        "id",
        "code",
        "name",
        "description",
        "is_active",
        "sort_order",
        "created_by",
        "created_at",
        "updated_at",
      ]);
      await copyTable(my, pg, "business_module_features", [
        "id",
        "business_module_id",
        "title",
        "description",
        "sort_order",
        "created_at",
        "updated_at",
      ]);
    } catch (e) {
      console.warn("Skipping business_modules copy (schema mismatch or missing table).");
    }

    await copyTable(my, pg, "roles", [
      "id",
      "name",
      "label",
      "guard_name",
      "editable",
      "created_by",
      "created_at",
      "updated_at",
    ]);
    await copyTable(my, pg, "permissions", [
      "id",
      "add_on",
      "module",
      "label",
      "name",
      "guard_name",
      "created_at",
      "updated_at",
    ]);
    await copyPivotTable(my, pg, "role_has_permissions", ["role_id", "permission_id"]);
    await copyPivotTable(my, pg, "model_has_roles", ["role_id", "model_id", "model_type"]);

    console.log("Done.");
  } finally {
    await pg.end();
    await my.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

