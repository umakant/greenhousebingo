/* eslint-disable no-console */
/**
 * Seeds the Water Ice Express landing-page flavors into a DEDICATED, superadmin-owned
 * store organization that is separate from every customer company.
 *
 * - Creates (idempotently) a reserved store org `User` (type "platform", hidden from
 *   the Companies list) plus a `Website` for it (orders need a websiteId).
 * - Removes any previously-seeded flavor products/categories from the company seed org
 *   (PHILLY_SEED_ORG_ID, default 1000) so company catalogs are not polluted.
 * - Upserts each flavor as a published `PosProduct` under the store org, tagged
 *   `pageTemplateKey = "waterice-flavor"`, with rich fields in `flavor_meta`, and links
 *   the 5 category `StorefrontCollection`s.
 *
 * Single source of truth: src/data/waterice/flavors.data.json.
 *
 * Usage: node ./scripts/seed-waterice-flavors.js
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const FLAVORS = require(path.join(__dirname, "..", "src", "data", "waterice", "flavors.data.json"));
const DEFAULT_PACK_SIZES = require(path.join(__dirname, "..", "src", "data", "waterice", "pack-sizes.data.json"));

const STORE_ORG_EMAIL = "store@waterice-express.internal";
const STORE_ORG_NAME = "Water Ice Express";
const STORE_ORG_TYPE = "platform";
const PAGE_TEMPLATE_KEY = "waterice-flavor";
const CATEGORY_SLUGS = ["classic", "fruit", "cream-based", "candy", "tropical"];
const CLEANUP_ORG_ID = process.env.PHILLY_SEED_ORG_ID ? BigInt(process.env.PHILLY_SEED_ORG_ID) : 1000n;

const flavorSlug = (name) =>
  String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

async function nextUserId() {
  const agg = await prisma.user.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

async function ensureStoreOrg() {
  const envRaw = (process.env.WATERICE_STORE_ORG_ID ?? "").trim();
  if (/^\d+$/.test(envRaw)) {
    const existing = await prisma.user.findUnique({ where: { id: BigInt(envRaw) }, select: { id: true } });
    if (existing) return existing.id;
  }
  const byEmail = await prisma.user.findFirst({ where: { email: STORE_ORG_EMAIL }, select: { id: true } });
  if (byEmail) return byEmail.id;

  const id = await nextUserId();
  await prisma.user.create({
    data: {
      id,
      name: STORE_ORG_NAME,
      email: STORE_ORG_EMAIL,
      type: STORE_ORG_TYPE,
      isEnableLogin: false,
      isActive: true,
    },
  });
  console.log(`  created store org "${STORE_ORG_NAME}" (${id})`);
  return id;
}

async function ensureStoreWebsite(orgId) {
  const existing = await prisma.website.findFirst({
    where: { organizationId: orgId },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.website.create({
    data: {
      organizationId: orgId,
      name: STORE_ORG_NAME,
      slug: "water-ice-express",
      status: "active",
      defaultLocale: "en",
    },
    select: { id: true },
  });
  console.log(`  created store website (${created.id})`);
  return created.id;
}

async function cleanupCompanyOrgCopies() {
  const removedProducts = await prisma.posProduct.deleteMany({
    where: { organizationId: CLEANUP_ORG_ID, pageTemplateKey: PAGE_TEMPLATE_KEY },
  });
  const removedCollections = await prisma.storefrontCollection.deleteMany({
    where: { organizationId: CLEANUP_ORG_ID, slug: { in: CATEGORY_SLUGS } },
  });
  if (removedProducts.count || removedCollections.count) {
    console.log(
      `  cleanup org ${CLEANUP_ORG_ID}: removed ${removedProducts.count} flavor products, ${removedCollections.count} categories`,
    );
  }
}

async function upsertProduct(flavor, orgId) {
  const slug = flavorSlug(flavor.name);
  const flavorMeta = {
    category: flavor.category,
    rating: flavor.rating,
    reviews: flavor.reviews,
    ingredients: flavor.ingredients ?? [],
    tastingNotes: flavor.tastingNotes ?? "",
    pairsWith: flavor.pairsWith ?? [],
    highlights: flavor.highlights ?? [],
    packSizes:
      Array.isArray(flavor.packSizes) && flavor.packSizes.length > 0 ? flavor.packSizes : DEFAULT_PACK_SIZES,
  };
  const data = {
    name: flavor.name,
    description: flavor.description ?? null,
    price: flavor.price,
    compareAtPrice: flavor.oldPrice ?? null,
    cost: 0,
    stock: 100,
    image: flavor.image ?? null,
    organizationId: orgId,
    slug,
    sku: `WIE-${slug.toUpperCase()}`,
    storefrontPublished: true,
    storefrontFeatured: Number(flavor.reviews ?? 0) >= 200,
    isActive: true,
    inventoryPolicy: "continue",
    pageTemplateKey: PAGE_TEMPLATE_KEY,
    flavorMeta,
  };

  const existing = await prisma.posProduct.findFirst({
    where: { organizationId: orgId, slug },
    select: { id: true },
  });
  if (existing) {
    await prisma.posProduct.update({ where: { id: existing.id }, data });
    return { id: existing.id, slug, created: false };
  }
  const created = await prisma.posProduct.create({ data, select: { id: true } });
  return { id: created.id, slug, created: true };
}

async function upsertCollection(category, orgId, websiteId, sortOrder) {
  const slug = flavorSlug(category);
  const existing = await prisma.storefrontCollection.findFirst({
    where: { organizationId: orgId, slug },
    select: { id: true },
  });
  const data = {
    organizationId: orgId,
    websiteId: websiteId ?? null,
    slug,
    title: category,
    description: `${category} water ice flavors.`,
    published: true,
    sortOrder,
  };
  if (existing) {
    await prisma.storefrontCollection.update({ where: { id: existing.id }, data });
    return existing.id;
  }
  const created = await prisma.storefrontCollection.create({ data, select: { id: true } });
  return created.id;
}

async function linkProductToCollection(collectionId, productId, sortOrder) {
  const existing = await prisma.storefrontCollectionProduct.findFirst({
    where: { collectionId, productId },
    select: { id: true },
  });
  if (existing) {
    await prisma.storefrontCollectionProduct.update({ where: { id: existing.id }, data: { sortOrder } });
    return;
  }
  await prisma.storefrontCollectionProduct.create({ data: { collectionId, productId, sortOrder } });
}

async function main() {
  const orgId = await ensureStoreOrg();
  const websiteId = await ensureStoreWebsite(orgId);
  console.log(`[seed-waterice-flavors] Store org ${STORE_ORG_NAME} (${orgId}); website ${websiteId}; ${FLAVORS.length} flavors.`);

  await cleanupCompanyOrgCopies();

  const categories = [...new Set(FLAVORS.map((f) => f.category))];
  const collectionIdByCategory = new Map();
  let catOrder = 0;
  for (const category of categories) {
    const collectionId = await upsertCollection(category, orgId, websiteId, catOrder++);
    collectionIdByCategory.set(category, collectionId);
    console.log(`  collection ${category} -> ${collectionId}`);
  }

  let created = 0;
  let updated = 0;
  let order = 0;
  for (const flavor of FLAVORS) {
    const res = await upsertProduct(flavor, orgId);
    if (res.created) created++;
    else updated++;
    const collectionId = collectionIdByCategory.get(flavor.category);
    if (collectionId != null) await linkProductToCollection(collectionId, res.id, order++);
    console.log(`  ${res.created ? "created" : "updated"} ${res.slug}`);
  }

  console.log(
    `[seed-waterice-flavors] Done. ${created} created, ${updated} updated, ${categories.length} categories under store org ${orgId}.`,
  );
  if (!process.env.WATERICE_STORE_ORG_ID) {
    console.log(`[seed-waterice-flavors] Tip: optionally set WATERICE_STORE_ORG_ID=${orgId} in .env to pin the store org.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
