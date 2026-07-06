/* eslint-disable no-console */
/**
 * Ensures the notifications and notification_template_langs tables exist.
 * Safe to run multiple times. Only creates tables — does not seed data.
 *
 * Run: node scripts/ensure-notifications-schema.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("[ensure-notifications] Ensuring notifications tables exist...");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS notifications (
      id BIGINT PRIMARY KEY,
      module TEXT NULL,
      type TEXT NULL,
      action TEXT NULL,
      status TEXT NULL,
      permissions TEXT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NULL
    );
  `);
  console.log("[ensure-notifications] notifications table: OK");

  await prisma.$executeRawUnsafe(`
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
  console.log("[ensure-notifications] notification_template_langs table: OK");

  console.log("[ensure-notifications] Done.");
}

main()
  .catch((e) => {
    console.error("[ensure-notifications] Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
