/* eslint-disable no-console */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ log: ["error"] });

const STATEMENTS = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS marketplace_vendor_id BIGINT NULL;`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_reset BOOLEAN NOT NULL DEFAULT FALSE;`,
  `CREATE INDEX IF NOT EXISTS users_marketplace_vendor_id_idx ON users(marketplace_vendor_id);`,
  `ALTER TABLE marketplace_vendors ADD COLUMN IF NOT EXISTS primary_user_id BIGINT NULL;`,
  `CREATE INDEX IF NOT EXISTS marketplace_vendors_primary_user_id_idx ON marketplace_vendors(primary_user_id);`,
  `CREATE TABLE IF NOT EXISTS marketplace_vendor_staff (
    id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'vendor_staff',
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS marketplace_vendor_staff_vendor_user_key ON marketplace_vendor_staff(vendor_id, user_id);`,
  `CREATE INDEX IF NOT EXISTS marketplace_vendor_staff_user_id_idx ON marketplace_vendor_staff(user_id);`,
  `CREATE TABLE IF NOT EXISTS marketplace_vendor_permissions (
    id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL,
    user_id BIGINT NULL,
    permission_key VARCHAR(128) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS marketplace_vendor_permissions_vendor_user_key_key
    ON marketplace_vendor_permissions(vendor_id, user_id, permission_key);`,
  `CREATE INDEX IF NOT EXISTS marketplace_vendor_permissions_vendor_id_idx ON marketplace_vendor_permissions(vendor_id);`,
  `CREATE INDEX IF NOT EXISTS marketplace_vendor_permissions_user_id_idx ON marketplace_vendor_permissions(user_id);`,
];

async function main() {
  console.log("Ensuring marketplace vendor portal schema...");
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("Marketplace vendor portal schema OK.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
