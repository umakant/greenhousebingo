/* eslint-disable no-console */
/**
 * Sanity-check Accounting module tables: row counts via Prisma (no HTTP/cookies).
 * Covers menu: Customers, Vendors, Banking, Chart of Accounts, payments, revenue/expense,
 * debit/credit notes, setup categories/types.
 *
 * Run: node scripts/accounting-smoke-check.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const checks = [
      ["customer (accounting)", () => prisma.customer.count()],
      ["vendor (accounting)", () => prisma.vendor.count()],
      ["accountCategory", () => prisma.accountCategory.count()],
      ["accountType", () => prisma.accountType.count()],
      ["bankAccount", () => prisma.bankAccount.count()],
      ["bankTransaction", () => prisma.bankTransaction.count()],
      ["bankTransfer", () => prisma.bankTransfer.count()],
      ["chartOfAccount", () => prisma.chartOfAccount.count()],
      ["vendorPayment", () => prisma.vendorPayment.count()],
      ["customerPayment", () => prisma.customerPayment.count()],
      ["revenue", () => prisma.revenue.count()],
      ["expense", () => prisma.expense.count()],
      ["debitNote", () => prisma.debitNote.count()],
      ["creditNote", () => prisma.creditNote.count()],
    ];
    console.log("Accounting module — DB smoke check (row counts)…\n");
    for (const [name, fn] of checks) {
      const n = await fn();
      console.log(`  ${name.padEnd(28)} ${n}`);
    }
    console.log("\nOK — all accounting models readable.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
