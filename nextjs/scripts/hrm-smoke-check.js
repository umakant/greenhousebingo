/* eslint-disable no-console */
/**
 * Sanity-check HRM tables: query counts and report OK. Uses Prisma (no HTTP/cookies).
 * Run: node scripts/hrm-smoke-check.js
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const checks = [
      ["hrmBranch", () => prisma.hrmBranch.count()],
      ["hrmDepartment", () => prisma.hrmDepartment.count()],
      ["hrmDesignation", () => prisma.hrmDesignation.count()],
      ["hrmEmployee", () => prisma.hrmEmployee.count()],
      ["hrmShift", () => prisma.hrmShift.count()],
      ["hrmLeaveType", () => prisma.hrmLeaveType.count()],
      ["hrmHoliday", () => prisma.hrmHoliday.count()],
      ["hrmAttendance", () => prisma.hrmAttendance.count()],
      ["hrmLeaveApplication", () => prisma.hrmLeaveApplication.count()],
      ["hrmAward", () => prisma.hrmAward.count()],
      ["hrmPromotion", () => prisma.hrmPromotion.count()],
      ["hrmResignation", () => prisma.hrmResignation.count()],
      ["hrmTermination", () => prisma.hrmTermination.count()],
      ["hrmWarning", () => prisma.hrmWarning.count()],
      ["hrmComplaint", () => prisma.hrmComplaint.count()],
      ["hrmTransfer", () => prisma.hrmTransfer.count()],
      ["hrmDocument", () => prisma.hrmDocument.count()],
      ["hrmPayroll", () => prisma.hrmPayroll.count()],
      ["hrmAnnouncement", () => prisma.hrmAnnouncement.count()],
      ["hrmEvent", () => prisma.hrmEvent.count()],
      ["hrmAcknowledgment", () => prisma.hrmAcknowledgment.count()],
    ];
    console.log("HRM schema smoke check (row counts)…\n");
    for (const [name, fn] of checks) {
      const n = await fn();
      console.log(`  ${name.padEnd(22)} ${n}`);
    }
    console.log("\nOK — all HRM models readable.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
