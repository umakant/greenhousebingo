/* eslint-disable no-console */
/**
 * Seeds Venue Dashboard test data for The Social Greenhouse.
 *
 *   npm run db:seed:social-greenhouse:venues
 *   node ./scripts/seed-social-greenhouse-venues.js --slug=DN-0001-CO-26
 */
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient, Prisma } = require("@prisma/client");
const companyData = require("./social-greenhouse-company-data");
const venuesData = require("./social-greenhouse-venues-data");

const prisma = new PrismaClient();

function readArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit ? hit.slice(prefix.length + 1).trim() : null;
}

const FILTER_EMAIL = readArg("--email") || companyData.email;
const FILTER_NAME = readArg("--name");
const FILTER_SLUG = readArg("--slug") || companyData.slug;

async function assertSchema() {
  try {
    await prisma.$queryRaw`SELECT 1 FROM event_venues LIMIT 1`;
  } catch {
    console.error("[seed-social-greenhouse-venues] Missing event_venues table. Run: npm run db:ensure:event-platform");
    process.exit(1);
  }
}

async function findCompany() {
  if (FILTER_SLUG) {
    const bySlug = await prisma.user.findFirst({
      where: {
        slug: { equals: FILTER_SLUG, mode: "insensitive" },
        type: { in: ["company", "company_admin"] },
      },
      select: { id: true, email: true, name: true, slug: true },
    });
    if (bySlug) return bySlug;
  }

  const where = { type: { in: ["company", "company_admin"] }, isActive: true };
  if (FILTER_EMAIL) where.email = { equals: FILTER_EMAIL, mode: "insensitive" };
  if (FILTER_NAME) where.name = { contains: FILTER_NAME, mode: "insensitive" };

  return prisma.user.findFirst({
    where,
    orderBy: { id: "asc" },
    select: { id: true, email: true, name: true, slug: true },
  });
}

function venuePayload(orgId, row) {
  return {
    organizationId: orgId,
    name: row.name.trim(),
    phone: row.phone?.trim() || null,
    website: row.website?.trim() || null,
    address: row.address?.trim() || null,
    city: row.city?.trim() || null,
    state: row.state?.trim() || null,
    zip: row.zip?.trim() || null,
    latitude: row.latitude != null ? new Prisma.Decimal(row.latitude) : null,
    longitude: row.longitude != null ? new Prisma.Decimal(row.longitude) : null,
    contactFirstName: row.contactFirstName?.trim() || null,
    contactLastName: row.contactLastName?.trim() || null,
    contactPhone: row.contactPhone?.trim() || null,
    contactEmail: row.contactEmail?.trim() || null,
    seating: row.seating ?? null,
    age21Plus: Boolean(row.age21Plus),
    drinksAlcohol: Boolean(row.drinksAlcohol),
    food: Boolean(row.food),
    businessHours: row.businessHours ?? Prisma.JsonNull,
    status: "active",
    createdById: orgId,
    updatedById: orgId,
    updatedAt: new Date(),
  };
}

async function upsertVenue(orgId, row) {
  const existing = await prisma.eventVenue.findFirst({
    where: {
      organizationId: orgId,
      name: row.name.trim(),
      archivedAt: null,
    },
  });

  const data = venuePayload(orgId, row);

  if (existing) {
    return prisma.eventVenue.update({ where: { id: existing.id }, data });
  }

  return prisma.eventVenue.create({ data });
}

async function main() {
  await assertSchema();

  const company = await findCompany();
  if (!company) {
    console.error(
      `[seed-social-greenhouse-venues] Company not found. Run npm run db:seed:social-greenhouse first, or pass --slug=${companyData.slug}`,
    );
    process.exit(1);
  }

  const orgId = company.id;
  console.log(
    `[seed-social-greenhouse-venues] Org ${orgId.toString()} (${company.name ?? company.email}, slug=${company.slug ?? "—"})`,
  );

  let created = 0;
  let updated = 0;

  for (const row of venuesData) {
    const before = await prisma.eventVenue.findFirst({
      where: { organizationId: orgId, name: row.name.trim(), archivedAt: null },
      select: { id: true },
    });
    await upsertVenue(orgId, row);
    if (before) {
      updated += 1;
      console.log(`  ↻ ${row.name}`);
    } else {
      created += 1;
      console.log(`  + ${row.name}`);
    }
  }

  const total = await prisma.eventVenue.count({
    where: { organizationId: orgId, archivedAt: null },
  });

  console.log(`\n[seed-social-greenhouse-venues] Done. ${created} created, ${updated} updated (${total} active venues).`);
  console.log(`  Dashboard: http://localhost:5000/admin/venue-management`);
}

main()
  .catch((err) => {
    console.error("[seed-social-greenhouse-venues] ERROR:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
