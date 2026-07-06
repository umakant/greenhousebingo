/* eslint-disable no-console */
/**
 * End-to-end Expense Management approval workflow (DB persistence).
 * Validation rules: run via vitest (em-expense-workflow.test.ts).
 * Run: npm run expense:workflow-check
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const PREFIX = "EM-FLOW-";

const FLOW = ["draft", "submitted", "supervisor_approved", "in_billing", "processed"];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  console.log("Expense Management workflow DB flow check\n");

  const company = await prisma.user.findFirst({
    where: { type: { contains: "company", mode: "insensitive" } },
    select: { id: true },
  });
  assert(company, "No company user found");
  const orgId = company.id;

  const reportNumber = `${PREFIX}${Date.now()}`;
  let reportId;

  try {
    const report = await prisma.emExpenseReport.create({
      data: {
        organizationId: orgId,
        reportNumber,
        purpose: "Workflow flow test",
        status: "draft",
        currency: "USD",
        createdByUserId: company.id,
      },
    });
    reportId = report.id;

    for (let i = 1; i < FLOW.length; i++) {
      const next = FLOW[i];
      await prisma.emExpenseReport.update({
        where: { id: reportId },
        data: { status: next },
      });
      const row = await prisma.emExpenseReport.findUnique({
        where: { id: reportId },
        select: { status: true },
      });
      assert(row.status === next, `expected status ${next}, got ${row.status}`);
    }

    const legacy = await prisma.emExpenseReport.create({
      data: {
        organizationId: orgId,
        reportNumber: `${PREFIX}LEGACY-${Date.now()}`,
        status: "approved",
        currency: "USD",
      },
    });
    await prisma.emExpenseReport.update({
      where: { id: legacy.id },
      data: { status: "in_billing" },
    });
    await prisma.emExpenseReport.delete({ where: { id: legacy.id } });

    console.log(`OK  DB transitions: ${FLOW.join(" → ")}`);
    console.log("OK  Legacy approved row can move to in_billing (admin path in app)");
  } finally {
    if (reportId) {
      await prisma.emExpenseLine.deleteMany({ where: { reportId } });
      await prisma.emExpenseReport.deleteMany({ where: { id: reportId } });
      if (prisma.emNotificationLog) {
        await prisma.emNotificationLog.deleteMany({
          where: { referenceType: "expense_report", referenceId: reportId },
        });
      }
    }
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("FAIL", e.message || e);
  process.exit(1);
});
