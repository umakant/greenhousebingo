/* eslint-disable no-console */
/**
 * Seeds the Water Ice Express landing-page eBooks into the SAME DEDICATED,
 * superadmin-owned store organization used by the flavors seeder (separate from
 * every customer company).
 *
 * - Creates (idempotently) the reserved store org `User` (type "platform", hidden
 *   from the Companies list) plus a `Website` for it (orders need a websiteId).
 * - Removes any previously-seeded eBook products/categories from the company seed
 *   org (PHILLY_SEED_ORG_ID, default 1000) so company catalogs are not polluted.
 * - Upserts each eBook as a published `PosProduct` under the store org, tagged
 *   `pageTemplateKey = "waterice-ebook"`, with rich fields in `ebook_meta`, and
 *   links the category `StorefrontCollection`s.
 *
 * Single source of truth: src/data/waterice/ebooks.data.json.
 *
 * Usage: node ./scripts/seed-waterice-ebooks.js
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const BOOKS = require(path.join(__dirname, "..", "src", "data", "waterice", "ebooks.data.json"));

const STORE_ORG_EMAIL = "store@waterice-express.internal";
const STORE_ORG_NAME = "Water Ice Express";
const STORE_ORG_TYPE = "platform";
const PAGE_TEMPLATE_KEY = "waterice-ebook";
const CLEANUP_ORG_ID = process.env.PHILLY_SEED_ORG_ID ? BigInt(process.env.PHILLY_SEED_ORG_ID) : 1000n;

const slugify = (value) =>
  String(value)
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
  const categorySlugs = [...new Set(BOOKS.map((b) => slugify(b.category)))];
  const removedProducts = await prisma.posProduct.deleteMany({
    where: { organizationId: CLEANUP_ORG_ID, pageTemplateKey: PAGE_TEMPLATE_KEY },
  });
  const removedCollections = await prisma.storefrontCollection.deleteMany({
    where: { organizationId: CLEANUP_ORG_ID, slug: { in: categorySlugs } },
  });
  if (removedProducts.count || removedCollections.count) {
    console.log(
      `  cleanup org ${CLEANUP_ORG_ID}: removed ${removedProducts.count} eBook products, ${removedCollections.count} categories`,
    );
  }
}

async function upsertProduct(book, orgId) {
  const slug = book.slug || slugify(book.title);
  const ebookMeta = {
    category: book.category,
    pages: book.pages,
    rating: book.rating,
    reviews: book.reviews,
    tagline: book.tagline ?? "",
    highlights: book.highlights ?? [],
    chapters: book.chapters ?? [],
    author: book.author ?? { name: STORE_ORG_NAME, role: "Publisher" },
  };
  const data = {
    name: book.title,
    description: book.description ?? null,
    price: book.price,
    compareAtPrice: book.oldPrice ?? null,
    cost: 0,
    stock: 100,
    image: book.cover ?? null,
    organizationId: orgId,
    slug,
    sku: `WIE-EBOOK-${slug.toUpperCase()}`,
    storefrontPublished: true,
    storefrontFeatured: Number(book.reviews ?? 0) >= 50,
    isActive: true,
    inventoryPolicy: "continue",
    pageTemplateKey: PAGE_TEMPLATE_KEY,
    ebookMeta,
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
  const slug = slugify(category);
  const existing = await prisma.storefrontCollection.findFirst({
    where: { organizationId: orgId, slug },
    select: { id: true },
  });
  const data = {
    organizationId: orgId,
    websiteId: websiteId ?? null,
    slug,
    title: category,
    description: `${category} water ice eBooks.`,
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
  console.log(`[seed-waterice-ebooks] Store org ${STORE_ORG_NAME} (${orgId}); website ${websiteId}; ${BOOKS.length} eBooks.`);

  await cleanupCompanyOrgCopies();

  const categories = [...new Set(BOOKS.map((b) => b.category))];
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
  for (const book of BOOKS) {
    const res = await upsertProduct(book, orgId);
    if (res.created) created++;
    else updated++;
    const collectionId = collectionIdByCategory.get(book.category);
    if (collectionId != null) await linkProductToCollection(collectionId, res.id, order++);
    console.log(`  ${res.created ? "created" : "updated"} ${res.slug}`);
  }

  console.log(
    `[seed-waterice-ebooks] Done. ${created} created, ${updated} updated, ${categories.length} categories under store org ${orgId}.`,
  );
  if (!process.env.WATERICE_STORE_ORG_ID) {
    console.log(`[seed-waterice-ebooks] Tip: optionally set WATERICE_STORE_ORG_ID=${orgId} in .env to pin the store org.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
