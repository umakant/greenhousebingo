/* eslint-disable no-console */
/**
 * Seed CRM leads, deals, and pipeline stages for demo / local testing.
 *
 * Usage:
 *   npm run db:seed:crm
 *   npm run db:seed:crm:force
 *   npm run db:seed:crm:first-aid
 *   node ./scripts/seed-crm-demo.js --force --name="First Aid Responders"
 */
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const FORCE = process.argv.includes("--force");
const RESET_PIPELINES = process.argv.includes("--reset-pipelines");

function readArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit ? hit.slice(prefix.length + 1).trim() : null;
}

const FILTER_EMAIL = readArg("--email");
const FILTER_NAME = readArg("--name");

const DEFAULT_STAGES = [
  { name: "New", color: "#6366f1", order: 0 },
  { name: "Qualified", color: "#f59e0b", order: 1 },
  { name: "Won", color: "#10b981", order: 2 },
  { name: "Lost", color: "#ef4444", order: 3 },
  { name: "Under Contract", color: "#3b82f6", order: 4 },
];

function fullName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function formatPhone(digits) {
  const d = String(digits).replace(/\D/g, "").slice(0, 10);
  if (d.length !== 10) return digits;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

async function wipeCrmRecords(companyId) {
  await prisma.crmDealActivity.deleteMany({ where: { deal: { createdBy: companyId } } });
  await prisma.crmLeadActivity.deleteMany({ where: { lead: { createdBy: companyId } } });
  await prisma.crmDeal.deleteMany({ where: { createdBy: companyId } });
  await prisma.crmLead.deleteMany({ where: { createdBy: companyId } });
}

async function wipePipelines(companyId) {
  await prisma.crmPipelineStage.deleteMany({ where: { createdBy: companyId } });
  await prisma.crmPipeline.deleteMany({ where: { createdBy: companyId } });
}

async function ensureSalesPipeline(companyId) {
  let pipeline = await prisma.crmPipeline.findFirst({
    where: {
      createdBy: companyId,
      OR: [{ isDefault: true }, { name: { equals: "Sales Pipeline", mode: "insensitive" } }],
    },
    include: { stages: { orderBy: { order: "asc" } } },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  if (!pipeline) {
    pipeline = await prisma.crmPipeline.create({
      data: {
        name: "Sales Pipeline",
        description: "Default lead and deal pipeline",
        isDefault: true,
        createdBy: companyId,
      },
      include: { stages: true },
    });
  }

  if (!pipeline.stages.length) {
    await prisma.crmPipelineStage.createMany({
      data: DEFAULT_STAGES.map((s) => ({
        pipelineId: pipeline.id,
        name: s.name,
        color: s.color,
        order: s.order,
        createdBy: companyId,
      })),
    });
  } else {
    const existingNames = new Set(pipeline.stages.map((s) => s.name.toLowerCase()));
    const missing = DEFAULT_STAGES.filter((s) => !existingNames.has(s.name.toLowerCase()));
    if (missing.length) {
      const maxOrder = Math.max(...pipeline.stages.map((s) => s.order ?? 0), -1);
      await prisma.crmPipelineStage.createMany({
        data: missing.map((s, i) => ({
          pipelineId: pipeline.id,
          name: s.name,
          color: s.color,
          order: maxOrder + 1 + i,
          createdBy: companyId,
        })),
      });
    }
  }

  pipeline = await prisma.crmPipeline.findFirstOrThrow({
    where: { id: pipeline.id },
    include: { stages: { orderBy: { order: "asc" } } },
  });

  const stageByName = Object.fromEntries(pipeline.stages.map((s) => [s.name.toLowerCase(), s]));
  return { pipeline, stageByName };
}

async function seedCompany(company) {
  const companyId = company.id;
  const label = company.name ?? company.email;

  const existingLeads = await prisma.crmLead.count({ where: { createdBy: companyId } });
  const existingDeals = await prisma.crmDeal.count({ where: { createdBy: companyId } });

  if ((existingLeads > 0 || existingDeals > 0) && !FORCE) {
    console.log(
      `[crm-seed] Skipping ${label} — found ${existingLeads} leads, ${existingDeals} deals (use --force to replace).`,
    );
    return;
  }

  if (FORCE) {
    await wipeCrmRecords(companyId);
    console.log(`[crm-seed] Cleared leads/deals for ${label}.`);
  }

  if (RESET_PIPELINES) {
    await wipePipelines(companyId);
    console.log(`[crm-seed] Reset pipelines for ${label}.`);
  }

  const { pipeline, stageByName } = await ensureSalesPipeline(companyId);
  const stage = (name) => stageByName[name.toLowerCase()] ?? pipeline.stages[0];

  const leadsData = [
    {
      firstName: "Tim",
      lastName: "Smith",
      email: "tim@aool.com",
      phone: formatPhone("9999999999"),
      company: "Smith Enterprises, LLC",
      source: "referral",
      status: "new",
      value: 10000,
      stageName: "New",
    },
    {
      firstName: "Maria",
      lastName: "Gonzalez",
      email: "maria.gonzalez@riverviewschools.demo",
      phone: formatPhone("6105550303"),
      company: "Riverview School District",
      source: "website",
      status: "qualified",
      value: 18500,
      stageName: "Qualified",
    },
    {
      firstName: "James",
      lastName: "Porter",
      email: "accounts@summitconstruction.demo",
      phone: formatPhone("2675550202"),
      company: "Summit Construction Group",
      source: "phone",
      status: "contacted",
      value: 42000,
      stageName: "Qualified",
    },
    {
      firstName: "Chris",
      lastName: "Anderson",
      email: "finance@libertyevents.demo",
      phone: formatPhone("4845550404"),
      company: "Liberty Event Services",
      source: "referral",
      status: "qualified",
      value: 75000,
      stageName: "Under Contract",
    },
    {
      firstName: "Patricia",
      lastName: "Lee",
      email: "ap@northgatemfg.demo",
      phone: formatPhone("3025550505"),
      company: "Northgate Manufacturing",
      source: "email",
      status: "new",
      value: 22000,
      stageName: "New",
    },
    {
      firstName: "Dr. Sarah",
      lastName: "Mitchell",
      email: "billing@metrohealth.demo",
      phone: formatPhone("2155550101"),
      company: "Metro Health Clinic",
      source: "website",
      status: "contacted",
      value: 12800,
      stageName: "New",
    },
    {
      firstName: "Elena",
      lastName: "Ruiz",
      email: "events@phillyarena.demo",
      phone: formatPhone("2155557788"),
      company: "Philly Arena Events",
      source: "social_media",
      status: "qualified",
      value: 95000,
      stageName: "Qualified",
    },
    {
      firstName: "Marcus",
      lastName: "Thompson",
      email: "ops@superbowlsecurity.demo",
      phone: formatPhone("2155559900"),
      company: "Super Bowl Security LLC",
      source: "referral",
      status: "qualified",
      value: 250000,
      stageName: "Under Contract",
    },
    {
      firstName: "Lynn",
      lastName: "Nicely",
      email: "lynn@firstaidresponders.net",
      phone: formatPhone("2155550101"),
      company: "First Aid Responders",
      source: "other",
      status: "converted",
      value: 0,
      stageName: "Won",
    },
    {
      firstName: "Ryan",
      lastName: "Brooks",
      email: "ryan.b@firstaidresponders.net",
      phone: formatPhone("2155550108"),
      company: "Brooks Training Co.",
      source: "website",
      status: "unqualified",
      value: 3500,
      stageName: "Lost",
    },
  ];

  const leadIds = {};
  for (const row of leadsData) {
    const st = stage(row.stageName);
    const created = await prisma.crmLead.create({
      data: {
        name: fullName(row.firstName, row.lastName),
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        company: row.company,
        source: row.source,
        status: row.status,
        value: row.value,
        pipelineId: pipeline.id,
        stageId: st?.id ?? null,
        createdBy: companyId,
      },
    });
    leadIds[row.email.toLowerCase()] = created.id;
  }
  console.log(`[crm-seed] Created ${leadsData.length} leads for ${label}.`);

  const dealsData = [
    {
      name: "Smith Enterprises — onsite medic coverage",
      amount: 10000,
      status: "open",
      leadEmail: "tim@aool.com",
      stageName: "New",
    },
    {
      name: "Riverview School District — CPR certification",
      amount: 18500,
      status: "open",
      leadEmail: "maria.gonzalez@riverviewschools.demo",
      stageName: "Qualified",
    },
    {
      name: "Summit Construction — job site first aid",
      amount: 42000,
      status: "open",
      leadEmail: "accounts@summitconstruction.demo",
      stageName: "Qualified",
    },
    {
      name: "Liberty Events — festival medical staffing",
      amount: 75000,
      status: "open",
      leadEmail: "finance@libertyevents.demo",
      stageName: "Under Contract",
    },
    {
      name: "Northgate Manufacturing — OSHA compliance training",
      amount: 22000,
      status: "open",
      leadEmail: "ap@northgatemfg.demo",
      stageName: "New",
    },
    {
      name: "Metro Health — clinic standby support",
      amount: 12800,
      status: "open",
      leadEmail: "billing@metrohealth.demo",
      stageName: "New",
    },
    {
      name: "Philly Arena — concert season medics",
      amount: 95000,
      status: "open",
      leadEmail: "events@phillyarena.demo",
      stageName: "Qualified",
    },
    {
      name: "Super Bowl 2026 — full event medical team",
      amount: 250000,
      status: "open",
      leadEmail: "ops@superbowlsecurity.demo",
      stageName: "Under Contract",
    },
    {
      name: "First Aid Responders — annual training renewal",
      amount: 8500,
      status: "won",
      leadEmail: "lynn@firstaidresponders.net",
      stageName: "Won",
    },
    {
      name: "Brooks Training — small workshop (lost)",
      amount: 3500,
      status: "lost",
      leadEmail: "ryan.b@firstaidresponders.net",
      stageName: "Lost",
    },
  ];

  for (const row of dealsData) {
    const leadId = leadIds[row.leadEmail.toLowerCase()];
    const st = stage(row.stageName);
    await prisma.crmDeal.create({
      data: {
        name: row.name,
        amount: row.amount,
        status: row.status,
        pipelineId: pipeline.id,
        stageId: st?.id ?? null,
        leadId: leadId ?? null,
        createdBy: companyId,
      },
    });
  }
  console.log(`[crm-seed] Created ${dealsData.length} deals for ${label}.`);

  const activityLeads = await prisma.crmLead.findMany({
    where: { createdBy: companyId },
    orderBy: { createdAt: "asc" },
    take: 6,
  });
  const activities = [
    { type: "call", note: "Intro call — discussed event dates and staffing levels" },
    { type: "meeting", note: "Site walkthrough scheduled with operations team" },
    { type: "note", note: "Sent proposal follow-up and scope of services" },
    { type: "call", note: "Confirmed budget range and decision timeline" },
    { type: "meeting", note: "Contract review with legal" },
    { type: "note", note: "Added medics roster requirements to deal notes" },
  ];
  for (let i = 0; i < activityLeads.length; i++) {
    await prisma.crmLeadActivity.create({
      data: {
        leadId: activityLeads[i].id,
        type: activities[i].type,
        note: activities[i].note,
      },
    });
  }
  console.log(`[crm-seed] ✓ ${label}: pipeline "${pipeline.name}" with ${pipeline.stages.length} stages.`);
}

async function main() {
  console.log("[crm-seed] Starting CRM demo seed…");

  const where = { type: "company", isActive: true };
  if (FILTER_EMAIL) where.email = { equals: FILTER_EMAIL, mode: "insensitive" };
  if (FILTER_NAME) where.name = { contains: FILTER_NAME, mode: "insensitive" };

  const companies = await prisma.user.findMany({
    where,
    orderBy: { id: "asc" },
    select: { id: true, name: true, email: true },
  });

  if (!companies.length) {
    console.error("[crm-seed] No company user found. Try --name=\"First Aid Responders\" or --email=…");
    process.exit(1);
  }

  for (const company of companies) {
    await seedCompany(company);
  }

  console.log("[crm-seed] Done.");
}

main()
  .catch((err) => {
    console.error("[crm-seed] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
