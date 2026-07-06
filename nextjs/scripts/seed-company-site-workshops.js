/* eslint-disable no-console */
/**
 * Seed Win With Barlow company-site workshops into LMS Event Platform tables.
 *
 * Source of truth: src/lib/company-themes/win-with-barlow-workshops.json
 * (same data drives the public /workshops page, checkout catalog, and admin Workshops tab)
 *
 * Run:
 *   npm run db:ensure:lms-events && npm run db:seed:company-site-workshops
 *   npm run db:seed:company-site-workshops -- --slug=SE-0001-CO-26
 *   npm run db:seed:company-site-workshops -- --email=crimson@mailsac.com
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const siteConfig = require("../src/lib/company-themes/win-with-barlow-workshops.json");

const prisma = new PrismaClient();

function readArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit ? hit.slice(prefix.length + 1).trim() : null;
}

const FILTER_EMAIL = readArg("--email");
const FILTER_NAME = readArg("--name");
const FILTER_SLUG = readArg("--slug") || siteConfig.defaultCompanySiteSlug;

function lmsWorkshopEventSlug(catalogSlug) {
  return `cs-workshop-${catalogSlug}`;
}

function registeredCount(workshop) {
  return Math.max(0, workshop.capacity - workshop.seatsRemaining);
}

function ticketStatus(workshop) {
  return workshop.soldOut || workshop.seatsRemaining <= 0 ? "sold_out" : "available";
}

function eventStatus(workshop) {
  return workshop.soldOut || workshop.seatsRemaining <= 0 ? "sold_out" : "published";
}

async function assertSchema() {
  try {
    await prisma.$queryRaw`SELECT 1 FROM lms_events LIMIT 1`;
  } catch {
    console.error("[seed-company-site-workshops] Missing LMS events tables. Run: npm run db:ensure:lms-events");
    process.exit(1);
  }
}

async function nextSettingId() {
  const agg = await prisma.setting.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

async function upsertSetting(ownerId, key, value) {
  const existing = await prisma.setting.findFirst({ where: { key, createdBy: ownerId } });
  if (existing) {
    await prisma.setting.update({
      where: { id: existing.id },
      data: { value: value == null ? null : String(value), updatedAt: new Date() },
    });
    return;
  }
  await prisma.setting.create({
    data: {
      id: await nextSettingId(),
      key,
      value: value == null ? null : String(value),
      createdBy: ownerId,
      createdAt: new Date(),
    },
  });
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

async function upsertCategory(orgId, category) {
  const slug = `cs-${category.slug}`;
  const existing = await prisma.lmsEventCategory.findFirst({
    where: { organizationId: orgId, slug },
  });
  const payload = {
    name: category.name,
    description: category.description,
    status: "published",
    sortOrder: 1,
    updatedAt: new Date(),
    updatedById: orgId,
  };
  if (existing) {
    return prisma.lmsEventCategory.update({ where: { id: existing.id }, data: payload });
  }
  return prisma.lmsEventCategory.create({
    data: {
      organizationId: orgId,
      slug,
      ...payload,
      createdById: orgId,
    },
  });
}

async function upsertWorkshopEvent(orgId, categoryId, workshop) {
  const slug = lmsWorkshopEventSlug(workshop.slug);
  const registered = registeredCount(workshop);
  const payload = {
    organizationId: orgId,
    slug,
    title: workshop.title,
    description: workshop.description,
    shortDescription: workshop.shortDescription,
    imageUrl: workshop.imageUrl,
    categoryId,
    eventType: "live_workshop",
    deliveryMode: "in_person",
    status: eventStatus(workshop),
    instructorName: workshop.instructorName,
    startsAt: new Date(workshop.startsAt),
    endsAt: new Date(workshop.endsAt),
    timezone: workshop.timezone,
    venueName: workshop.venueName,
    venueCity: workshop.city,
    venueState: workshop.state,
    venueCountry: "US",
    capacity: workshop.capacity,
    registeredCount: registered,
    isPublic: true,
    isFree: false,
    priceFrom: workshop.price,
    currency: "USD",
    certificationAvailable: true,
    certificationName: "DOT Specimen Collector Proficiency",
    requirements: workshop.requirements,
    cancellationPolicy: workshop.cancellationPolicy,
    updatedAt: new Date(),
    updatedById: orgId,
  };

  const existing = await prisma.lmsTrainingEvent.findFirst({
    where: { organizationId: orgId, slug },
  });
  if (existing) {
    return prisma.lmsTrainingEvent.update({ where: { id: existing.id }, data: payload });
  }
  return prisma.lmsTrainingEvent.create({
    data: {
      ...payload,
      createdById: orgId,
    },
  });
}

async function upsertWorkshopTicket(orgId, eventId, workshop) {
  const registered = registeredCount(workshop);
  const status = ticketStatus(workshop);
  const existing = await prisma.lmsEventTicket.findFirst({
    where: { organizationId: orgId, eventId, name: "General admission" },
  });
  const payload = {
    description: `${workshop.city}, ${workshop.state} — in-person diagnostic launch workshop`,
    price: workshop.price,
    currency: "USD",
    quantity: workshop.capacity,
    soldCount: registered,
    ticketStatus: status,
    isFree: false,
    updatedAt: new Date(),
    updatedById: orgId,
  };
  if (existing) {
    return prisma.lmsEventTicket.update({ where: { id: existing.id }, data: payload });
  }
  return prisma.lmsEventTicket.create({
    data: {
      organizationId: orgId,
      eventId,
      name: "General admission",
      ...payload,
      createdById: orgId,
    },
  });
}

async function main() {
  await assertSchema();

  const company = await findCompany();
  if (!company) {
    console.error(
      `[seed-company-site-workshops] No company found. Use --slug=${siteConfig.defaultCompanySiteSlug}, --email=..., or --name=...`,
    );
    process.exit(1);
  }

  const orgId = company.id;
  console.log(
    `[seed-company-site-workshops] Org ${orgId.toString()} (${company.name ?? company.email}, slug=${company.slug ?? "—"})`,
  );

  await upsertSetting(orgId, "companyNextjsThemeSlug", siteConfig.themeSlug);
  console.log(`  Theme: ${siteConfig.themeSlug}`);

  const category = await upsertCategory(orgId, siteConfig.category);
  console.log(`  Category: ${category.name} (${category.slug})`);

  for (const workshop of siteConfig.workshops) {
    const event = await upsertWorkshopEvent(orgId, category.id, workshop);
    await upsertWorkshopTicket(orgId, event.id, workshop);
    console.log(
      `  ✓ ${workshop.title} — ${workshop.monthLabel} ${workshop.dayOfMonth} (${workshop.city}, ${workshop.state}) — ${registeredCount(workshop)}/${workshop.capacity} registered, ${workshop.seatsRemaining} remaining`,
    );
  }

  console.log("[seed-company-site-workshops] Done. Open /admin/event-platform/workshops to review.");
}

main()
  .catch((err) => {
    console.error("[seed-company-site-workshops] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
