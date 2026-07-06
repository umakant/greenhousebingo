/* eslint-disable no-console */
/**
 * Seed POS catalog for security / field staff (radios, batteries, phones, etc.)
 * with categories, brands, units, and tax — scoped to a company tenant.
 *
 * Usage:
 *   npm run db:seed:security-products
 *   npm run db:seed:security-products:first-aid
 *   node ./scripts/seed-security-products-demo.js --force --email=crimson@mailsac.com
 */
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const FORCE = process.argv.includes("--force");
const PREFIX = "FAR-SEC-";

function readArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit ? hit.slice(prefix.length + 1).trim() : null;
}

const FILTER_EMAIL = readArg("--email");
const FILTER_NAME = readArg("--name");

const CATEGORIES = [
  { key: "comms", name: "Communications Equipment", description: "Radios, headsets, and field comms gear" },
  { key: "power", name: "Power & Batteries", description: "Batteries, chargers, and power accessories" },
  { key: "mobile", name: "Mobile Devices", description: "Phones and mobile accessories for staff" },
  { key: "safety", name: "Safety & Field Gear", description: "Flashlights, vests, and on-site essentials" },
];

const BRANDS = [
  { key: "motorola", name: "Motorola", description: "Two-way radios and comms" },
  { key: "kenwood", name: "Kenwood", description: "Professional radio equipment" },
  { key: "anker", name: "Anker", description: "Power banks and charging" },
  { key: "samsung", name: "Samsung", description: "Rugged mobile devices" },
  { key: "duracell", name: "Duracell", description: "Batteries and power cells" },
  { key: "firstaid", name: "First Aid Responders", description: "House brand field supplies" },
];

const UNITS = [
  { key: "pcs", name: "Piece", shortName: "pcs" },
  { key: "pair", name: "Pair", shortName: "pair" },
  { key: "pack", name: "Pack", shortName: "pack" },
  { key: "set", name: "Set", shortName: "set" },
];

const TAX = { name: "Sales Tax 8%", rate: 8, type: "percentage" };

const PRODUCTS = [
  {
    sku: `${PREFIX}RADIO-001`,
    name: "Motorola DP4400e Digital Radio",
    description: "UHF digital two-way radio for security supervisors and team leads.",
    price: 649.0,
    cost: 420.0,
    stock: 24,
    category: "comms",
    brand: "motorola",
    unit: "pcs",
  },
  {
    sku: `${PREFIX}RADIO-002`,
    name: "Kenwood NX-3320E Handheld Radio",
    description: "Compact handheld radio for roaming security staff.",
    price: 389.0,
    cost: 245.0,
    stock: 36,
    category: "comms",
    brand: "kenwood",
    unit: "pcs",
  },
  {
    sku: `${PREFIX}RADIO-003`,
    name: "Security Earpiece Kit (Acoustic Tube)",
    description: "Discreet earpiece with PTT mic — compatible with major radio models.",
    price: 34.99,
    cost: 14.5,
    stock: 120,
    category: "comms",
    brand: "firstaid",
    unit: "set",
  },
  {
    sku: `${PREFIX}BATT-001`,
    name: "Motorola PMNN4499 Radio Battery",
    description: "High-capacity Li-ion battery for DP4000 series radios.",
    price: 89.0,
    cost: 52.0,
    stock: 80,
    category: "power",
    brand: "motorola",
    unit: "pcs",
  },
  {
    sku: `${PREFIX}BATT-002`,
    name: "Kenwood KNB-45L Battery Pack",
    description: "Replacement battery pack for Kenwood NX handheld radios.",
    price: 72.0,
    cost: 41.0,
    stock: 65,
    category: "power",
    brand: "kenwood",
    unit: "pcs",
  },
  {
    sku: `${PREFIX}BATT-003`,
    name: "Duracell AA Procell (24-pack)",
    description: "Industrial AA batteries for flashlights and backup devices.",
    price: 18.99,
    cost: 11.2,
    stock: 200,
    category: "power",
    brand: "duracell",
    unit: "pack",
  },
  {
    sku: `${PREFIX}BATT-004`,
    name: "Anker PowerCore 20000mAh",
    description: "Portable charger for phones and mobile hotspots during long shifts.",
    price: 49.99,
    cost: 28.0,
    stock: 45,
    category: "power",
    brand: "anker",
    unit: "pcs",
  },
  {
    sku: `${PREFIX}PHONE-001`,
    name: "Samsung Galaxy XCover6 Pro",
    description: "Rugged smartphone for incident reporting and team messaging.",
    price: 499.0,
    cost: 365.0,
    stock: 18,
    category: "mobile",
    brand: "samsung",
    unit: "pcs",
  },
  {
    sku: `${PREFIX}PHONE-002`,
    name: "Samsung XCover6 Pro Case & Belt Clip",
    description: "Holster and belt clip for field-ready phone carry.",
    price: 24.99,
    cost: 9.5,
    stock: 40,
    category: "mobile",
    brand: "samsung",
    unit: "pcs",
  },
  {
    sku: `${PREFIX}PHONE-003`,
    name: "USB-C Fast Charging Cable (6ft)",
    description: "Heavy-duty braided cable for radios, phones, and power banks.",
    price: 12.99,
    cost: 4.25,
    stock: 150,
    category: "mobile",
    brand: "anker",
    unit: "pcs",
  },
  {
    sku: `${PREFIX}SAFE-001`,
    name: "LED Tactical Flashlight (1000lm)",
    description: "Rechargeable flashlight for night patrols and venue checks.",
    price: 29.99,
    cost: 15.0,
    stock: 60,
    category: "safety",
    brand: "firstaid",
    unit: "pcs",
  },
  {
    sku: `${PREFIX}SAFE-002`,
    name: "High-Visibility Security Vest (L/XL)",
    description: "Reflective vest for crowd control and parking detail.",
    price: 14.5,
    cost: 6.75,
    stock: 100,
    category: "safety",
    brand: "firstaid",
    unit: "pcs",
  },
];

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function findCategory(companyId, name) {
  return prisma.posCategory.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      OR: [{ createdBy: companyId }, { createdBy: null }],
    },
  });
}

async function ensureCategory(companyId, spec) {
  let row = await findCategory(companyId, spec.name);
  if (!row) {
    row = await prisma.posCategory.create({
      data: { name: spec.name, description: spec.description, createdBy: companyId },
    });
  } else if (FORCE) {
    row = await prisma.posCategory.update({
      where: { id: row.id },
      data: { description: spec.description, createdBy: companyId },
    });
  }
  return row;
}

async function ensureBrand(companyId, spec) {
  let row = await prisma.posBrand.findFirst({
    where: {
      name: { equals: spec.name, mode: "insensitive" },
      OR: [{ createdBy: companyId }, { createdBy: null }],
    },
  });
  if (!row) {
    row = await prisma.posBrand.create({
      data: { name: spec.name, description: spec.description, createdBy: companyId },
    });
  } else if (FORCE) {
    row = await prisma.posBrand.update({
      where: { id: row.id },
      data: { description: spec.description, createdBy: companyId },
    });
  }
  return row;
}

async function ensureUnit(companyId, spec) {
  let row = await prisma.posUnit.findFirst({
    where: {
      shortName: { equals: spec.shortName, mode: "insensitive" },
      OR: [{ createdBy: companyId }, { createdBy: null }],
    },
  });
  if (!row) {
    row = await prisma.posUnit.create({
      data: { name: spec.name, shortName: spec.shortName, createdBy: companyId },
    });
  }
  return row;
}

async function ensureTax(companyId) {
  let row = await prisma.posTax.findFirst({
    where: {
      name: { equals: TAX.name, mode: "insensitive" },
      OR: [{ createdBy: companyId }, { createdBy: null }],
    },
  });
  if (!row) {
    row = await prisma.posTax.create({
      data: { name: TAX.name, rate: TAX.rate, type: TAX.type, createdBy: companyId },
    });
  }
  return row;
}

async function upsertProduct(companyId, spec, refs) {
  const categoryId = refs.categories[spec.category]?.id ?? null;
  const brandId = refs.brands[spec.brand]?.id ?? null;
  const unitId = refs.units[spec.unit]?.id ?? null;
  const taxId = refs.tax?.id ?? null;

  const existing = await prisma.posProduct.findFirst({
    where: {
      OR: [
        { sku: spec.sku },
        { barcode: spec.sku },
        { organizationId: companyId, name: { equals: spec.name, mode: "insensitive" } },
      ],
    },
  });

  const data = {
    name: spec.name,
    description: spec.description,
    barcode: spec.sku,
    sku: spec.sku,
    slug: slugify(spec.name),
    price: spec.price,
    cost: spec.cost,
    stock: spec.stock,
    stockAlert: 5,
    categoryId,
    brandId,
    unitId,
    taxId,
    isActive: true,
    createdBy: companyId,
    organizationId: companyId,
  };

  if (existing) {
    await prisma.posProduct.update({ where: { id: existing.id }, data });
    return "updated";
  }
  await prisma.posProduct.create({ data });
  return "created";
}

async function seedCompany(company) {
  const companyId = company.id;
  const label = company.name ?? company.email;

  const existing = await prisma.posProduct.count({
    where: {
      organizationId: companyId,
      sku: { startsWith: PREFIX },
    },
  });

  if (existing > 0 && !FORCE) {
    console.log(
      `[security-products] Skipping ${label} — found ${existing} seeded products (use --force to refresh).`,
    );
    return;
  }

  console.log(`[security-products] Seeding catalog for ${label} (id ${companyId})…`);

  const categories = {};
  for (const c of CATEGORIES) {
    categories[c.key] = await ensureCategory(companyId, c);
  }

  const brands = {};
  for (const b of BRANDS) {
    brands[b.key] = await ensureBrand(companyId, b);
  }

  const units = {};
  for (const u of UNITS) {
    units[u.key] = await ensureUnit(companyId, u);
  }

  const tax = await ensureTax(companyId);

  let created = 0;
  let updated = 0;
  for (const p of PRODUCTS) {
    const result = await upsertProduct(companyId, p, { categories, brands, units, tax });
    if (result === "created") created += 1;
    else updated += 1;
  }

  const total = await prisma.posProduct.count({
    where: { organizationId: companyId, isActive: true },
  });

  console.log(
    `[security-products] ✓ ${label}: ${created} created, ${updated} updated (${CATEGORIES.length} categories, ${BRANDS.length} brands, ${UNITS.length} units).`,
  );
  console.log(`[security-products] Active products for tenant: ${total}`);
}

async function main() {
  console.log("[security-products] Starting security staff product seed…");

  const where = { type: "company", isActive: true };
  if (FILTER_EMAIL) where.email = { equals: FILTER_EMAIL, mode: "insensitive" };
  if (FILTER_NAME) where.name = { contains: FILTER_NAME, mode: "insensitive" };

  const companies = await prisma.user.findMany({
    where,
    orderBy: { id: "asc" },
    select: { id: true, name: true, email: true },
  });

  if (!companies.length) {
    console.error("[security-products] No company found. Try --email=crimson@mailsac.com");
    process.exit(1);
  }

  for (const company of companies) {
    await seedCompany(company);
  }

  console.log("[security-products] Done.");
}

main()
  .catch((err) => {
    console.error("[security-products] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
