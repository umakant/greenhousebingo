/* eslint-disable no-console */
/**
 * Links phillywaterice.com (and www) to the Philly Water Ice storefront website.
 *
 * Usage:
 *   node ./scripts/seed-philly-water-ice-domain.js
 *   PHILLY_SEED_ORG_ID=1000 PHILLY_WEBSITE_SLUG=paperflight node ./scripts/seed-philly-water-ice-domain.js
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ORG_ID = process.env.PHILLY_SEED_ORG_ID ? BigInt(process.env.PHILLY_SEED_ORG_ID) : 1000n;
const WEBSITE_SLUG = (process.env.PHILLY_WEBSITE_SLUG ?? "paperflight").trim().toLowerCase();
const HOSTS = ["phillywaterice.com", "www.phillywaterice.com"];

async function ensureDomain(websiteId, hostname, isPrimary) {
  const existing = await prisma.domain.findUnique({ where: { hostname } });
  if (existing) {
    await prisma.domain.update({
      where: { id: existing.id },
      data: {
        organizationId: ORG_ID,
        websiteId,
        status: "active",
        isPrimary,
      },
    });
    console.log(`[seed-philly-domain] Updated ${hostname} → website ${websiteId}`);
    return;
  }
  await prisma.domain.create({
    data: {
      organizationId: ORG_ID,
      websiteId,
      hostname,
      status: "active",
      isPrimary,
    },
  });
  console.log(`[seed-philly-domain] Created ${hostname} → website ${websiteId}`);
}

async function main() {
  const owner = await prisma.user.findUnique({ where: { id: ORG_ID }, select: { id: true, email: true } });
  if (!owner) {
    console.error(`[seed-philly-domain] Missing organization user ${ORG_ID}`);
    process.exit(1);
  }

  let website = await prisma.website.findFirst({
    where: { organizationId: ORG_ID, slug: WEBSITE_SLUG },
  });
  if (!website) {
    website = await prisma.website.findFirst({
      where: { organizationId: ORG_ID },
      orderBy: { id: "asc" },
    });
  }
  if (!website) {
    website = await prisma.website.create({
      data: {
        organizationId: ORG_ID,
        name: "Philly Water Ice",
        slug: "philly-water-ice",
        status: "active",
      },
    });
    console.log("[seed-philly-domain] Created website", website.id.toString(), website.slug);
  } else if (website.status !== "active") {
    website = await prisma.website.update({
      where: { id: website.id },
      data: { status: "active" },
    });
    console.log("[seed-philly-domain] Activated website", website.slug);
  }

  for (let i = 0; i < HOSTS.length; i++) {
    await ensureDomain(website.id, HOSTS[i], i === 0);
  }

  console.log(`[seed-philly-domain] Done. Org ${owner.email} — shop will load on ${HOSTS.join(", ")} when DNS points here.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
