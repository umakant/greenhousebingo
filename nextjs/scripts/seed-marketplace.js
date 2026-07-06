/* eslint-disable no-console */
// Seeds the Marketplace module with the first vendor (Water Ice Express),
// its product categories, and a set of sample products.
//
// Idempotent: vendors are upserted by unique slug, categories by unique
// (vendor_id, slug), and products by unique slug. Re-running updates the
// existing rows in place instead of creating duplicates.
//
// Prereq: marketplace tables must already exist (npm run db:ensure:marketplace
// and db:ensure:marketplace-domain run on prebuild / can be run manually).

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({ log: ["error"] });

const VENDOR = {
  name: "Water Ice Express",
  slug: "water-ice-express",
  description:
    "Order water ice buckets, coolers, cups, spoons, napkins, supplies, and event-ready frozen products.",
  status: "active",
};

// Categories (sortOrder follows array order).
const CATEGORIES = [
  { name: "Water Ice Buckets", slug: "water-ice-buckets" },
  { name: "Flavors", slug: "flavors" },
  { name: "Coolers", slug: "coolers" },
  { name: "Cups", slug: "cups" },
  { name: "Spoons", slug: "spoons" },
  { name: "Napkins", slug: "napkins" },
  { name: "Serving Supplies", slug: "serving-supplies" },
  { name: "Bundles", slug: "bundles" },
  { name: "Seasonal Specials", slug: "seasonal-specials" },
];

// Sample products. categorySlug links to one of the categories above.
// bucketCountValue = 1 for water ice buckets, 0 for supplies.
const PRODUCTS = [
  {
    name: "Cherry Water Ice Bucket",
    slug: "cherry-water-ice-bucket",
    categorySlug: "water-ice-buckets",
    description: "Classic cherry water ice in a ready-to-serve bucket. Approx. 3 gallons.",
    price: 24.99,
    bucketCountValue: 1,
    inventoryCount: 100,
    sku: "WIE-BUCKET-CHERRY",
  },
  {
    name: "Lemon Water Ice Bucket",
    slug: "lemon-water-ice-bucket",
    categorySlug: "water-ice-buckets",
    description: "Tart and refreshing lemon water ice in a ready-to-serve bucket. Approx. 3 gallons.",
    price: 24.99,
    bucketCountValue: 1,
    inventoryCount: 100,
    sku: "WIE-BUCKET-LEMON",
  },
  {
    name: "Blue Raspberry Water Ice Bucket",
    slug: "blue-raspberry-water-ice-bucket",
    categorySlug: "water-ice-buckets",
    description: "Bold blue raspberry water ice in a ready-to-serve bucket. Approx. 3 gallons.",
    price: 25.99,
    bucketCountValue: 1,
    inventoryCount: 100,
    sku: "WIE-BUCKET-BLUERASP",
  },
  {
    name: "Mango Water Ice Bucket",
    slug: "mango-water-ice-bucket",
    categorySlug: "water-ice-buckets",
    description: "Sweet tropical mango water ice in a ready-to-serve bucket. Approx. 3 gallons.",
    price: 26.99,
    bucketCountValue: 1,
    inventoryCount: 80,
    sku: "WIE-BUCKET-MANGO",
  },
  {
    name: "Cooler",
    slug: "cooler",
    categorySlug: "coolers",
    description: "Insulated cooler to keep water ice buckets frozen during transport and events.",
    price: 49.99,
    bucketCountValue: 0,
    inventoryCount: 40,
    sku: "WIE-COOLER",
  },
  {
    name: "Cups Pack",
    slug: "cups-pack",
    categorySlug: "cups",
    description: "Pack of 100 disposable serving cups sized for water ice.",
    price: 12.99,
    bucketCountValue: 0,
    inventoryCount: 200,
    sku: "WIE-CUPS-100",
  },
  {
    name: "Spoons Pack",
    slug: "spoons-pack",
    categorySlug: "spoons",
    description: "Pack of 100 disposable spoons for serving water ice.",
    price: 6.99,
    bucketCountValue: 0,
    inventoryCount: 200,
    sku: "WIE-SPOONS-100",
  },
  {
    name: "Napkins Pack",
    slug: "napkins-pack",
    categorySlug: "napkins",
    description: "Pack of 250 napkins for events and serving stations.",
    price: 4.99,
    bucketCountValue: 0,
    inventoryCount: 200,
    sku: "WIE-NAPKINS-250",
  },
];

async function main() {
  console.log("Seeding Marketplace module...");

  // 1) Vendor (upsert by unique slug).
  const vendor = await prisma.marketplaceVendor.upsert({
    where: { slug: VENDOR.slug },
    update: {
      name: VENDOR.name,
      description: VENDOR.description,
      status: VENDOR.status,
      updatedAt: new Date(),
    },
    create: {
      name: VENDOR.name,
      slug: VENDOR.slug,
      description: VENDOR.description,
      status: VENDOR.status,
    },
  });
  console.log(`Vendor ready: ${vendor.name} (id=${vendor.id})`);

  // 2) Categories (upsert by unique (vendorId, slug)).
  const categoryIdBySlug = {};
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    const cat = await prisma.marketplaceCategory.upsert({
      where: { vendorId_slug: { vendorId: vendor.id, slug: c.slug } },
      update: {
        name: c.name,
        sortOrder: i,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        vendorId: vendor.id,
        name: c.name,
        slug: c.slug,
        sortOrder: i,
        isActive: true,
      },
    });
    categoryIdBySlug[c.slug] = cat.id;
  }
  console.log(`Categories ready: ${CATEGORIES.length}`);

  // 3) Products (upsert by unique slug).
  for (const p of PRODUCTS) {
    const categoryId = categoryIdBySlug[p.categorySlug] ?? null;
    const categoryName = CATEGORIES.find((c) => c.slug === p.categorySlug)?.name ?? null;
    await prisma.marketplaceProduct.upsert({
      where: { slug: p.slug },
      update: {
        vendorId: vendor.id,
        categoryId,
        name: p.name,
        sku: p.sku,
        description: p.description,
        price: p.price,
        currency: "USD",
        category: categoryName,
        bucketCountValue: p.bucketCountValue,
        inventoryCount: p.inventoryCount,
        stock: p.inventoryCount,
        isActive: true,
        status: "active",
        updatedAt: new Date(),
      },
      create: {
        vendorId: vendor.id,
        categoryId,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        description: p.description,
        price: p.price,
        currency: "USD",
        category: categoryName,
        bucketCountValue: p.bucketCountValue,
        inventoryCount: p.inventoryCount,
        stock: p.inventoryCount,
        isActive: true,
        status: "active",
      },
    });
  }
  console.log(`Products ready: ${PRODUCTS.length}`);

  console.log("Done. Marketplace seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
