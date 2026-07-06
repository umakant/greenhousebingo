/* eslint-disable no-console */
// Idempotently creates company billing payment method table.

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ log: ["error"] });

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS company_billing_payment_methods (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL,
    kind VARCHAR(20) NOT NULL,
    card_last4 VARCHAR(4) NULL,
    card_brand VARCHAR(32) NULL,
    cardholder_name VARCHAR(255) NULL,
    exp_month INT NULL,
    exp_year INT NULL,
    paypal_email VARCHAR(255) NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NULL
  );`,
  `CREATE INDEX IF NOT EXISTS company_billing_payment_methods_company_id_idx ON company_billing_payment_methods(company_id);`,
];

async function main() {
  console.log("Ensuring company billing schema...");
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("✓ company billing schema ready");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
