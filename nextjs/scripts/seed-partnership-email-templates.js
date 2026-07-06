/* eslint-disable no-console */
/**
 * Upserts partnership email templates (styled SECURX layout).
 * Usage: node scripts/seed-partnership-email-templates.js
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const { TEMPLATES } = require("./lib/partnership-email-templates");

const prisma = new PrismaClient();
const DEFAULT_FROM = "SecurX";

function parseVariables(varsStr) {
  try {
    return typeof varsStr === "string" ? JSON.parse(varsStr) : varsStr;
  } catch {
    return {};
  }
}

async function main() {
  console.log("Seeding Partnership email templates...");
  let created = 0;
  let updated = 0;
  let nextTemplateId = null;
  let nextLangId = null;

  for (const t of TEMPLATES) {
    const variablesObj = parseVariables(t.variables);
    let template = await prisma.emailTemplate.findFirst({
      where: { name: t.name, moduleName: t.moduleName },
      select: { id: true },
    });

    if (!template) {
      if (nextTemplateId == null) {
        const max = await prisma.emailTemplate.aggregate({ _max: { id: true } });
        nextTemplateId = (max._max.id ?? 0n) + 1n;
      }
      template = await prisma.emailTemplate.create({
        data: {
          id: nextTemplateId++,
          name: t.name,
          from: DEFAULT_FROM,
          moduleName: t.moduleName,
        },
      });
      created++;
    } else {
      updated++;
    }

    for (const [lang, content] of Object.entries(t.langContent)) {
      const existingLang = await prisma.emailTemplateLang.findFirst({
        where: { parentId: template.id, lang },
        select: { id: true },
      });
      if (existingLang) {
        await prisma.emailTemplateLang.update({
          where: { id: existingLang.id },
          data: {
            subject: t.subject,
            content,
            moduleName: t.moduleName,
            variables: variablesObj,
            updatedAt: new Date(),
          },
        });
      } else {
        if (nextLangId == null) {
          const maxLang = await prisma.emailTemplateLang.aggregate({ _max: { id: true } });
          nextLangId = (maxLang._max.id ?? 0n) + 1n;
        }
        await prisma.emailTemplateLang.create({
          data: {
            id: nextLangId++,
            parentId: template.id,
            lang,
            subject: t.subject,
            content,
            moduleName: t.moduleName,
            variables: variablesObj,
          },
        });
      }
    }
  }

  console.log(`Done. Created ${created}, updated ${updated} partnership email templates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
