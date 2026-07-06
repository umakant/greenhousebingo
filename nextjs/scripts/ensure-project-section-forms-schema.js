/**
 * Adds project_section_id to forms for project ops ↔ Form Builder linking.
 * Run: node scripts/ensure-project-section-forms-schema.js
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const STATEMENTS = [
  `ALTER TABLE forms ADD COLUMN IF NOT EXISTS project_section_id VARCHAR(64) NULL;`,
  `CREATE UNIQUE INDEX IF NOT EXISTS forms_company_project_section_uidx
     ON forms (created_by, project_section_id)
     WHERE project_section_id IS NOT NULL;`,
];

async function main() {
  for (const sql of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log("OK:", sql.split("\n")[0].trim());
    } catch (err) {
      console.warn("Skipped:", err?.message ?? err);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
