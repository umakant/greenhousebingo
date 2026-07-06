/* eslint-disable no-console */
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const MODULES = [
  { code: "MOD001", name: "Junk Removal" },
  { code: "MOD002", name: "Cleaning Services" },
  { code: "MOD003", name: "Commercial Cleaning" },
  { code: "MOD004", name: "Dumpster Rental" },
  { code: "MOD005", name: "Pressure Washing" },
  { code: "MOD006", name: "Lawn Care" },
  { code: "MOD007", name: "Landscaping" },
  { code: "MOD008", name: "Tree Services" },
  { code: "MOD009", name: "Moving Services" },
  { code: "MOD010", name: "Handyman Services" },
  { code: "MOD011", name: "Pest Control" },
  { code: "MOD012", name: "Roofing" },
  { code: "MOD013", name: "HVAC" },
  { code: "MOD014", name: "Plumbing" },
  { code: "MOD015", name: "Electrical Services" },
  { code: "MOD016", name: "Pool Cleaning" },
  { code: "MOD017", name: "Snow Removal" },
  { code: "MOD018", name: "Carpet Cleaning" },
  { code: "MOD019", name: "Window Cleaning" },
  { code: "MOD020", name: "Mobile Car Wash" },
  { code: "MOD021", name: "Mobile Detailing" },
  { code: "MOD022", name: "DNA Testing" },
  { code: "MOD023", name: "Mobile Drug Testing" },
  { code: "MOD024", name: "Diabetic Surplus" },
  { code: "MOD025", name: "Medical Surplus" },
  { code: "MOD026", name: "Biohazard Cleanup" },
  { code: "MOD027", name: "Mobile Fingerprinting" },
  { code: "MOD028", name: "Custom Printed Rugs" },
  { code: "MOD029", name: "Custom Prints" },
  { code: "MOD030", name: "Candle Making" },
  { code: "MOD031", name: "Balloons & Event Decor" },
  { code: "MOD032", name: "Apparel Printing" },
  { code: "MOD033", name: "Promotional Products" },
  { code: "MOD034", name: "Dog Poop Removal" },
  { code: "MOD035", name: "Pet Sitting" },
  { code: "MOD036", name: "Mobile Grooming" },
];

async function main() {
  console.log("Seeding business modules...");

  const existing = await prisma.businessModule.findMany({
    select: { id: true, code: true, name: true, sortOrder: true },
  });
  const byCode = new Map(existing.map((e) => [e.code ?? "", e]));

  const agg = await prisma.businessModule.aggregate({ _max: { id: true } });
  let nextId = (agg._max.id ?? 0n) + 1n;

  let created = 0;
  let updated = 0;

  for (let i = 0; i < MODULES.length; i++) {
    const row = MODULES[i];
    const rec = byCode.get(row.code);
    if (rec) {
      if (rec.name !== row.name || rec.sortOrder !== i) {
        await prisma.businessModule.update({
          where: { id: rec.id },
          data: {
            name: row.name,
            sortOrder: i,
            updatedAt: new Date(),
          },
        });
        updated++;
      }
    } else {
      await prisma.businessModule.create({
        data: {
          id: nextId,
          code: row.code,
          name: row.name,
          description: null,
          isActive: true,
          sortOrder: i,
          createdBy: null,
          createdAt: new Date(),
          updatedAt: null,
        },
      });
      nextId += 1n;
      created++;
    }
  }

  console.log(`Done. Created: ${created}, updated: ${updated}, total modules: ${MODULES.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
