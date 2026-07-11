/* eslint-disable no-console */
/**
 * Seeds the EventVenue catalog from the actual venues used by The Social
 * Greenhouse events (social-greenhouse-events-data.js).
 *
 * The venue dropdown in the event editor is populated from the EventVenue
 * catalog. Previously the catalog was seeded from an unrelated list of
 * Twin Cities demo venues, so none of the dropdown names matched the venues
 * the events actually use (Chicken N Pickle Grapevine, Celestial, TUPPS, …).
 *
 * This script derives one catalog entry per distinct event venue so the
 * dropdown matches the events. The editor auto-selects a venue by matching
 * the event's venueName to a catalog venue name (case-insensitive).
 *
 *   node ./scripts/seed-social-greenhouse-venues-from-events.js
 *   node ./scripts/seed-social-greenhouse-venues-from-events.js --slug=DN-0001-CO-26
 *   node ./scripts/seed-social-greenhouse-venues-from-events.js --archive-others
 */
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient, Prisma } = require("@prisma/client");
const companyData = require("./social-greenhouse-company-data");
const eventsData = require("./social-greenhouse-events-data");

const prisma = new PrismaClient();

function readArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit ? hit.slice(prefix.length + 1).trim() : null;
}

const HAS_FLAG = (flag) => process.argv.includes(flag);

const FILTER_EMAIL = readArg("--email") || companyData.email;
const FILTER_NAME = readArg("--name");
const FILTER_SLUG = readArg("--slug") || companyData.slug;
const ARCHIVE_OTHERS = HAS_FLAG("--archive-others");

async function assertSchema() {
  try {
    await prisma.$queryRaw`SELECT 1 FROM event_venues LIMIT 1`;
  } catch {
    console.error("[seed-venues-from-events] Missing event_venues table. Run: npm run db:ensure:event-platform");
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

/** Collapse the events list into a de-duplicated set of venues, keyed by name. */
function collectVenues() {
  const events = Array.isArray(eventsData) ? eventsData : eventsData.events || [];
  const byName = new Map();

  for (const ev of events) {
    const name = (ev.venueName || "").trim();
    if (!name) continue;

    // First event wins for base fields; later events fill in any gaps.
    const prev = byName.get(name.toLowerCase()) || { name };
    const foodDrinks = `${ev.foodAndDrinks || ""}`;

    byName.set(name.toLowerCase(), {
      name,
      address: prev.address || ev.venueAddress || null,
      city: prev.city || ev.venueCity || null,
      state: prev.state || ev.venueState || null,
      zip: prev.zip || ev.venuePostalCode || null,
      latitude: prev.latitude ?? (ev.venueLat != null ? ev.venueLat : null),
      longitude: prev.longitude ?? (ev.venueLng != null ? ev.venueLng : null),
      phone: prev.phone || ev.venuePhone || null,
      venueType: prev.venueType || ev.venueType || null,
      imageUrl: prev.imageUrl || ev.imageUrl || null,
      seating: prev.seating ?? (ev.capacity != null ? ev.capacity : null),
      age21Plus: prev.age21Plus || /21\s*\+/.test(`${ev.ageRule || ""}`),
      drinksAlcohol:
        prev.drinksAlcohol ||
        /(bar|beer|brew|ale|taproom|alcohol|cocktail|wine|cider|drink)/i.test(foodDrinks),
      food:
        prev.food ||
        /(food|restaurant|kitchen|snack|refreshment|menu|bite|dinner)/i.test(foodDrinks),
    });
  }

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function venuePayload(orgId, row) {
  return {
    organizationId: orgId,
    name: row.name.trim(),
    phone: row.phone?.trim() || null,
    address: row.address?.trim() || null,
    city: row.city?.trim() || null,
    state: row.state?.trim() || null,
    zip: row.zip?.trim() || null,
    latitude: row.latitude != null ? new Prisma.Decimal(row.latitude) : null,
    longitude: row.longitude != null ? new Prisma.Decimal(row.longitude) : null,
    venueType: row.venueType?.trim() || null,
    imageUrl: row.imageUrl?.trim() || null,
    contactPhone: row.phone?.trim() || null,
    seating: row.seating ?? null,
    age21Plus: Boolean(row.age21Plus),
    drinksAlcohol: Boolean(row.drinksAlcohol),
    food: Boolean(row.food),
    status: "active",
    createdById: orgId,
    updatedById: orgId,
    updatedAt: new Date(),
  };
}

async function upsertVenue(orgId, row) {
  const existing = await prisma.eventVenue.findFirst({
    where: { organizationId: orgId, name: row.name.trim(), archivedAt: null },
    select: { id: true },
  });

  const data = venuePayload(orgId, row);

  if (existing) {
    await prisma.eventVenue.update({ where: { id: existing.id }, data });
    return "updated";
  }

  await prisma.eventVenue.create({ data });
  return "created";
}

async function main() {
  await assertSchema();

  const company = await findCompany();
  if (!company) {
    console.error(
      `[seed-venues-from-events] Company not found. Run npm run db:seed:social-greenhouse first, or pass --slug=${companyData.slug}`,
    );
    process.exit(1);
  }

  const orgId = company.id;
  const venues = collectVenues();

  console.log(
    `[seed-venues-from-events] Org ${orgId.toString()} (${company.name ?? company.email}, slug=${company.slug ?? "—"})`,
  );
  console.log(`[seed-venues-from-events] ${venues.length} distinct event venues found.\n`);

  let created = 0;
  let updated = 0;
  const keepNames = new Set(venues.map((v) => v.name.trim().toLowerCase()));

  for (const row of venues) {
    const result = await upsertVenue(orgId, row);
    if (result === "created") {
      created += 1;
      console.log(`  + ${row.name}${row.city ? ` — ${row.city}, ${row.state ?? ""}`.trim() : ""}`);
    } else {
      updated += 1;
      console.log(`  ↻ ${row.name}`);
    }
  }

  let archived = 0;
  if (ARCHIVE_OTHERS) {
    const others = await prisma.eventVenue.findMany({
      where: { organizationId: orgId, archivedAt: null },
      select: { id: true, name: true },
    });
    for (const v of others) {
      if (keepNames.has(v.name.trim().toLowerCase())) continue;
      await prisma.eventVenue.update({
        where: { id: v.id },
        data: { archivedAt: new Date(), status: "archived", updatedById: orgId },
      });
      archived += 1;
      console.log(`  – archived ${v.name}`);
    }
  }

  const total = await prisma.eventVenue.count({
    where: { organizationId: orgId, archivedAt: null },
  });

  console.log(
    `\n[seed-venues-from-events] Done. ${created} created, ${updated} updated${
      ARCHIVE_OTHERS ? `, ${archived} archived` : ""
    } (${total} active venues).`,
  );
  if (!ARCHIVE_OTHERS) {
    console.log("  Tip: re-run with --archive-others to hide venues that no event uses.");
  }
}

main()
  .catch((err) => {
    console.error("[seed-venues-from-events] ERROR:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
