#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Seed demo superadmin Resources (mockup data).
 *
 * Usage:
 *   npm run db:seed:superadmin-resources
 *   node ./scripts/seed-superadmin-resources.js --force
 */
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const { RESOURCES } = require("./superadmin-resources-seed-data");

const prisma = new PrismaClient({ log: ["error"] });
const FORCE = process.argv.includes("--force");

async function findSuperadminUserId() {
  const role = await prisma.role.findFirst({
    where: { name: "superadmin" },
    select: { id: true },
  });
  if (!role) return null;
  const link = await prisma.modelHasRole.findFirst({
    where: { roleId: role.id },
    select: { modelId: true },
  });
  return link?.modelId ?? null;
}

function daysAgoDate(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(12, 0, 0, 0);
  return d;
}

async function main() {
  await prisma.$executeRawUnsafe(`SELECT 1 FROM superadmin_resources LIMIT 1`).catch(() => {
    console.error("[seed-superadmin-resources] Run: npm run db:ensure:superadmin-resources");
    process.exit(1);
  });

  const existing = await prisma.superadminResource.count();
  if (existing > 0 && !FORCE) {
    console.log(`[seed-superadmin-resources] ${existing} resource(s) already exist. Use --force to replace demo rows.`);
    return;
  }

  if (FORCE && existing > 0) {
    const titles = RESOURCES.map((r) => r.title);
    await prisma.superadminResource.deleteMany({
      where: { title: { in: titles } },
    });
    console.log("[seed-superadmin-resources] Removed prior demo rows (--force).");
  }

  const addedById = await findSuperadminUserId();

  let n = 0;
  for (const row of RESOURCES) {
    const createdAt = daysAgoDate(row.daysAgo ?? 0);
    await prisma.superadminResource.create({
      data: {
        title: row.title,
        url: row.url,
        description: row.description,
        category: row.category,
        resourceType: row.resourceType,
        status: "PUBLISHED",
        isFavorite: row.isFavorite ?? false,
        addedById,
        sortOrder: n,
        createdAt,
      },
    });
    n += 1;
  }

  console.log(`[seed-superadmin-resources] Seeded ${n} demo resources.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
