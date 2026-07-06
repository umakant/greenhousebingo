/* eslint-disable no-console */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ log: ["error"] });

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS app_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    organization_id BIGINT NULL,
    module VARCHAR(64) NULL,
    type VARCHAR(64) NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NULL,
    link VARCHAR(512) NULL,
    read_at TIMESTAMP(3) NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS app_notifications_user_id_read_at_idx ON app_notifications(user_id, read_at);`,
  `CREATE INDEX IF NOT EXISTS app_notifications_user_id_created_at_idx ON app_notifications(user_id, created_at);`,
];

async function main() {
  console.log("Ensuring app_notifications schema...");
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("app_notifications schema OK.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
