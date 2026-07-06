/* eslint-disable no-console */
/**
 * Seed HRM System Setup only: Branches, Departments, Designations.
 *
 * Usage:
 *   node ./scripts/seed-hrm-setup.js --email=crimson@mailsac.com
 *   node ./scripts/seed-hrm-setup.js --name="First Aid Responders"
 *   node ./scripts/seed-hrm-setup.js --force --email=crimson@mailsac.com
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const FORCE = process.argv.includes("--force");

function readArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit ? hit.slice(prefix.length + 1).trim() : null;
}

const FILTER_EMAIL = readArg("--email");
const FILTER_NAME = readArg("--name");

async function findCompany() {
  const where = { type: { in: ["company", "company_admin"] }, isActive: true };
  if (FILTER_EMAIL) where.email = { equals: FILTER_EMAIL, mode: "insensitive" };
  if (FILTER_NAME) where.name = { contains: FILTER_NAME, mode: "insensitive" };
  return prisma.user.findFirst({
    where,
    orderBy: { id: "asc" },
    select: { id: true, name: true, email: true },
  });
}

async function wipeSetup(companyId) {
  await prisma.hrmDesignation.deleteMany({ where: { createdBy: companyId } });
  await prisma.hrmDepartment.deleteMany({ where: { createdBy: companyId } });
  await prisma.hrmBranch.deleteMany({ where: { createdBy: companyId } });
}

async function upsertBranch(companyId, data) {
  const existing = await prisma.hrmBranch.findFirst({
    where: { createdBy: companyId, name: data.name },
  });
  const payload = { ...data, isActive: true, updatedAt: new Date() };
  if (existing) {
    return prisma.hrmBranch.update({ where: { id: existing.id }, data: payload });
  }
  return prisma.hrmBranch.create({ data: { ...payload, createdBy: companyId } });
}

async function upsertDepartment(companyId, data) {
  const existing = await prisma.hrmDepartment.findFirst({
    where: { createdBy: companyId, name: data.name },
  });
  const payload = { ...data, isActive: true, updatedAt: new Date() };
  if (existing) {
    return prisma.hrmDepartment.update({ where: { id: existing.id }, data: payload });
  }
  return prisma.hrmDepartment.create({ data: { ...payload, createdBy: companyId } });
}

async function upsertDesignation(companyId, data) {
  const existing = await prisma.hrmDesignation.findFirst({
    where: { createdBy: companyId, name: data.name },
  });
  const payload = { ...data, isActive: true, updatedAt: new Date() };
  if (existing) {
    return prisma.hrmDesignation.update({ where: { id: existing.id }, data: payload });
  }
  return prisma.hrmDesignation.create({ data: { ...payload, createdBy: companyId } });
}

async function seedSetup(companyId, company) {
  const label = company.name ?? company.email ?? String(companyId);
  console.log(`[hrm-setup] Seeding branches, departments, designations for ${label} (id=${companyId})…`);

  const hq = await upsertBranch(companyId, {
    name: "Main HQ — Philadelphia",
    description: "Corporate headquarters, dispatch, and administration",
    phone: "(215) 555-0100",
    email: "hq@firstaidresponders.net",
    address: "1200 Market Street",
    city: "Philadelphia",
    country: "USA",
  });

  const field = await upsertBranch(companyId, {
    name: "Field Operations — Mid-Atlantic",
    description: "On-site event medics and emergency response teams",
    phone: "(215) 555-0101",
    email: "field@firstaidresponders.net",
    address: "4500 City Ave",
    city: "Philadelphia",
    country: "USA",
  });

  const training = await upsertBranch(companyId, {
    name: "Training Center",
    description: "CPR, first aid, and medic certification programs",
    phone: "(215) 555-0102",
    email: "training@firstaidresponders.net",
    address: "800 Spring Garden St",
    city: "Philadelphia",
    country: "USA",
  });

  const deptSpecs = [
    {
      name: "Executive / Leadership",
      description: "Oversees company strategy, decision-making, and overall direction.",
      branchId: hq.id,
    },
    {
      name: "Operations",
      description: "Manages daily operations, staffing, and service delivery.",
      branchId: field.id,
    },
    {
      name: "Administration",
      description: "Handles internal support, documentation, and office coordination.",
      branchId: hq.id,
    },
    {
      name: "Training & Development",
      description: "Manages employee training, certifications, and compliance.",
      branchId: training.id,
    },
    {
      name: "Client Support",
      description: "Provides client onboarding, support, and issue resolution.",
      branchId: hq.id,
    },
    {
      name: "Health & Safety",
      description: "Ensures safety standards, risk management, and regulatory compliance.",
      branchId: field.id,
    },
    {
      name: "Security",
      description: "Oversees security operations, policies, and threat management.",
      branchId: field.id,
    },
  ];

  const departments = {};
  for (const spec of deptSpecs) {
    departments[spec.name] = await upsertDepartment(companyId, {
      name: spec.name,
      description: spec.description,
      branchId: spec.branchId,
    });
  }

  const desigSpecs = [
    {
      name: "Owner",
      description: "Directs overall business strategy and operations.",
      departmentId: departments["Executive / Leadership"].id,
    },
    {
      name: "Director of Operations",
      description: "Leads operations, staffing, and performance.",
      departmentId: departments.Operations.id,
    },
    {
      name: "Global Director of Security",
      description: "Oversees security strategy and risk management.",
      departmentId: departments.Security.id,
    },
    {
      name: "Health & Safety Consultant",
      description: "Ensures safety standards and compliance.",
      departmentId: departments["Health & Safety"].id,
    },
    {
      name: "Training Coordinator",
      description: "Manages training programs and compliance tracking.",
      departmentId: departments["Training & Development"].id,
    },
    {
      name: "Training Instructor",
      description: "Delivers CPR, first aid, and medic certification courses.",
      departmentId: departments["Training & Development"].id,
    },
    {
      name: "Lead Medic",
      description: "Supervises field medics at events and incidents.",
      departmentId: departments.Operations.id,
    },
    {
      name: "Field Medic",
      description: "Provides on-site medical coverage at events.",
      departmentId: departments.Operations.id,
    },
    {
      name: "EMT",
      description: "Emergency medical technician for field deployments.",
      departmentId: departments.Operations.id,
    },
    {
      name: "Client Support Specialist",
      description: "Assists clients with onboarding and support.",
      departmentId: departments["Client Support"].id,
    },
    {
      name: "Administrative",
      description: "Oversees daily office tasks, scheduling, and records.",
      departmentId: departments.Administration.id,
    },
    {
      name: "Administrative Assistant",
      description: "Handles clerical tasks and coordination.",
      departmentId: departments.Administration.id,
    },
    {
      name: "HR Manager",
      description: "Leads people operations, payroll, and policy.",
      departmentId: departments.Administration.id,
    },
  ];

  for (const spec of desigSpecs) {
    await upsertDesignation(companyId, {
      name: spec.name,
      description: spec.description,
      departmentId: spec.departmentId,
    });
  }

  console.log(`[hrm-setup] ✓ 3 branches, ${deptSpecs.length} departments, ${desigSpecs.length} designations`);
}

async function main() {
  const company = await findCompany();
  if (!company) {
    console.error(
      "[hrm-setup] No company found. Use --email=crimson@mailsac.com or --name=\"First Aid Responders\".",
    );
    process.exit(1);
  }

  const companyId = company.id;
  const existing =
    (await prisma.hrmBranch.count({ where: { createdBy: companyId } })) +
    (await prisma.hrmDepartment.count({ where: { createdBy: companyId } })) +
    (await prisma.hrmDesignation.count({ where: { createdBy: companyId } }));

  if (existing > 0 && !FORCE) {
    console.log(
      `[hrm-setup] Setup data already exists for ${company.name ?? company.email}. Re-run with --force to replace.`,
    );
    process.exit(0);
  }

  if (FORCE && existing > 0) {
    console.log(`[hrm-setup] Replacing existing setup data for ${company.name ?? company.email}…`);
    await wipeSetup(companyId);
  }

  await seedSetup(companyId, company);
  console.log("[hrm-setup] Done. Open /hrm/setup to review.");
}

main()
  .catch((err) => {
    console.error("[hrm-setup] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
