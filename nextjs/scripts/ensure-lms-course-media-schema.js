/* eslint-disable no-console */
// Idempotently adds course-level video embed + PDF columns on lms_courses.

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({ log: ["error"] });

const STATEMENTS = [
  `ALTER TABLE lms_courses ADD COLUMN IF NOT EXISTS video_embed_url VARCHAR(2048) NULL;`,
  `ALTER TABLE lms_courses ADD COLUMN IF NOT EXISTS pdf_document_url VARCHAR(2048) NULL;`,
];

async function main() {
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("[ensure-lms-course-media-schema] lms_courses media columns ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
