/* eslint-disable no-console */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ log: ["error"] });

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS superadmin_resources (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(2048) NOT NULL,
    description TEXT NULL,
    category VARCHAR(128) NULL,
    resource_type VARCHAR(32) NOT NULL DEFAULT 'LINK',
    status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED',
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    added_by_id BIGINT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NULL
  );`,
  `ALTER TABLE superadmin_resources ADD COLUMN IF NOT EXISTS resource_type VARCHAR(32) NOT NULL DEFAULT 'LINK';`,
  `ALTER TABLE superadmin_resources ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED';`,
  `ALTER TABLE superadmin_resources ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE;`,
  `ALTER TABLE superadmin_resources ADD COLUMN IF NOT EXISTS added_by_id BIGINT NULL;`,
  `CREATE INDEX IF NOT EXISTS superadmin_resources_sort_order_title_idx ON superadmin_resources(sort_order, title);`,
  `CREATE INDEX IF NOT EXISTS superadmin_resources_category_idx ON superadmin_resources(category);`,
  `CREATE INDEX IF NOT EXISTS superadmin_resources_resource_type_idx ON superadmin_resources(resource_type);`,
  `CREATE INDEX IF NOT EXISTS superadmin_resources_is_favorite_idx ON superadmin_resources(is_favorite);`,
  `CREATE INDEX IF NOT EXISTS superadmin_resources_added_by_id_idx ON superadmin_resources(added_by_id);`,
];

async function main() {
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("[ensure-superadmin-resources-schema] superadmin_resources ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
