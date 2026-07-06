/* eslint-disable no-console */
/**
 * Seeds the Water Ice Express landing-page membership plans (shown on /memberships).
 * Idempotent: upserts each plan by slug.
 *
 * Single source of truth: src/data/waterice/memberships.data.json.
 *
 * Usage: node ./scripts/seed-waterice-memberships.js
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const MEMBERSHIPS = require(path.join(__dirname, "..", "src", "data", "waterice", "memberships.data.json"));

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

async function upsertMembership(plan, sortOrder) {
  const slug = plan.slug || slugify(plan.name);
  const data = {
    name: plan.name,
    slug,
    price: plan.price ?? 0,
    billingPeriod: plan.billingPeriod ?? "month",
    tagline: plan.tagline ?? null,
    perks: plan.perks ?? [],
    badge: plan.badge ?? null,
    ctaLabel: plan.ctaLabel ?? "Join",
    featured: Boolean(plan.featured),
    published: plan.published !== false,
    sortOrder: plan.sortOrder ?? sortOrder,
  };
  const existing = await prisma.waterIceMembership.findFirst({ where: { slug }, select: { id: true } });
  if (existing) {
    await prisma.waterIceMembership.update({ where: { id: existing.id }, data });
    return { slug, created: false };
  }
  await prisma.waterIceMembership.create({ data });
  return { slug, created: true };
}

async function main() {
  console.log(`[seed-waterice-memberships] Seeding ${MEMBERSHIPS.length} membership plans.`);
  let created = 0;
  let updated = 0;
  let order = 0;
  for (const plan of MEMBERSHIPS) {
    const res = await upsertMembership(plan, order++);
    if (res.created) created++;
    else updated++;
    console.log(`  ${res.created ? "created" : "updated"} ${res.slug}`);
  }
  console.log(`[seed-waterice-memberships] Done. ${created} created, ${updated} updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
