/* eslint-disable no-console */
/**
 * Add address + lat/long columns to gantt_project_locations (idempotent).
 * Usage: npm run db:ensure:gantt-locations
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({ log: ["error"] });

const STATEMENTS = [
  `ALTER TABLE gantt_project_locations ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(512) NULL;`,
  `ALTER TABLE gantt_project_locations ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(512) NULL;`,
  `ALTER TABLE gantt_project_locations ADD COLUMN IF NOT EXISTS city VARCHAR(128) NULL;`,
  `ALTER TABLE gantt_project_locations ADD COLUMN IF NOT EXISTS state VARCHAR(64) NULL;`,
  `ALTER TABLE gantt_project_locations ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20) NULL;`,
  `ALTER TABLE gantt_project_locations ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7) NULL;`,
  `ALTER TABLE gantt_project_locations ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7) NULL;`,
  `ALTER TABLE gantt_project_locations ADD COLUMN IF NOT EXISTS show_location_map BOOLEAN NOT NULL DEFAULT false;`,
];

async function main() {
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("✓ gantt_project_locations columns ensured (address, coordinates, show_location_map).");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
