/* eslint-disable no-console */
/**
 * Updates the "New User" email template (subject + HTML + variables) in the database.
 * Run after upgrading when seed-email-templates.js skips already-seeded templates.
 *
 * Usage: node scripts/patch-new-user-email-template.js
 * Or:    npm run db:patch:new-user-email
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const newUserWelcome = require("./lib/new-user-welcome-email-content");

async function main() {
  const template = await prisma.emailTemplate.findFirst({
    where: { name: "New User" },
    select: { id: true },
  });
  if (!template?.id) {
    console.error('Email template "New User" not found. Run: npm run db:seed:email-templates');
    process.exit(1);
  }

  const vars = newUserWelcome.VARIABLES;
  const updated = await prisma.emailTemplateLang.updateMany({
    where: { parentId: template.id, lang: "en" },
    data: {
      subject: newUserWelcome.SUBJECT,
      content: newUserWelcome.HTML_EN,
      variables: vars,
    },
  });

  if (updated.count === 0) {
    await prisma.emailTemplateLang.create({
      data: {
        parentId: template.id,
        lang: "en",
        subject: newUserWelcome.SUBJECT,
        content: newUserWelcome.HTML_EN,
        moduleName: "General",
        variables: vars,
      },
    });
    console.log('Created English row for "New User" template.');
  } else {
    console.log(`Updated "New User" template (${updated.count} row(s)).`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
