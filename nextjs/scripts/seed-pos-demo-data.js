/* eslint-disable no-console */
/**
 * Seeds minimal POS demo data: category, unit, brand, tax (optional), and products with stock > 0
 * so the POS Terminal (/pos) shows sellable items.
 *
 * Usage: node ./scripts/seed-pos-demo-data.js
 * Requires: .env with DATABASE_URL (same as prisma)
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  let cat = await prisma.posCategory.findFirst({ where: { name: "Demo General" } });
  if (!cat) {
    cat = await prisma.posCategory.create({
      data: { name: "Demo General", description: "Seeded for POS testing" },
    });
  }

  let unit = await prisma.posUnit.findFirst({ where: { shortName: "pc" } });
  if (!unit) {
    unit = await prisma.posUnit.create({ data: { name: "Piece", shortName: "pc" } });
  }

  let brand = await prisma.posBrand.findFirst({ where: { name: "Demo Brand" } });
  if (!brand) {
    brand = await prisma.posBrand.create({ data: { name: "Demo Brand" } });
  }

  let tax = await prisma.posTax.findFirst({ where: { name: "VAT 10%" } });
  if (!tax) {
    tax = await prisma.posTax.create({ data: { name: "VAT 10%", rate: 10, type: "percentage" } });
  }

  const demoProducts = [
    { name: "Demo Coffee Beans 500g", barcode: "DEMO-COFFEE-001", price: 12.99, cost: 6.5, stock: 50 },
    { name: "Demo Notebook A5", barcode: "DEMO-NOTE-002", price: 4.5, cost: 2, stock: 120 },
    { name: "Demo USB Cable", barcode: "DEMO-USB-003", price: 9.99, cost: 3, stock: 75 },
    { name: "Demo Water Bottle", barcode: "DEMO-BOTTLE-004", price: 7.25, cost: 2.5, stock: 40 },
    { name: "Demo Snack Bar", barcode: "DEMO-SNACK-005", price: 2.0, cost: 0.8, stock: 200 },
  ];

  let created = 0;
  for (const p of demoProducts) {
    const existing = await prisma.posProduct.findFirst({ where: { barcode: p.barcode } });
    if (existing) {
      await prisma.posProduct.update({
        where: { id: existing.id },
        data: {
          stock: p.stock,
          price: p.price,
          cost: p.cost,
          isActive: true,
          categoryId: cat.id,
          unitId: unit.id,
          brandId: brand.id,
          taxId: tax.id,
        },
      });
    } else {
      await prisma.posProduct.create({
        data: {
          name: p.name,
          barcode: p.barcode,
          price: p.price,
          cost: p.cost,
          stock: p.stock,
          stockAlert: 5,
          categoryId: cat.id,
          unitId: unit.id,
          brandId: brand.id,
          taxId: tax.id,
          isActive: true,
        },
      });
    }
    created++;
  }

  const cust = await prisma.posCustomer.findFirst({ where: { name: "Walk-in Demo" } });
  if (!cust) {
    await prisma.posCustomer.create({
      data: { name: "Walk-in Demo", email: "walkin-demo@example.com", isActive: true },
    });
  }

  const count = await prisma.posProduct.count({ where: { stock: { gt: 0 }, isActive: true } });
  console.log(`[seed-pos-demo-data] OK — categories/units/brands/tax ensured; ${created} demo products processed.`);
  console.log(`[seed-pos-demo-data] Active products with stock > 0: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
