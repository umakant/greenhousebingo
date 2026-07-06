/* eslint-disable no-console */
/**
 * Sets / backfills the wholesale "Pack Size" options on every Water Ice Express
 * flavor product (pageTemplateKey = "waterice-flavor") in the dedicated superadmin
 * store org. Merges `packSizes` into each product's existing `flavor_meta` without
 * disturbing the other meta fields, so it is safe to run repeatedly and does NOT
 * require a full flavor reseed.
 *
 * Source of truth:
 *   - Per-flavor override: src/data/waterice/flavors.data.json (optional `packSizes`)
 *   - Default:            src/data/waterice/pack-sizes.data.json
 *
 * Usage: node ./scripts/seed-waterice-flavor-pack-sizes.js
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const FLAVORS = require(path.join(__dirname, "..", "src", "data", "waterice", "flavors.data.json"));
const DEFAULT_PACK_SIZES = require(path.join(__dirname, "..", "src", "data", "waterice", "pack-sizes.data.json"));

const STORE_ORG_EMAIL = "store@waterice-express.internal";
const PAGE_TEMPLATE_KEY = "waterice-flavor";

const flavorSlug = (name) =>
  String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// slug -> packSizes override (when a flavor defines its own in flavors.data.json)
const overridesBySlug = new Map();
for (const f of FLAVORS) {
  if (Array.isArray(f.packSizes) && f.packSizes.length > 0) {
    overridesBySlug.set(flavorSlug(f.name), f.packSizes);
  }
}

async function resolveStoreOrgId() {
  const envRaw = (process.env.WATERICE_STORE_ORG_ID ?? "").trim();
  if (/^\d+$/.test(envRaw)) {
    const existing = await prisma.user.findUnique({ where: { id: BigInt(envRaw) }, select: { id: true } });
    if (existing) return existing.id;
  }
  const byEmail = await prisma.user.findFirst({ where: { email: STORE_ORG_EMAIL }, select: { id: true } });
  return byEmail ? byEmail.id : null;
}

async function main() {
  const orgId = await resolveStoreOrgId();
  if (orgId == null) {
    console.error(
      "[seed-waterice-flavor-pack-sizes] Could not find the Water Ice Express store org. Run `npm run db:seed:waterice` first.",
    );
    process.exit(1);
  }

  const products = await prisma.posProduct.findMany({
    where: { organizationId: orgId, pageTemplateKey: PAGE_TEMPLATE_KEY },
    select: { id: true, slug: true, flavorMeta: true },
  });

  console.log(
    `[seed-waterice-flavor-pack-sizes] Store org ${orgId}: updating pack sizes on ${products.length} flavor products.`,
  );

  let updated = 0;
  for (const p of products) {
    const packSizes = (p.slug && overridesBySlug.get(p.slug)) || DEFAULT_PACK_SIZES;
    const meta = p.flavorMeta && typeof p.flavorMeta === "object" ? p.flavorMeta : {};
    const nextMeta = { ...meta, packSizes };
    await prisma.posProduct.update({ where: { id: p.id }, data: { flavorMeta: nextMeta } });
    updated++;
    console.log(`  updated ${p.slug ?? p.id} (${packSizes.length} pack sizes)`);
  }

  console.log(`[seed-waterice-flavor-pack-sizes] Done. ${updated} products updated.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
