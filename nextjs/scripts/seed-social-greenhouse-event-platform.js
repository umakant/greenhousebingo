/* eslint-disable no-console */
/**
 * Seeds Event Platform library data for The Social Greenhouse:
 * hosts, sponsors, bingo games, and event FAQs.
 *
 *   npm run db:seed:social-greenhouse:library
 *   node ./scripts/seed-social-greenhouse-event-platform.js --slug=DN-0001-CO-26
 */
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const companyData = require("./social-greenhouse-company-data");
const libraryData = require("./social-greenhouse-event-platform-data");

const prisma = new PrismaClient();

function readArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit ? hit.slice(prefix.length + 1).trim() : null;
}

const FILTER_EMAIL = readArg("--email") || companyData.email;
const FILTER_NAME = readArg("--name");
const FILTER_SLUG = readArg("--slug") || companyData.slug;

async function assertSchema() {
  try {
    await prisma.$queryRaw`SELECT 1 FROM event_hosts LIMIT 1`;
    await prisma.$queryRaw`SELECT 1 FROM event_sponsors LIMIT 1`;
    await prisma.$queryRaw`SELECT 1 FROM event_bingo_games LIMIT 1`;
    await prisma.$queryRaw`SELECT 1 FROM event_bingo_faqs LIMIT 1`;
  } catch {
    console.error(
      "[seed-social-greenhouse-library] Missing tables. Run: npm run db:ensure:event-platform && npx prisma generate",
    );
    process.exit(1);
  }
}

async function findCompany() {
  if (FILTER_SLUG) {
    const bySlug = await prisma.user.findFirst({
      where: {
        slug: { equals: FILTER_SLUG, mode: "insensitive" },
        type: { in: ["company", "company_admin"] },
      },
      select: { id: true, email: true, name: true, slug: true },
    });
    if (bySlug) return bySlug;
  }

  const where = { type: { in: ["company", "company_admin"] }, isActive: true };
  if (FILTER_EMAIL) where.email = { equals: FILTER_EMAIL, mode: "insensitive" };
  if (FILTER_NAME) where.name = { contains: FILTER_NAME, mode: "insensitive" };

  return prisma.user.findFirst({
    where,
    orderBy: { id: "asc" },
    select: { id: true, email: true, name: true, slug: true },
  });
}

async function upsertHost(orgId, row) {
  const email = row.email.trim().toLowerCase();
  const existing = await prisma.eventHost.findFirst({
    where: { organizationId: orgId, email, archivedAt: null },
  });
  const data = {
    organizationId: orgId,
    displayName: row.displayName.trim(),
    email,
    phone: row.phone?.trim() || null,
    bio: row.bio?.trim() || null,
    imageUrl: row.imageUrl?.trim() || null,
    status: row.status ?? "active",
    updatedById: orgId,
    updatedAt: new Date(),
  };
  if (existing) {
    return prisma.eventHost.update({ where: { id: existing.id }, data });
  }
  return prisma.eventHost.create({
    data: { ...data, createdById: orgId },
  });
}

async function upsertSponsor(orgId, row) {
  const name = row.name.trim();
  const existing = await prisma.eventSponsor.findFirst({
    where: { organizationId: orgId, name, archivedAt: null },
  });
  const data = {
    organizationId: orgId,
    name,
    address: row.address?.trim() || null,
    phone: row.phone?.trim() || null,
    perk: row.perk?.trim() || null,
    website: row.website?.trim() || null,
    imageUrl: row.imageUrl?.trim() || null,
    status: row.status ?? "active",
    updatedById: orgId,
    updatedAt: new Date(),
  };
  if (existing) {
    return prisma.eventSponsor.update({ where: { id: existing.id }, data });
  }
  return prisma.eventSponsor.create({
    data: { ...data, createdById: orgId },
  });
}

async function upsertBingoGame(orgId, row) {
  const name = row.name.trim();
  const existing = await prisma.eventBingoGame.findFirst({
    where: { organizationId: orgId, name, archivedAt: null },
  });
  const data = {
    organizationId: orgId,
    name,
    pattern: row.pattern.trim(),
    difficulty: row.difficulty.trim(),
    prize: row.prize.trim(),
    description: row.description?.trim() || null,
    sortOrder: row.sortOrder ?? 0,
    status: row.status ?? "active",
    updatedById: orgId,
    updatedAt: new Date(),
  };
  if (existing) {
    return prisma.eventBingoGame.update({ where: { id: existing.id }, data });
  }
  return prisma.eventBingoGame.create({
    data: { ...data, createdById: orgId },
  });
}

async function upsertFaq(orgId, row) {
  const question = row.question.trim();
  const existing = await prisma.eventBingoFaq.findFirst({
    where: { organizationId: orgId, question, archivedAt: null },
  });
  const data = {
    organizationId: orgId,
    question,
    answer: row.answer.trim(),
    sortOrder: row.sortOrder ?? 0,
    status: row.status ?? "active",
    updatedById: orgId,
    updatedAt: new Date(),
  };
  if (existing) {
    return prisma.eventBingoFaq.update({ where: { id: existing.id }, data });
  }
  return prisma.eventBingoFaq.create({
    data: { ...data, createdById: orgId },
  });
}

async function main() {
  await assertSchema();

  const company = await findCompany();
  if (!company) {
    console.error(
      `[seed-social-greenhouse-library] Company not found. Run npm run db:seed:social-greenhouse first, or pass --slug=${companyData.slug}`,
    );
    process.exit(1);
  }

  const orgId = company.id;
  console.log(
    `[seed-social-greenhouse-library] Org ${orgId.toString()} (${company.name ?? company.email}, slug=${company.slug ?? "—"})`,
  );

  const hosts = [];
  for (const row of libraryData.hosts) {
    hosts.push(await upsertHost(orgId, row));
  }

  const sponsors = [];
  for (const row of libraryData.sponsors) {
    sponsors.push(await upsertSponsor(orgId, row));
  }

  const bingoGames = [];
  for (const row of libraryData.bingoGames) {
    bingoGames.push(await upsertBingoGame(orgId, row));
  }

  const faqs = [];
  for (const row of libraryData.faqs ?? []) {
    faqs.push(await upsertFaq(orgId, row));
  }

  console.log("[seed-social-greenhouse-library] Done.");
  console.log(`  Hosts: ${hosts.length}`);
  hosts.forEach((h) => console.log(`    • ${h.displayName} <${h.email}>`));
  console.log(`  Sponsors: ${sponsors.length}`);
  sponsors.forEach((s) => console.log(`    • ${s.name}`));
  console.log(`  Bingo games: ${bingoGames.length}`);
  bingoGames.forEach((g) => console.log(`    • ${g.sortOrder}. ${g.name} (${g.difficulty}) → ${g.prize}`));
  console.log(`  Event FAQs: ${faqs.length}`);
  faqs.forEach((f) => console.log(`    • ${f.sortOrder}. ${f.question}`));
  console.log("  Admin:");
  console.log("    http://localhost:5000/admin/event-platform/hosts");
  console.log("    http://localhost:5000/admin/event-platform/sponsors");
  console.log("    http://localhost:5000/admin/event-platform/bingo-games");
  console.log("    http://localhost:5000/admin/event-platform/event-faqs");
}

main()
  .catch((err) => {
    console.error("[seed-social-greenhouse-library] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
