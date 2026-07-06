/* eslint-disable no-console */
/**
 * Dev helper: maps localhost / 127.0.0.1 to a storefront website so `/shop` resolves locally
 * (otherwise the public shop route shows "Storefront not configured").
 *
 * Usage (from the nextjs folder):
 *   node ./scripts/seed-localhost-domain.js
 *   LOCAL_SEED_ORG_ID=1000 LOCAL_WEBSITE_SLUG=store node ./scripts/seed-localhost-domain.js
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ORG_ID = process.env.LOCAL_SEED_ORG_ID ? BigInt(process.env.LOCAL_SEED_ORG_ID) : 1000n;
const WEBSITE_SLUG = (process.env.LOCAL_WEBSITE_SLUG ?? "").trim().toLowerCase();
const HOSTS = ["localhost", "127.0.0.1"];

async function ensureDomain(websiteId, hostname) {
  const existing = await prisma.domain.findUnique({ where: { hostname } });
  if (existing) {
    await prisma.domain.update({
      where: { id: existing.id },
      data: { organizationId: ORG_ID, websiteId, status: "active" },
    });
    console.log(`[seed-localhost-domain] Updated ${hostname} -> website ${websiteId}`);
    return;
  }
  await prisma.domain.create({
    data: { organizationId: ORG_ID, websiteId, hostname, status: "active", isPrimary: false },
  });
  console.log(`[seed-localhost-domain] Created ${hostname} -> website ${websiteId}`);
}

async function main() {
  let website = null;
  if (WEBSITE_SLUG) {
    website = await prisma.website.findFirst({ where: { organizationId: ORG_ID, slug: WEBSITE_SLUG } });
  }
  if (!website) {
    website = await prisma.website.findFirst({ where: { organizationId: ORG_ID }, orderBy: { id: "asc" } });
  }
  if (!website) {
    console.error(`[seed-localhost-domain] No website found for org ${ORG_ID}. Create a storefront website first.`);
    process.exit(1);
  }
  if (website.status !== "active") {
    website = await prisma.website.update({ where: { id: website.id }, data: { status: "active" } });
  }
  console.log(`[seed-localhost-domain] Using website ${website.id} (slug=${website.slug}, name="${website.name}")`);

  for (const host of HOSTS) {
    await ensureDomain(website.id, host);
  }

  console.log(`[seed-localhost-domain] Done. Open http://localhost:5000/shop`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
