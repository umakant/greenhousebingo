/* eslint-disable no-console */
/**
 * Seeds storefront commerce test data for Days 21–30 manual QA:
 * - Binds organization 1000 (company@example.com) demo products to the tenant
 * - Ensures a Website + Domain (localhost) so /shop resolves in dev
 * - Publishes slugs + a published collection linked to products
 *
 * Prerequisites: run seed-company.js and seed-pos-demo-data.js first (or equivalent data).
 * Usage: node ./scripts/seed-storefront-commerce-demo.js
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ORG_ID = 1000n;

function slugify(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "product";
}

async function main() {
  const owner = await prisma.user.findUnique({ where: { id: ORG_ID }, select: { id: true, email: true } });
  if (!owner) {
    console.error("[seed-storefront-commerce-demo] Missing user id 1000 — run seed-company.js first.");
    process.exit(1);
  }
  console.log(`[seed-storefront-commerce-demo] Organization: ${owner.email} (${ORG_ID})`);

  let website = await prisma.website.findFirst({
    where: { organizationId: ORG_ID },
    orderBy: { id: "asc" },
  });
  if (!website) {
    website = await prisma.website.create({
      data: {
        organizationId: ORG_ID,
        name: "Demo Storefront",
        slug: "demo-store",
        status: "active",
      },
    });
    console.log("[seed-storefront-commerce-demo] Created website", website.id.toString());
  }

  const host = "localhost";
  let domain = await prisma.domain.findUnique({ where: { hostname: host } });
  if (!domain) {
    domain = await prisma.domain.create({
      data: {
        organizationId: ORG_ID,
        websiteId: website.id,
        hostname: host,
        status: "active",
        isPrimary: true,
      },
    });
    console.log("[seed-storefront-commerce-demo] Created domain localhost → website", website.id.toString());
  } else if (domain.websiteId !== website.id || domain.organizationId !== ORG_ID) {
    console.warn(
      "[seed-storefront-commerce-demo] Domain localhost already exists for another site — skipping domain update.",
    );
  }

  const demoBarcodes = [
    "DEMO-COFFEE-001",
    "DEMO-NOTE-002",
    "DEMO-USB-003",
    "DEMO-BOTTLE-004",
    "DEMO-SNACK-005",
  ];

  const productIds = [];
  for (const barcode of demoBarcodes) {
    const p = await prisma.posProduct.findFirst({ where: { barcode } });
    if (!p) {
      console.warn(`[seed-storefront-commerce-demo] Missing product ${barcode} — run seed-pos-demo-data.js.`);
      continue;
    }
    const slug = slugify(p.name);
    await prisma.posProduct.update({
      where: { id: p.id },
      data: {
        organizationId: ORG_ID,
        slug,
        storefrontPublished: true,
        inventoryPolicy: "track",
        isActive: true,
      },
    });
    productIds.push(p.id);
    console.log(`[seed-storefront-commerce-demo] Published ${barcode} → /shop/products/${slug}`);
  }

  let collection = await prisma.storefrontCollection.findFirst({
    where: { organizationId: ORG_ID, slug: "featured" },
  });
  if (!collection) {
    collection = await prisma.storefrontCollection.create({
      data: {
        organizationId: ORG_ID,
        websiteId: website.id,
        slug: "featured",
        title: "Featured",
        description: "Seeded collection for manual storefront tests.",
        published: true,
      },
    });
  } else {
    await prisma.storefrontCollection.update({
      where: { id: collection.id },
      data: { published: true, websiteId: website.id },
    });
  }

  for (let i = 0; i < productIds.length; i++) {
    const pid = productIds[i];
    await prisma.storefrontCollectionProduct.upsert({
      where: {
        collectionId_productId: { collectionId: collection.id, productId: pid },
      },
      create: {
        collectionId: collection.id,
        productId: pid,
        sortOrder: i,
      },
      update: { sortOrder: i },
    });
  }

  console.log("[seed-storefront-commerce-demo] OK");
  console.log(`  Shop home:     http://localhost:5000/shop`);
  console.log(`  Collection:    http://localhost:5000/shop/collections/featured`);
  console.log(`  Cart / checkout: /shop/cart , /shop/checkout`);
  console.log(`  Staff orders UI: /storefront/orders (logged-in merchant)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
