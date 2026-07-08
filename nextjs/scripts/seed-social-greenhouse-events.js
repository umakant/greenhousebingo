/* eslint-disable no-console */
/**
 * Seeds Plant Bingo events from greenhousebingo.com/events into Event Platform admin
 * for The Social Greenhouse company.
 *
 *   npm run db:seed:social-greenhouse:events
 *   node ./scripts/seed-social-greenhouse-events.js --slug=DN-0001-CO-26
 */
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const companyData = require("./social-greenhouse-company-data");
const eventsData = require("./social-greenhouse-events-data");

const prisma = new PrismaClient();
const SLUG_PREFIX = "sgh-";

function readArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit ? hit.slice(prefix.length + 1).trim() : null;
}

const FILTER_EMAIL = readArg("--email") || companyData.email;
const FILTER_NAME = readArg("--name");
const FILTER_SLUG = readArg("--slug") || companyData.slug;

function eventSlug(slug) {
  return `${SLUG_PREFIX}${slug}`;
}

function eventStatus(ev) {
  const remaining = ev.capacity - ev.ticketsSold;
  return remaining <= 0 ? "sold_out" : "registration_open";
}

function ticketStatus(ev) {
  const remaining = ev.capacity - ev.ticketsSold;
  return remaining <= 0 ? "sold_out" : "available";
}

async function assertSchema() {
  try {
    await prisma.$queryRaw`SELECT 1 FROM lms_events LIMIT 1`;
  } catch {
    console.error("[seed-social-greenhouse-events] Missing LMS events tables. Run: npm run db:ensure:lms-events");
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

async function upsertCategory(orgId, category) {
  const slug = `${SLUG_PREFIX}${category.slug}`;
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

async function upsertEvent(orgId, categoryId, ev) {
  const slug = eventSlug(ev.slug);
  const soldOut = ev.soldOut || ev.capacity - ev.ticketsSold <= 0;
  const payload = {
    organizationId: orgId,
    slug,
    title: ev.title,
    description: ev.description,
    shortDescription: ev.shortDescription,
    imageUrl: ev.imageUrl,
    categoryId,
    eventType: "live_workshop",
    deliveryMode: "in_person",
    status: soldOut ? "sold_out" : eventStatus(ev),
    instructorName: ev.instructorName || ev.hostName || null,
    startsAt: new Date(ev.startsAt),
    endsAt: new Date(ev.endsAt),
    timezone: ev.timezone,
    venueName: ev.venueName,
    venueAddress: ev.venueAddress,
    venueCity: ev.venueCity,
    venueState: ev.venueState,
    venuePostalCode: ev.venuePostalCode,
    venueCountry: "US",
    venueLat: ev.venueLat ?? null,
    venueLng: ev.venueLng ?? null,
    capacity: ev.capacity,
    registeredCount: ev.ticketsSold,
    isPublic: true,
    isFree: false,
    priceFrom: ev.price,
    currency: "USD",
    certificationAvailable: false,
    requirements: null,
    cancellationPolicy:
      ev.cancellationPolicy ||
      "Tickets are non-refundable. Transfers may be available up to 48 hours before doors open.",
    isFeatured: ev.featured ?? false,
    ageRule: ev.ageRule ?? null,
    doorsOpen: ev.doorsOpen ?? null,
    bingoStart: ev.bingoStart ?? null,
    venueType: ev.venueType ?? null,
    cardsIncluded: ev.cardsIncluded ?? null,
    extraCardPrice: ev.extraCardPrice ?? null,
    foodAndDrinks: ev.foodAndDrinks ?? null,
    attire: ev.attire ?? null,
    detailContent: ev.detailContent ?? null,
    revenueTotal: ev.price * ev.ticketsSold,
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

async function upsertTicket(orgId, eventId, ev) {
  const existing = await prisma.lmsEventTicket.findFirst({
    where: { organizationId: orgId, eventId, name: "General admission" },
  });
  const payload = {
    description: `${ev.venueCity}, ${ev.venueState} — includes ${ev.cardsIncluded} bingo cards (${ev.ageRule})`,
    price: ev.price,
    currency: "USD",
    quantity: ev.capacity,
    soldCount: ev.ticketsSold,
    ticketStatus: ticketStatus(ev),
    isFree: false,
    updatedAt: new Date(),
    updatedById: orgId,
  };
  if (existing) {
    await prisma.lmsEventTicket.update({ where: { id: existing.id }, data: payload });
  } else {
    await prisma.lmsEventTicket.create({
      data: {
        organizationId: orgId,
        eventId,
        name: "General admission",
        ...payload,
        createdById: orgId,
      },
    });
  }

  if (ev.extraCardPrice != null && ev.extraCardPrice > 0) {
    const extraExisting = await prisma.lmsEventTicket.findFirst({
      where: { organizationId: orgId, eventId, name: "Extra bingo card" },
    });
    const extraPayload = {
      description: "Additional bingo card for the same event",
      price: ev.extraCardPrice,
      currency: "USD",
      quantity: null,
      soldCount: 0,
      ticketStatus: "available",
      isFree: false,
      updatedAt: new Date(),
      updatedById: orgId,
    };
    if (extraExisting) {
      await prisma.lmsEventTicket.update({ where: { id: extraExisting.id }, data: extraPayload });
    } else {
      await prisma.lmsEventTicket.create({
        data: {
          organizationId: orgId,
          eventId,
          name: "Extra bingo card",
          ...extraPayload,
          createdById: orgId,
        },
      });
    }
  }
}

async function main() {
  await assertSchema();

  const company = await findCompany();
  if (!company) {
    console.error(
      `[seed-social-greenhouse-events] Company not found. Run npm run db:seed:social-greenhouse first, or pass --slug=${companyData.slug}`,
    );
    process.exit(1);
  }

  const orgId = company.id;
  console.log(
    `[seed-social-greenhouse-events] Org ${orgId.toString()} (${company.name ?? company.email}, slug=${company.slug ?? "—"})`,
  );

  const category = await upsertCategory(orgId, eventsData.category);
  console.log(`  Category: ${category.name}`);

  for (const ev of eventsData.events) {
    const event = await upsertEvent(orgId, category.id, ev);
    await upsertTicket(orgId, event.id, ev);
    const remaining = ev.capacity - ev.ticketsSold;
    console.log(
      `  ✓ ${ev.title} — ${ev.venueCity}, ${ev.venueState} — ${ev.ticketsSold}/${ev.capacity} sold (${remaining} left) [host: ${ev.hostName || "—"}]`,
    );
  }

  console.log("\n[seed-social-greenhouse-events] Done.");
  console.log(`  Admin: /admin/event-platform/events`);
  console.log(`  Public: /sites/${company.slug ?? companyData.slug}/events`);
}

main()
  .catch((err) => {
    console.error("[seed-social-greenhouse-events] ERROR:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
