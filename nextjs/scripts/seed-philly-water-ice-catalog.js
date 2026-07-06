/* eslint-disable no-console */
/**
 * Creates published POS products (slugs + images) for the Philly Water Ice–style Concept homepage grid.
 * Run after base company/POS seeds. Uses organization id from PHILLY_SEED_ORG_ID or defaults to 1000.
 *
 * Usage: node ./scripts/seed-philly-water-ice-catalog.js
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ORG_ID = process.env.PHILLY_SEED_ORG_ID ? BigInt(process.env.PHILLY_SEED_ORG_ID) : 1000n;

const FLAVORS = [
  {
    slug: "blue-raspberry-water-ice",
    name: "Blue Raspberry",
    description: "Sweet blue raspberry water ice — icy, fruity, refreshing.",
    price: 5.99,
    stock: 59,
    image: "/storefront/philly-water-ice/bestsellers/blue-raspberry.png",
    sku: "PWI-BR-001",
  },
  {
    slug: "strawberry-water-ice",
    name: "Strawberry",
    description: "Classic strawberry water ice — smooth scoop, real berry flavor.",
    price: 5.99,
    stock: 15,
    image: "/storefront/philly-water-ice/bestsellers/strawberry.png",
    sku: "PWI-ST-002",
  },
  {
    slug: "green-apple-water-ice",
    name: "Green Apple",
    description: "Tart green apple water ice — crisp, cool, refreshing.",
    price: 5.99,
    stock: 8,
    image: "/storefront/philly-water-ice/bestsellers/apple.png",
    sku: "PWI-GA-003",
  },
  {
    slug: "pineapple-water-ice",
    name: "Pineapple",
    description: "Golden pineapple water ice — tropical, juicy, bright.",
    price: 5.99,
    stock: 11,
    image: "/storefront/philly-water-ice/bestsellers/pineapple.png",
    sku: "PWI-PI-004",
  },
  {
    slug: "coconut-water-ice",
    name: "Coconut",
    description: "Creamy coconut water ice — smooth, cool, refreshing.",
    price: 5.99,
    stock: 24,
    image: "/storefront/philly-water-ice/bestsellers/coconut.png",
    sku: "PWI-CO-005",
  },
  {
    slug: "mango-water-ice",
    name: "Mango",
    description: "Ripe mango water ice — sunny, sweet, tropical.",
    price: 5.99,
    stock: 15,
    image: "/storefront/philly-water-ice/bestsellers/mango.png",
    sku: "PWI-MG-006",
  },
  {
    slug: "lime-water-ice",
    name: "Lime",
    description: "Zesty lime water ice — bright citrus, ice-cold.",
    price: 5.99,
    stock: 3,
    image: "/storefront/philly-water-ice/bestsellers/lime.png",
    sku: "PWI-LM-007",
  },
  {
    slug: "cherry-water-ice",
    name: "Cherry",
    description: "Bold cherry water ice — rich fruit, ice-cold finish.",
    price: 5.99,
    stock: 4,
    image: "/storefront/philly-water-ice/bestsellers/cherry.png",
    sku: "PWI-CH-008",
  },
];

async function main() {
  const owner = await prisma.user.findUnique({ where: { id: ORG_ID }, select: { id: true, email: true } });
  if (!owner) {
    console.error(`[seed-philly-water-ice-catalog] No user id ${ORG_ID} — set PHILLY_SEED_ORG_ID or run seed-company.`);
    process.exit(1);
  }
  console.log(`[seed-philly-water-ice-catalog] Organization ${owner.email} (${ORG_ID})`);

  for (const row of FLAVORS) {
    const existing = await prisma.posProduct.findFirst({
      where: { organizationId: ORG_ID, slug: row.slug },
    });
    const data = {
      name: row.name,
      description: row.description,
      price: row.price,
      cost: 0,
      stock: row.stock,
      sku: row.sku,
      barcode: row.sku,
      image: row.image,
      organizationId: ORG_ID,
      slug: row.slug,
      storefrontPublished: true,
      isActive: true,
      inventoryPolicy: "track",
    };
    if (existing) {
      await prisma.posProduct.update({ where: { id: existing.id }, data });
      console.log(`  updated ${row.slug}`);
    } else {
      await prisma.posProduct.create({ data });
      console.log(`  created ${row.slug}`);
    }
  }

  console.log("[seed-philly-water-ice-catalog] Done. Homepage flavor slider will use these when /shop loads.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
