/* eslint-disable no-console */
/**
 * Seed Expense Management email + notification toggles for workflow emails.
 * Usage: npm run db:seed:em-notifications
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const MODULE = "ExpenseManagement";
const DEFAULT_FROM = "Paper Flight";

const NOTIFICATION_TEMPLATES = [
  { id: 901, action: "EM Expense Report Submitted", permissions: "approve-expense-reports" },
  { id: 902, action: "EM Expense Report Supervisor Approved", permissions: "manage-expense-billing" },
  { id: 903, action: "EM Expense Report Rejected", permissions: "manage-expense-reports" },
  { id: 904, action: "EM Expense Report In Billing", permissions: "manage-expense-reports" },
  { id: 905, action: "EM Expense Report Processed", permissions: "manage-expense-reports" },
  { id: 906, action: "EM Expense Line Approved", permissions: "approve-expense-reports" },
  { id: 907, action: "EM Expense Line Rejected", permissions: "approve-expense-reports" },
];

const EMAIL_TEMPLATES = [
  {
    name: "EM Expense Report Submitted",
    subject: "Expense report {report_number} submitted for approval",
    content:
      '<p>Hi {name},</p><p>{employee_name} submitted expense report <strong>{report_number}</strong> for your approval.</p><p>Purpose: {report_purpose}</p><p><a href="{report_url}">Review reports</a></p><p>Thanks,<br />{company_name}</p>',
  },
  {
    name: "EM Expense Report Supervisor Approved",
    subject: "Expense report {report_number} approved — billing review",
    content:
      '<p>Hi {name},</p><p>Report <strong>{report_number}</strong> from {employee_name} was approved by a supervisor and is ready for billing.</p><p>Status: {report_status}</p><p><a href="{report_url}">Open expense reports</a></p><p>Thanks,<br />{company_name}</p>',
  },
  {
    name: "EM Expense Report Rejected",
    subject: "Expense report {report_number} was rejected",
    content:
      '<p>Hi {name},</p><p>Your expense report <strong>{report_number}</strong> was rejected.</p><p>Reason: {rejection_note}</p><p><a href="{report_url}">Edit and resubmit</a></p><p>Thanks,<br />{company_name}</p>',
  },
  {
    name: "EM Expense Report In Billing",
    subject: "Expense report {report_number} is in billing",
    content:
      '<p>Hi {name},</p><p>Your expense report <strong>{report_number}</strong> has been sent to the billing department.</p><p><a href="{report_url}">View report</a></p><p>Thanks,<br />{company_name}</p>',
  },
  {
    name: "EM Expense Report Processed",
    subject: "Expense report {report_number} processed",
    content:
      '<p>Hi {name},</p><p>Your expense report <strong>{report_number}</strong> has been processed by billing.</p><p><a href="{report_url}">View report</a></p><p>Thanks,<br />{company_name}</p>',
  },
  {
    name: "EM Expense Line Approved",
    subject: "Expense line approved — {line_category}",
    content:
      '<p>Hi {name},</p><p>An expense line for <strong>{employee_name}</strong> was approved.</p><ul><li>Category: {line_category}</li><li>Vendor: {line_vendor}</li><li>Date: {line_date}</li><li>Amount: {line_amount}</li><li>Status: {line_status}</li><li>Report: {report_number}</li></ul><p><a href="{expenses_url}">View expenses</a></p><p>Thanks,<br />{company_name}</p>',
  },
  {
    name: "EM Expense Line Rejected",
    subject: "Expense line rejected — {line_category}",
    content:
      '<p>Hi {name},</p><p>An expense line for <strong>{employee_name}</strong> was rejected.</p><ul><li>Category: {line_category}</li><li>Vendor: {line_vendor}</li><li>Date: {line_date}</li><li>Amount: {line_amount}</li><li>Report: {report_number}</li></ul><p>Reason: {rejection_note}</p><p><a href="{expenses_url}">View expenses</a></p><p>Thanks,<br />{company_name}</p>',
  },
];

const VARIABLES = {
  Name: "name",
  "Report Number": "report_number",
  "Employee Name": "employee_name",
  "Report Status": "report_status",
  "Report URL": "report_url",
  "Line Category": "line_category",
  "Line Vendor": "line_vendor",
  "Line Amount": "line_amount",
  "Line Date": "line_date",
  "Line Status": "line_status",
  "Expenses URL": "expenses_url",
  "Rejection Note": "rejection_note",
};

async function seedNotifications() {
  for (const row of NOTIFICATION_TEMPLATES) {
    const existing = await prisma.notification.findUnique({ where: { id: BigInt(row.id) } });
    if (!existing) {
      await prisma.notification.create({
        data: {
          id: BigInt(row.id),
          module: MODULE,
          type: "mail",
          action: row.action,
          status: "on",
          permissions: row.permissions,
        },
      });
      console.log(`Created notification ${row.action}`);
    }
    const lang = await prisma.notificationTemplateLang.findFirst({
      where: { parentId: BigInt(row.id), lang: "en" },
    });
    if (!lang) {
      await prisma.notificationTemplateLang.create({
        data: {
          parentId: BigInt(row.id),
          lang: "en",
          content: `Email for ${row.action}`,
          createdAt: new Date(),
        },
      });
    }
  }
}

async function seedEmailTemplates() {
  let nextTemplateId = null;
  let nextLangId = null;
  for (const tpl of EMAIL_TEMPLATES) {
    let row = await prisma.emailTemplate.findFirst({ where: { name: tpl.name } });
    if (!row) {
      if (nextTemplateId == null) {
        const max = await prisma.emailTemplate.aggregate({ _max: { id: true } });
        nextTemplateId = (max._max.id ?? 0n) + 1n;
      }
      row = await prisma.emailTemplate.create({
        data: {
          id: nextTemplateId++,
          name: tpl.name,
          from: DEFAULT_FROM,
          moduleName: MODULE,
        },
      });
      console.log(`Created email template ${tpl.name}`);
    }
    const lang = await prisma.emailTemplateLang.findFirst({
      where: { parentId: row.id, lang: "en" },
    });
    if (!lang) {
      if (nextLangId == null) {
        const maxLang = await prisma.emailTemplateLang.aggregate({ _max: { id: true } });
        nextLangId = (maxLang._max.id ?? 0n) + 1n;
      }
      await prisma.emailTemplateLang.create({
        data: {
          id: nextLangId++,
          parentId: row.id,
          lang: "en",
          subject: tpl.subject,
          content: tpl.content,
          moduleName: MODULE,
          variables: VARIABLES,
        },
      });
      console.log(`  Added EN content for ${tpl.name}`);
    }
  }
}

async function seedCompanyToggles(companyId) {
  const max = await prisma.setting.aggregate({ _max: { id: true } });
  let nextId = (max._max.id ?? 0n) + 1n;
  for (const tpl of EMAIL_TEMPLATES) {
    const existing = await prisma.setting.findFirst({
      where: { createdBy: companyId, key: tpl.name },
    });
    if (!existing) {
      await prisma.setting.create({
        data: { id: nextId++, key: tpl.name, value: "on", createdBy: companyId, isPublic: true },
      });
      console.log(`Enabled setting toggle: ${tpl.name}`);
    } else if (!["on", "true", "1"].includes(String(existing.value ?? "").trim().toLowerCase())) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: { value: "on" },
      });
      console.log(`Turned on setting: ${tpl.name}`);
    }
  }
}

async function main() {
  await seedNotifications();
  await seedEmailTemplates();
  const company = await prisma.user.findFirst({
    where: { type: { contains: "company", mode: "insensitive" } },
    select: { id: true },
  });
  if (company) await seedCompanyToggles(company.id);
  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
