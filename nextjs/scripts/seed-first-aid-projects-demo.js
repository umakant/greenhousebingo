/* eslint-disable no-console */
/**
 * Seed Super Bowl + SHRM projects for First Aid Responders and backfill linked Gantt chart data
 * (gantt_projects, locations, staff assignments) so /projects?view=gantt shows bars in production.
 *
 * Usage:
 *   npm run db:seed:first-aid-projects:first-aid-prod
 *   npm run db:seed:first-aid-gantt:first-aid-prod
 *   node ./scripts/seed-first-aid-projects-demo.js --force --name="First Aid Responders"
 */
const path = require("node:path");
const { execSync } = require("node:child_process");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({ log: ["error"] });
const FORCE = process.argv.includes("--force");
const GANTT_ONLY = process.argv.includes("--gantt-only");

function readArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit ? hit.slice(prefix.length + 1).trim() : null;
}

const FILTER_EMAIL = readArg("--email");
const FILTER_NAME = readArg("--name");

const SEED_PREFIX = "far-demo-project";
const GANTT_PREFIX = "far-gantt";
const SCHEDULE_LABEL_PREFIX = "__schedule__:";

function companyKey(companyId) {
  return String(companyId);
}

function ganttProjectId(companyId, slug) {
  return `${GANTT_PREFIX}-${companyKey(companyId)}-${slug}`;
}

function ganttLocationId(companyId, slug) {
  return `${GANTT_PREFIX}-${companyKey(companyId)}-loc-${slug}`;
}

function ganttStaffRowId(companyId, slug) {
  return `${GANTT_PREFIX}-${companyKey(companyId)}-staff-${slug}`;
}

function d(str) {
  return new Date(`${str}T12:00:00.000Z`);
}

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
    rows.push({
      date: cursor.toISOString().slice(0, 10),
      enabled: true,
      startTime: "07:00",
      endTime: "17:00",
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return rows;
}

function mapProjectStatusToGantt(status) {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "finished") return "completed";
  if (s === "onhold" || s === "on hold") return "on_hold";
  return "active";
}

const PROJECT_SPECS = [
  {
    slug: "super-bowl",
    seedKey: `${SEED_PREFIX}-super-bowl`,
    name: "Super Bowl",
    description: "On-site medical and field operations for Super Bowl activations.",
    startDate: "2026-06-16",
    endDate: "2026-06-21",
    status: "Ongoing",
    usrNumber: "SB-2026-001",
    timezone: "(GMT-08:00) Pacific Time",
    propertyName: "Allegiant Stadium",
    address: "3333 Al Davis Way",
    city: "Las Vegas",
    state: "NV",
    zipCode: "89118",
    latitude: 36.0909,
    longitude: -115.1833,
    color: "#3B82F6",
    numAgents: 1,
  },
  {
    slug: "shrm",
    seedKey: `${SEED_PREFIX}-shrm`,
    name: "SHRM",
    description: "Medical standby and field support for SHRM conference operations.",
    startDate: "2026-06-11",
    endDate: "2026-06-21",
    status: "Not Started",
    usrNumber: "SHRM-2026-001",
    timezone: "(GMT-05:00) Eastern Time",
    propertyName: "McCormick Place",
    address: "2301 S King Dr",
    city: "Chicago",
    state: "IL",
    zipCode: "60616",
    latitude: 41.8512,
    longitude: -87.6169,
    color: "#6366F1",
    numAgents: 1,
  },
];

async function upsertProject(companyId, spec) {
  const base = {
    name: spec.name,
    description: spec.description,
    startDate: d(spec.startDate),
    endDate: d(spec.endDate),
    status: spec.status,
    seedKey: spec.seedKey,
    usrNumber: spec.usrNumber,
    timezone: spec.timezone,
    propertyName: spec.propertyName,
    address: spec.address,
    city: spec.city,
    state: spec.state,
    zipCode: spec.zipCode,
    numAgents: spec.numAgents,
    creatorId: companyId,
    createdBy: companyId,
    updatedAt: new Date(),
  };

  let existing =
    (await prisma.project.findFirst({ where: { seedKey: spec.seedKey } })) ??
    (await prisma.project.findFirst({
      where: {
        createdBy: companyId,
        name: { equals: spec.name, mode: "insensitive" },
      },
      orderBy: { id: "asc" },
    }));

  if (existing) {
    if (!existing.seedKey) base.seedKey = spec.seedKey;
    if (!existing.startDate) base.startDate = d(spec.startDate);
    if (!existing.endDate) base.endDate = d(spec.endDate);
    return prisma.project.update({ where: { id: existing.id }, data: base });
  }

  return prisma.project.create({ data: base });
}

async function ensureProjectMember(projectId, userId) {
  await prisma.projectUser.createMany({
    data: [{ projectId, userId }],
    skipDuplicates: true,
  });
}

async function resolveGanttStaff(companyId, companyIdStr, spec) {
  const staffSeedId = ganttStaffRowId(companyId, spec.slug);
  const preferred =
    (await prisma.user.findFirst({
      where: {
        createdBy: companyId,
        type: "staff",
        isActive: true,
        email: { contains: "lynn@", mode: "insensitive" },
      },
      select: { id: true, name: true, email: true },
    })) ??
    (await prisma.user.findFirst({
      where: { createdBy: companyId, type: "staff", isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true, email: true },
    }));

  const name = preferred?.name ?? "Field Medic";
  const email = preferred?.email ?? null;

  const existing = await prisma.ganttStaff.findFirst({
    where: {
      companyId: companyIdStr,
      OR: [
        { id: staffSeedId },
        ...(email ? [{ email: { equals: email, mode: "insensitive" } }] : []),
        { name: { equals: name, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    await prisma.ganttStaff.update({
      where: { id: existing.id },
      data: { name, email, companyId: companyIdStr, color: "#6366F1", updatedAt: new Date() },
    });
    return existing.id;
  }

  await prisma.ganttStaff.create({
    data: {
      id: staffSeedId,
      name,
      email,
      color: "#6366F1",
      companyId: companyIdStr,
    },
  });
  return staffSeedId;
}

async function upsertGanttForProject(companyId, companyIdStr, spec, project) {
  const ganttId = ganttProjectId(companyId, spec.slug);
  const ganttData = {
    name: project.name,
    startDate: project.startDate,
    endDate: project.endDate,
    status: mapProjectStatusToGantt(project.status),
    companyId: companyIdStr,
    projectRefId: project.id,
    color: spec.color,
    progress: project.status?.toLowerCase() === "ongoing" ? 15 : 0,
  };

  const linked = await prisma.ganttProject.findFirst({
    where: { projectRefId: project.id, companyId: companyIdStr },
    select: { id: true },
  });

  if (linked && linked.id !== ganttId) {
    await prisma.ganttProject.update({ where: { id: linked.id }, data: ganttData });
    return linked.id;
  }

  await prisma.ganttProject.upsert({
    where: { id: ganttId },
    create: { id: ganttId, ...ganttData },
    update: { ...ganttData, updatedAt: new Date() },
  });

  const locId = ganttLocationId(companyId, spec.slug);
  await prisma.ganttProjectLocation.upsert({
    where: { id: locId },
    create: {
      id: locId,
      projectId: ganttId,
      name: spec.propertyName,
      addressLine1: spec.address,
      city: spec.city,
      state: spec.state,
      zipCode: spec.zipCode,
      latitude: spec.latitude,
      longitude: spec.longitude,
      color: spec.color,
      startDate: d(spec.startDate),
      endDate: d(spec.endDate),
      showLocationMap: true,
    },
    update: {
      projectId: ganttId,
      name: spec.propertyName,
      addressLine1: spec.address,
      city: spec.city,
      state: spec.state,
      zipCode: spec.zipCode,
      latitude: spec.latitude,
      longitude: spec.longitude,
      color: spec.color,
      startDate: d(spec.startDate),
      endDate: d(spec.endDate),
      showLocationMap: true,
      updatedAt: new Date(),
    },
  });

  const staffId = await resolveGanttStaff(companyId, companyIdStr, spec);
  const assignmentId = `${locId}-staff-${staffId}`;
  const scheduleLabel = serializeAssignmentSchedule(buildDaySchedule(spec.startDate, spec.endDate));

  await prisma.ganttProjectStaff.deleteMany({
    where: { id: assignmentId },
  });

  await prisma.ganttProjectStaff.create({
    data: {
      id: assignmentId,
      projectId: ganttId,
      locationId: locId,
      staffId,
      label: scheduleLabel,
      startDate: d(spec.startDate),
      endDate: d(spec.endDate),
      approvalStatus: "approved",
      approvedAt: new Date(),
    },
  });

  return ganttId;
}

async function syncAllCompanyProjectsToGantt(companyId, companyIdStr) {
  const projects = await prisma.project.findMany({
    where: { createdBy: companyId },
    select: { id: true, name: true, startDate: true, endDate: true, status: true, createdBy: true },
  });

  let synced = 0;
  for (const project of projects) {
    if (!project.startDate || !project.endDate) continue;
    const existing = await prisma.ganttProject.findFirst({
      where: { projectRefId: project.id, companyId: companyIdStr },
    });
    if (existing) continue;

    await prisma.ganttProject.create({
      data: {
        name: project.name,
        startDate: project.startDate,
        endDate: project.endDate,
        status: mapProjectStatusToGantt(project.status),
        companyId: companyIdStr,
        projectRefId: project.id,
        color: "#3B82F6",
      },
    });
    synced += 1;
  }
  return synced;
}

async function repairGanttCompanyIds(companyId, companyIdStr) {
  const projects = await prisma.project.findMany({
    where: { createdBy: companyId },
    select: { id: true, name: true, startDate: true, endDate: true, status: true, createdBy: true },
  });

  let repaired = 0;
  for (const project of projects) {
    const rows = await prisma.ganttProject.findMany({
      where: { projectRefId: project.id },
      select: { id: true, companyId: true },
    });

    for (const row of rows) {
      if (row.companyId !== companyIdStr) {
        await prisma.ganttProject.update({
          where: { id: row.id },
          data: { companyId: companyIdStr, updatedAt: new Date() },
        });
        repaired += 1;
      }
    }

    if (!rows.length && project.startDate && project.endDate) {
      await syncProjectToGantt(project);
      repaired += 1;
    }
  }

  if (repaired > 0) {
    console.log(`[first-aid-projects] Repaired ${repaired} Gantt link(s) for company ${companyIdStr}.`);
  }
}

async function seedCompany(company) {
  const companyIdStr = companyKey(company.id);
  const seedKeys = PROJECT_SPECS.map((p) => p.seedKey);

  const existingCount = await prisma.project.count({
    where: {
      createdBy: company.id,
      OR: [
        { seedKey: { in: seedKeys } },
        { name: { in: PROJECT_SPECS.map((p) => p.name), mode: "insensitive" } },
      ],
    },
  });

  if (existingCount >= PROJECT_SPECS.length && !FORCE && !GANTT_ONLY) {
    console.log(
      `[first-aid-projects] Projects exist for ${company.name ?? company.email} — syncing Gantt only (use --force to refresh project fields).`,
    );
  }

  const assignee =
    (await prisma.user.findFirst({
      where: {
        createdBy: company.id,
        type: "staff",
        isActive: true,
        email: { contains: "lynn@", mode: "insensitive" },
      },
      select: { id: true },
    })) ??
    (await prisma.user.findFirst({
      where: { createdBy: company.id, type: "staff", isActive: true },
      orderBy: { id: "asc" },
      select: { id: true },
    }));

  const memberId = assignee?.id ?? company.id;

  for (const spec of PROJECT_SPECS) {
    let project;
    if (GANTT_ONLY) {
      project =
        (await prisma.project.findFirst({ where: { seedKey: spec.seedKey } })) ??
        (await prisma.project.findFirst({
          where: { createdBy: company.id, name: { equals: spec.name, mode: "insensitive" } },
          orderBy: { id: "asc" },
        }));
      if (!project) {
        console.warn(`[first-aid-projects] Skip Gantt for "${spec.name}" — project row not found.`);
        continue;
      }
    } else {
      project = await upsertProject(company.id, spec);
      await ensureProjectMember(project.id, memberId);
    }

    const ganttId = await upsertGanttForProject(company.id, companyIdStr, spec, project);
    console.log(
      `[first-aid-projects] ✓ ${spec.name} — project #${project.id}, gantt ${ganttId} (${spec.startDate} → ${spec.endDate})`,
    );
  }

  await repairGanttCompanyIds(company.id, companyIdStr);

  const extra = await syncAllCompanyProjectsToGantt(company.id, companyIdStr);
  if (extra > 0) {
    console.log(`[first-aid-projects] Linked ${extra} additional project(s) to Gantt.`);
  }

  console.log(`[first-aid-projects] Open https://securxpro.com/projects?view=gantt`);
}

async function main() {
  console.log("[first-aid-projects] Ensuring Gantt location schema…");
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
    console.error(
      '[first-aid-projects] No company user found. Try --name="First Aid Responders" or --email=crimson@mailsac.com',
    );
    process.exit(1);
  }

  for (const company of companies) {
    await seedCompany(company);
  }

  console.log("[first-aid-projects] Done.");
}

main()
  .catch((err) => {
    console.error("[first-aid-projects] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
