/* eslint-disable no-console */
/**
 * Exercise Expense Management Prisma models with insert/read/delete (no HTTP).
 * Run from repo: node scripts/expense-management-smoke-check.js
 * Optional: EM_SMOKE_ORG_ID=1234 to force organization (users.id).
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const PREFIX = "EM-SMOKE-";
const CAT_NAME = "SMOKE_TEST_CATEGORY";

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  if (!prisma.emExpenseCategory) {
    console.error(
      "FAIL: prisma.emExpenseCategory is missing — run `npm run db:generate` (stop dev server first on Windows if EPERM).",
    );
    process.exit(1);
  }

  let orgId = process.env.EM_SMOKE_ORG_ID ? BigInt(String(process.env.EM_SMOKE_ORG_ID).trim()) : null;
  if (!orgId) {
    const company = await prisma.user.findFirst({
      where: { type: { contains: "company", mode: "insensitive" } },
      select: { id: true },
    });
    const fallback = await prisma.user.findFirst({ orderBy: { id: "asc" }, select: { id: true } });
    orgId = company?.id ?? fallback?.id ?? null;
  }

  console.log("Expense Management DB smoke check\n");

  let categoryTableReady = true;
  let categoryCount = null;
  try {
    categoryCount = await prisma.emExpenseCategory.count();
  } catch (e) {
    if (e?.code === "P2021") {
      categoryTableReady = false;
      console.warn(
        "WARN: em_expense_categories table missing — run `npm run db:migrate:deploy` (or apply migration 20260430120000_em_expense_categories). Category checks skipped.\n",
      );
    } else {
      throw e;
    }
  }

  const counts = {
    emExpenseReport: await prisma.emExpenseReport.count(),
    emExpenseLine: await prisma.emExpenseLine.count(),
    ...(categoryCount !== null ? { emExpenseCategory: categoryCount } : { emExpenseCategory: "(table missing)" }),
  };
  console.log("Current row counts:", counts);

  if (!orgId) {
    console.log("\nSKIP seed: no user row found (set EM_SMOKE_ORG_ID). Read-only counts OK.");
    await prisma.$disconnect();
    return;
  }

  console.log("Using organizationId (users.id):", orgId.toString());

  const reportNumber = `${PREFIX}${Date.now()}`;
  let reportId;
  let lineId;
  let catId;

  try {
    await prisma.$transaction(async (tx) => {
      const rep = await tx.emExpenseReport.create({
        data: {
          organizationId: orgId,
          reportNumber,
          purpose: "Smoke test report",
          status: "draft",
          currency: "USD",
          totalAmount: 0,
        },
      });
      reportId = rep.id;

      const line = await tx.emExpenseLine.create({
        data: {
          organizationId: orgId,
          reportId: rep.id,
          expenseDate: new Date(),
          category: "Mileage",
          merchant: "Smoke Merchant",
          amount: 12.34,
          currency: "USD",
          receiptAttached: true,
          status: "draft",
        },
      });
      lineId = line.id;

      if (categoryTableReady) {
        await tx.emExpenseCategory.upsert({
          where: { organizationId_name: { organizationId: orgId, name: CAT_NAME } },
          create: { organizationId: orgId, name: CAT_NAME, description: "smoke", sortOrder: 9999 },
          update: {},
        });
        const cat = await tx.emExpenseCategory.findFirst({
          where: { organizationId: orgId, name: CAT_NAME },
        });
        catId = cat?.id;
      }

      const nLines = await tx.emExpenseLine.count({ where: { organizationId: orgId } });
      const nRep = await tx.emExpenseReport.count({ where: { organizationId: orgId } });
      if (nLines < 1 || nRep < 1) throw new Error("Count sanity failed after insert");

      await tx.emExpenseLine.delete({ where: { id: lineId } });
      await tx.emExpenseReport.delete({ where: { id: reportId } });
      if (categoryTableReady && catId) {
        await tx.emExpenseCategory.deleteMany({ where: { organizationId: orgId, name: CAT_NAME } });
      }
    });

    console.log("\nOK — create → count → delete transaction succeeded.");
    console.log(`  (temporary report ${reportNumber} cleaned up)`);
    if (!categoryTableReady) {
      console.log("  (category table not present — apply migrations to test categories.)");
    }
  } catch (e) {
    console.error("\nFAIL during transaction:", e.message || e);
    try {
      if (lineId) await prisma.emExpenseLine.deleteMany({ where: { id: lineId } });
      if (reportId) await prisma.emExpenseReport.deleteMany({ where: { id: reportId } });
      if (categoryTableReady) {
        await prisma.emExpenseCategory.deleteMany({ where: { organizationId: orgId, name: CAT_NAME } });
      }
    } catch (_) {
      /* best-effort cleanup */
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
