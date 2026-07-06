/* eslint-disable no-console */
/**
 * Seed POS services catalog for security / first-aid field operations,
 * scoped to a company tenant (organizationId on pos_services).
 *
 * Usage:
 *   npm run db:seed:pos-services
 *   npm run db:seed:pos-services:first-aid
 *   node ./scripts/seed-pos-services-demo.js --force --email=crimson@mailsac.com
 */
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const FORCE = process.argv.includes("--force");
const PREFIX = "FAR-SVC-";

function readArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit ? hit.slice(prefix.length + 1).trim() : null;
}

const FILTER_EMAIL = readArg("--email");
const FILTER_NAME = readArg("--name");

const UNITS = [
  { key: "hr", name: "Hour", shortName: "hr" },
  { key: "day", name: "Day", shortName: "day" },
  { key: "session", name: "Session", shortName: "session" },
  { key: "event", name: "Event", shortName: "event" },
];

const TAX = { name: "Sales Tax 8%", rate: 8, type: "percentage" };

const SERVICES = [
  {
    code: `${PREFIX}SEC-001`,
    name: "Security Guard (Standard)",
    description: "Uniformed security officer for general site coverage, access control, and patrol.",
    rate: 42.0,
    unit: "hr",
  },
  {
    code: `${PREFIX}SEC-002`,
    name: "Security Supervisor",
    description: "Lead supervisor for shift coordination, incident reporting, and team oversight.",
    rate: 58.0,
    unit: "hr",
  },
  {
    code: `${PREFIX}MED-001`,
    name: "Event Medical Standby",
    description: "On-site medic or EMT standby for concerts, sports, and large public events.",
    rate: 75.0,
    unit: "hr",
  },
  {
    code: `${PREFIX}MED-002`,
    name: "On-Site Medic Coverage",
    description: "Dedicated medic assigned to a venue or job site for the full shift.",
    rate: 68.0,
    unit: "hr",
  },
  {
    code: `${PREFIX}TRN-001`,
    name: "CPR / AED Training Session",
    description: "Hands-on CPR and AED certification session for up to 12 participants.",
    rate: 450.0,
    unit: "session",
  },
  {
    code: `${PREFIX}TRN-002`,
    name: "First Aid Certification Class",
    description: "Standard first aid certification course with materials and instructor.",
    rate: 525.0,
    unit: "session",
  },
  {
    code: `${PREFIX}OPS-001`,
    name: "Site Security Assessment",
    description: "Walkthrough and written assessment of physical security and staffing needs.",
    rate: 350.0,
    unit: "event",
  },
  {
    code: `${PREFIX}OPS-002`,
    name: "Emergency Response Dispatch",
    description: "Rapid deployment of field team for urgent on-site incidents.",
    rate: 895.0,
    unit: "event",
  },
  {
    code: `${PREFIX}OPS-003`,
    name: "Crowd Management",
    description: "Trained staff for queue control, entry screening, and crowd flow.",
    rate: 48.0,
    unit: "hr",
  },
  {
    code: `${PREFIX}OPS-004`,
    name: "Mobile Patrol Service",
    description: "Vehicle patrol with check-in reports for multiple locations per day.",
    rate: 620.0,
    unit: "day",
  },
  {
    code: `${PREFIX}OPS-005`,
    name: "VIP Escort Detail",
    description: "Close-protection style escort for talent, executives, or high-profile guests.",
    rate: 95.0,
    unit: "hr",
  },
  {
    code: `${PREFIX}MNT-001`,
    name: "Equipment Maintenance & Inspection",
    description: "Radio, battery, and field gear inspection with service log.",
    rate: 185.0,
    unit: "session",
  },
];

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

async function upsertService(companyId, spec, refs) {
  const unitId = refs.units[spec.unit]?.id ?? null;
  const taxId = refs.tax?.id ?? null;

  const existing = await prisma.posService.findFirst({
    where: {
      OR: [
        { code: spec.code },
        { organizationId: companyId, name: { equals: spec.name, mode: "insensitive" } },
      ],
    },
  });

  const data = {
    name: spec.name,
    description: spec.description,
    code: spec.code,
    rate: spec.rate,
    unitId,
    taxId,
    isActive: true,
    organizationId: companyId,
    createdBy: companyId,
  };

  if (existing) {
    await prisma.posService.update({ where: { id: existing.id }, data });
    return "updated";
  }
  await prisma.posService.create({ data });
  return "created";
}

async function seedCompany(company) {
  const companyId = company.id;
  const label = company.name ?? company.email;

  const existing = await prisma.posService.count({
    where: {
      organizationId: companyId,
      code: { startsWith: PREFIX },
    },
  });

  if (existing > 0 && !FORCE) {
    console.log(
      `[pos-services] Skipping ${label} — found ${existing} seeded services (use --force to refresh).`,
    );
    return;
  }

  console.log(`[pos-services] Seeding services for ${label} (id ${companyId})…`);

  const units = {};
  for (const u of UNITS) {
    units[u.key] = await ensureUnit(companyId, u);
  }

  const tax = await ensureTax(companyId);

  let created = 0;
  let updated = 0;
  for (const s of SERVICES) {
    const result = await upsertService(companyId, s, { units, tax });
    if (result === "created") created += 1;
    else updated += 1;
  }

  const total = await prisma.posService.count({
    where: { organizationId: companyId, isActive: true },
  });

  console.log(
    `[pos-services] ✓ ${label}: ${created} created, ${updated} updated (${SERVICES.length} services, ${UNITS.length} units).`,
  );
  console.log(`[pos-services] Active services for tenant: ${total}`);
}

async function main() {
  console.log("[pos-services] Starting POS services seed…");

  const where = { type: "company", isActive: true };
  if (FILTER_EMAIL) where.email = { equals: FILTER_EMAIL, mode: "insensitive" };
  if (FILTER_NAME) where.name = { contains: FILTER_NAME, mode: "insensitive" };

  const companies = await prisma.user.findMany({
    where,
    orderBy: { id: "asc" },
    select: { id: true, name: true, email: true },
  });

  if (!companies.length) {
    console.error("[pos-services] No company found. Try --email=crimson@mailsac.com");
    process.exit(1);
  }

  for (const company of companies) {
    await seedCompany(company);
  }

  console.log("[pos-services] Done.");
}

main()
  .catch((err) => {
    console.error("[pos-services] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
