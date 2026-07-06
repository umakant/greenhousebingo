/* eslint-disable no-console */
/**
 * Seed demo Gantt project locations for the Fieldmap page (map pins, table, status counts).
 *
 * Usage:
 *   npm run db:seed:fieldmap-locations
 *   npm run db:seed:fieldmap-locations:force
 *   npm run db:seed:fieldmap-locations:first-aid
 *   node ./scripts/seed-fieldmap-locations-demo.js --name="First Aid Responders" --force
 */
const path = require("node:path");
const { execSync } = require("node:child_process");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({ log: ["error"] });
const FORCE = process.argv.includes("--force");

function readArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit ? hit.slice(prefix.length + 1).trim() : null;
}

const FILTER_EMAIL = readArg("--email");
const FILTER_NAME = readArg("--name");

const SEED_PREFIX = "fieldmap-seed";

function companyKey(companyId) {
  return String(companyId);
}

function projectId(companyId, key) {
  return `${SEED_PREFIX}-${companyKey(companyId)}-project-${key}`;
}

function staffId(companyId, index) {
  return `${SEED_PREFIX}-${companyKey(companyId)}-staff-${index}`;
}

function locationId(companyId, slug) {
  return `${SEED_PREFIX}-${companyKey(companyId)}-loc-${slug}`;
}

const PROJECT_KEYS = ["tour", "hold", "done"];

const LOCATION_SPECS = [
  {
    slug: "miami",
    projectKey: "tour",
    name: "Miami Event Site",
    city: "Miami",
    state: "FL",
    zipCode: "33132",
    addressLine1: "601 Biscayne Blvd",
    latitude: 25.7617,
    longitude: -80.1918,
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    color: "#22C55E",
    staffIndexes: [0, 1, 2],
  },
  {
    slug: "chicago",
    projectKey: "tour",
    name: "Chicago Convention Center",
    city: "Chicago",
    state: "IL",
    zipCode: "60616",
    addressLine1: "2301 S King Dr",
    latitude: 41.8781,
    longitude: -87.6298,
    startDate: "2026-06-05",
    endDate: "2026-06-22",
    color: "#22C55E",
    staffIndexes: [1, 3],
  },
  {
    slug: "phoenix",
    projectKey: "tour",
    name: "Phoenix Arena",
    city: "Phoenix",
    state: "AZ",
    zipCode: "85004",
    addressLine1: "201 E Jefferson St",
    latitude: 33.4484,
    longitude: -112.074,
    startDate: "2026-06-10",
    endDate: "2026-06-18",
    color: "#22C55E",
    staffIndexes: [2, 4],
  },
  {
    slug: "new-york",
    projectKey: "tour",
    name: "New York Mobilization",
    city: "New York",
    state: "NY",
    zipCode: "10001",
    addressLine1: "4 Pennsylvania Plaza",
    latitude: 40.7128,
    longitude: -74.006,
    startDate: "2026-07-01",
    endDate: "2026-07-15",
    color: "#3B82F6",
    staffIndexes: [0, 5],
  },
  {
    slug: "los-angeles",
    projectKey: "tour",
    name: "Los Angeles Prep",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90015",
    addressLine1: "1201 S Figueroa St",
    latitude: 34.0522,
    longitude: -118.2437,
    startDate: "2026-07-10",
    endDate: "2026-07-25",
    color: "#3B82F6",
    staffIndexes: [3, 4],
  },
  {
    slug: "houston",
    projectKey: "tour",
    name: "Houston Staging",
    city: "Houston",
    state: "TX",
    zipCode: "77002",
    addressLine1: "1001 Avenida de las Americas",
    latitude: 29.7604,
    longitude: -95.3698,
    startDate: "2026-06-20",
    endDate: "2026-07-05",
    color: "#3B82F6",
    staffIndexes: [1],
  },
  {
    slug: "dallas",
    projectKey: "tour",
    name: "Dallas Planning Office",
    city: "Dallas",
    state: "TX",
    zipCode: "75201",
    addressLine1: "650 S Griffin St",
    latitude: 32.7767,
    longitude: -96.797,
    startDate: null,
    endDate: null,
    color: "#A855F7",
    staffIndexes: [],
  },
  {
    slug: "denver",
    projectKey: "tour",
    name: "Denver Route Planning",
    city: "Denver",
    state: "CO",
    zipCode: "80204",
    addressLine1: "1701 Bryant St",
    latitude: 39.7392,
    longitude: -104.9903,
    startDate: null,
    endDate: null,
    color: "#A855F7",
    staffIndexes: [],
  },
  {
    slug: "seattle",
    projectKey: "hold",
    name: "Seattle Pavilion",
    city: "Seattle",
    state: "WA",
    zipCode: "98101",
    addressLine1: "305 Harrison St",
    latitude: 47.6062,
    longitude: -122.3321,
    startDate: "2026-08-01",
    endDate: "2026-08-15",
    color: "#F97316",
    staffIndexes: [5],
  },
  {
    slug: "atlanta",
    projectKey: "done",
    name: "Atlanta Spring Event",
    city: "Atlanta",
    state: "GA",
    zipCode: "30313",
    addressLine1: "1 Georgia Dome Dr NW",
    latitude: 33.749,
    longitude: -84.388,
    startDate: "2026-05-01",
    endDate: "2026-05-31",
    color: "#94A3B8",
    staffIndexes: [0, 2],
  },
  {
    slug: "boston",
    projectKey: "done",
    name: "Boston Medical Expo",
    city: "Boston",
    state: "MA",
    zipCode: "02115",
    addressLine1: "415 Summer St",
    latitude: 42.3601,
    longitude: -71.0589,
    startDate: "2026-04-01",
    endDate: "2026-04-30",
    color: "#94A3B8",
    staffIndexes: [4],
  },
  {
    slug: "philadelphia",
    projectKey: "tour",
    name: "Philadelphia Training Hub",
    city: "Philadelphia",
    state: "PA",
    zipCode: "19148",
    addressLine1: "3601 S Broad St",
    latitude: 39.9526,
    longitude: -75.1652,
    startDate: "2026-09-01",
    endDate: "2026-09-15",
    color: "#3B82F6",
    staffIndexes: [0, 1, 5],
  },
];

const STAFF_SPECS = [
  { name: "Lynn Nicely", email: "lynn@firstaidresponders.net", color: "#6366F1" },
  { name: "Marcus Reed", email: "marcus.reed@firstaidresponders.net", color: "#EC4899" },
  { name: "Sofia Martinez", email: "sofia.m@firstaidresponders.net", color: "#14B8A6" },
  { name: "James Chen", email: "james.chen@firstaidresponders.net", color: "#F59E0B" },
  { name: "Aisha Johnson", email: "aisha.j@firstaidresponders.net", color: "#8B5CF6" },
  { name: "David Okafor", email: "david.o@firstaidresponders.net", color: "#0EA5E9" },
];

const SCHEDULE_LABEL_PREFIX = "__schedule__:";

function serializeAssignmentSchedule(entries) {
  return `${SCHEDULE_LABEL_PREFIX}${JSON.stringify(entries)}`;
}

function buildDaySchedule(startDate, endDate) {
  const start = new Date(`${startDate}T12:00:00.000Z`);
  const end = new Date(`${endDate}T12:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
  const rows = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const date = cursor.toISOString().slice(0, 10);
    rows.push({ date, enabled: true, startTime: "07:00", endTime: "17:00" });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return rows;
}

function d(str) {
  return new Date(`${str}T12:00:00.000Z`);
}

function dec(n) {
  return n;
}

async function resolveOrCreateStaff(companyId, index, companyIdStr) {
  const s = STAFF_SPECS[index];
  const existing = await prisma.ganttStaff.findFirst({
    where: {
      companyId: companyIdStr,
      OR: [
        ...(s.email ? [{ email: { equals: s.email, mode: "insensitive" } }] : []),
        { name: { equals: s.name, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing.id;

  const id = staffId(companyId, index);
  await prisma.ganttStaff.upsert({
    where: { id },
    create: { id, ...s, companyId: companyIdStr },
    update: { name: s.name, email: s.email, color: s.color, companyId: companyIdStr },
  });
  return id;
}

async function wipeSeedData(companyId) {
  const cid = companyKey(companyId);
  const projectIds = PROJECT_KEYS.map((key) => projectId(companyId, key));
  const locationIds = LOCATION_SPECS.map((loc) => locationId(companyId, loc.slug));
  const staffIds = STAFF_SPECS.map((_, i) => staffId(companyId, i));

  await prisma.ganttProjectStaff.deleteMany({
    where: { projectId: { in: projectIds } },
  });
  await prisma.ganttProjectLocation.deleteMany({
    where: { id: { in: locationIds } },
  });
  await prisma.ganttProject.deleteMany({
    where: { id: { in: projectIds }, companyId: cid },
  });
  await prisma.ganttStaff.deleteMany({
    where: { id: { in: staffIds }, companyId: cid },
  });
}

async function seedCompany(company) {
  const companyIdStr = companyKey(company.id);

  const locationIds = LOCATION_SPECS.map((loc) => locationId(company.id, loc.slug));
  const existing = await prisma.ganttProjectLocation.count({
    where: { id: { in: locationIds } },
  });

  if (existing > 0 && !FORCE) {
    console.log(
      `[fieldmap-seed] Skipping ${company.name ?? company.email} — demo locations already exist (use --force to replace).`,
    );
    return;
  }

  if (FORCE && existing > 0) {
    await wipeSeedData(company.id);
    console.log(`[fieldmap-seed] Cleared existing demo locations for ${company.name ?? company.email}.`);
  }

  const resolvedStaffIds = [];

  const projects = [
    {
      id: projectId(company.id, "tour"),
      name: "2026 National Event Tour",
      startDate: d("2026-04-01"),
      endDate: d("2026-09-30"),
      color: "#3B82F6",
      status: "active",
    },
    {
      id: projectId(company.id, "hold"),
      name: "Seattle Pavilion — On Hold",
      startDate: d("2026-08-01"),
      endDate: d("2026-08-15"),
      color: "#F97316",
      status: "on_hold",
    },
    {
      id: projectId(company.id, "done"),
      name: "Q1 Completed Sites",
      startDate: d("2026-04-01"),
      endDate: d("2026-05-31"),
      color: "#94A3B8",
      status: "completed",
    },
  ];

  for (const p of projects) {
    await prisma.ganttProject.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate,
        color: p.color,
        status: p.status,
        companyId: companyIdStr,
      },
      update: {
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate,
        color: p.color,
        status: p.status,
        companyId: companyIdStr,
      },
    });
  }

  for (let i = 0; i < STAFF_SPECS.length; i++) {
    resolvedStaffIds[i] = await resolveOrCreateStaff(company.id, i, companyIdStr);
  }

  for (const loc of LOCATION_SPECS) {
    const locId = locationId(company.id, loc.slug);
    const pid = projectId(company.id, loc.projectKey);
    await prisma.ganttProjectLocation.upsert({
      where: { id: locId },
      create: {
        id: locId,
        projectId: pid,
        name: loc.name,
        addressLine1: loc.addressLine1,
        city: loc.city,
        state: loc.state,
        zipCode: loc.zipCode,
        latitude: dec(loc.latitude),
        longitude: dec(loc.longitude),
        color: loc.color,
        startDate: loc.startDate ? d(loc.startDate) : null,
        endDate: loc.endDate ? d(loc.endDate) : null,
        showLocationMap: true,
      },
      update: {
        projectId: pid,
        name: loc.name,
        addressLine1: loc.addressLine1,
        city: loc.city,
        state: loc.state,
        zipCode: loc.zipCode,
        latitude: dec(loc.latitude),
        longitude: dec(loc.longitude),
        color: loc.color,
        startDate: loc.startDate ? d(loc.startDate) : null,
        endDate: loc.endDate ? d(loc.endDate) : null,
        showLocationMap: true,
      },
    });

    await prisma.ganttProjectStaff.deleteMany({
      where: { locationId: locId, projectId: pid },
    });

    for (const staffIdx of loc.staffIndexes) {
      const sid = resolvedStaffIds[staffIdx];
      if (!sid) continue;
      const startIso = loc.startDate ? loc.startDate : null;
      const endIso = loc.endDate ? loc.endDate : null;
      const label =
        startIso && endIso
          ? serializeAssignmentSchedule(buildDaySchedule(startIso, endIso))
          : STAFF_SPECS[staffIdx].name;
      await prisma.ganttProjectStaff.create({
        data: {
          id: `${locId}-staff-${sid}`,
          projectId: pid,
          locationId: locId,
          staffId: sid,
          label,
          startDate: loc.startDate ? d(loc.startDate) : null,
          endDate: loc.endDate ? d(loc.endDate) : null,
          approvalStatus: "approved",
        },
      });
    }
  }

  console.log(
    `[fieldmap-seed] ✓ ${company.name ?? company.email}: ${LOCATION_SPECS.length} locations across ${projects.length} Gantt projects.`,
  );
  console.log("[fieldmap-seed] Open http://localhost:5000/projects/field-map");
}

async function main() {
  console.log("[fieldmap-seed] Ensuring Gantt location schema…");
  execSync("node ./scripts/ensure-gantt-location-schema.js", {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });

  const where = { type: "company", isActive: true };
  if (FILTER_EMAIL) where.email = { equals: FILTER_EMAIL, mode: "insensitive" };
  if (FILTER_NAME) where.name = { contains: FILTER_NAME, mode: "insensitive" };

  const companies = await prisma.user.findMany({
    where,
    orderBy: { id: "asc" },
    select: { id: true, name: true, email: true },
  });

  if (!companies.length) {
    console.error("[fieldmap-seed] No company user found. Try --name=\"First Aid Responders\" or --email=…");
    process.exit(1);
  }

  for (const company of companies) {
    await seedCompany(company);
  }

  console.log("[fieldmap-seed] Done.");
}

main()
  .catch((err) => {
    console.error("[fieldmap-seed] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
