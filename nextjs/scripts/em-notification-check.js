/* eslint-disable no-console */
/**
 * Audit EM email templates, notification rows, and workflow notification wiring.
 * Run: npm run expense:notification-check
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const EM_TEMPLATES = [
  "EM Expense Report Submitted",
  "EM Expense Report Supervisor Approved",
  "EM Expense Report Rejected",
  "EM Expense Report In Billing",
  "EM Expense Report Processed",
  "EM Expense Line Approved",
  "EM Expense Line Rejected",
];

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  console.log("Expense Management notification audit\n");

  let failed = 0;

  for (const name of EM_TEMPLATES) {
    const email = await prisma.emailTemplate.findFirst({
      where: { name },
      select: { id: true },
    });
    const lang = email
      ? await prisma.emailTemplateLang.findFirst({
          where: { parentId: email.id, lang: "en" },
          select: { subject: true, content: true },
        })
      : null;
    const notif = await prisma.notification.findFirst({
      where: { action: name, module: "ExpenseManagement" },
      select: { id: true, status: true },
    });

    if (!email || !lang?.content) {
      console.error(`FAIL: missing email template or EN content for "${name}"`);
      failed++;
      continue;
    }
    if (!notif) {
      console.warn(`WARN: missing notifications row for "${name}" (run npm run db:seed:em-notifications)`);
    } else {
      console.log(`OK  ${name} — email #${email.id}, notification status=${notif.status}`);
    }
  }

  const hasLogTable = Boolean(prisma.emNotificationLog);
  console.log(
    hasLogTable
      ? "OK  em_notification_logs table available (Prisma client)"
      : "WARN: em_notification_logs not in Prisma client — run db:migrate:deploy && db:generate",
  );

  const company = await prisma.user.findFirst({
    where: { type: { contains: "company", mode: "insensitive" } },
    select: { id: true },
  });
  if (company) {
    const settings = await prisma.setting.findMany({
      where: {
        createdBy: company.id,
        key: { in: EM_TEMPLATES },
      },
      select: { key: true, value: true },
    });
    const enabled = settings.filter((s) => {
      const v = String(s.value ?? "").trim().toLowerCase();
      return v === "on" || v === "true" || v === "1";
    });
    console.log(
      `\nCompany ${company.id}: ${enabled.length}/${EM_TEMPLATES.length} EM email toggles enabled in settings.`,
    );
    if (enabled.length < EM_TEMPLATES.length) {
      console.log(
        "      Enable templates in Settings → Email notification settings (or seed defaults).",
      );
    }
  }

  const sup = await prisma.role.findFirst({ where: { name: "expense-supervisor" } });
  const bill = await prisma.role.findFirst({ where: { name: "expense-billing" } });
  console.log(sup ? "OK  expense-supervisor role exists" : "FAIL: expense-supervisor role missing");
  console.log(bill ? "OK  expense-billing role exists" : "FAIL: expense-billing role missing");
  if (!sup || !bill) failed++;

  await prisma.$disconnect();
  if (failed) process.exit(1);
  console.log("\nAll notification prerequisites present.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
