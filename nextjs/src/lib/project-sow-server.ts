import { prisma } from "@/lib/prisma";
import { syncGanttStaffAssignmentsForProject } from "@/lib/gantt-project-staff-sync";
import type { SowProjectContext, SowStaffAssignment } from "@/lib/project-sow";
import { formatGanttLocationLine, parseFormDataJson, type SowProjectMeta } from "@/lib/project-sow-form";

type GanttLocationRow = {
  name: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
};

function resolveProjectLocations(
  project: {
    propertyName: string | null;
    address: string | null;
    address2: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
  },
  ganttLocs: GanttLocationRow[],
): Pick<SowProjectContext, "property_name" | "address" | "address_2" | "city" | "state" | "zip_code" | "extra_locations"> {
  let property_name = project.propertyName?.trim() || null;
  let address = project.address?.trim() || null;
  let address_2 = project.address2?.trim() || null;
  let city = project.city?.trim() || null;
  let state = project.state?.trim() || null;
  let zip_code = project.zipCode?.trim() || null;

  const projectHasPrimary = !!(property_name || address || address_2 || city || state);

  if (!projectHasPrimary && ganttLocs[0]) {
    const primary = ganttLocs[0];
    property_name = primary.name.trim();
    address = primary.addressLine1?.trim() || null;
    address_2 = primary.addressLine2?.trim() || null;
    city = primary.city?.trim() || null;
    state = primary.state?.trim() || null;
    zip_code = primary.zipCode?.trim() || null;
  } else if (property_name && ganttLocs.length) {
    const match = ganttLocs.find((l) => l.name.trim().toLowerCase() === property_name!.toLowerCase());
    if (match) {
      if (!address) address = match.addressLine1?.trim() || null;
      if (!address_2) address_2 = match.addressLine2?.trim() || null;
      if (!city) city = match.city?.trim() || null;
      if (!state) state = match.state?.trim() || null;
      if (!zip_code) zip_code = match.zipCode?.trim() || null;
    }
  }

  const primaryName = property_name?.trim().toLowerCase() ?? "";
  const extraLocations: string[] = [];

  for (const loc of ganttLocs) {
    const line = formatGanttLocationLine(loc);
    if (!line) continue;

    const isBorrowedPrimary = !projectHasPrimary && loc === ganttLocs[0];
    if (isBorrowedPrimary) continue;

    const matchesPrimaryName = primaryName && loc.name.trim().toLowerCase() === primaryName;
    if (matchesPrimaryName && line === loc.name.trim()) continue;

    extraLocations.push(line);
  }

  return {
    property_name,
    address,
    address_2,
    city,
    state,
    zip_code,
    extra_locations: [...new Set(extraLocations)],
  };
}

async function resolveProjectSowDefaults(
  projectId: bigint,
  project: { sowPerDiem: string | null; sowDressCode: string | null },
): Promise<{ sow_per_diem: string | null; sow_dress_code: string | null }> {
  if (project.sowPerDiem?.trim() || project.sowDressCode?.trim()) {
    return {
      sow_per_diem: project.sowPerDiem?.trim() || null,
      sow_dress_code: project.sowDressCode?.trim() || null,
    };
  }

  const template = await prisma.projectStaffSow.findFirst({
    where: {
      projectId,
      OR: [{ perDiem: { not: null } }, { dressCode: { not: null } }],
    },
    orderBy: { updatedAt: "desc" },
    select: { perDiem: true, dressCode: true, formData: true },
  });
  if (!template) return { sow_per_diem: null, sow_dress_code: null };

  const form = parseFormDataJson(template.formData);
  return {
    sow_per_diem: template.perDiem?.trim() || form?.per_diem?.trim() || null,
    sow_dress_code: template.dressCode?.trim() || form?.dress_code?.trim() || null,
  };
}

export async function loadSowProjectContext(projectId: bigint): Promise<SowProjectMeta | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId },
    select: {
      name: true,
      propertyName: true,
      address: true,
      address2: true,
      city: true,
      state: true,
      zipCode: true,
      timezone: true,
      usrNumber: true,
      status: true,
      startDate: true,
      endDate: true,
      createdBy: true,
      numAgents: true,
      numMedics: true,
      numSecurity: true,
      sowPerDiem: true,
      sowDressCode: true,
    },
  });
  if (!project) return null;

  const sowDefaults = await resolveProjectSowDefaults(projectId, project);

  let companyName: string | null = null;
  if (project.createdBy) {
    const company = await prisma.user.findFirst({
      where: { id: project.createdBy },
      select: { name: true, email: true },
    });
    companyName = company?.name ?? null;
  }

  const gantt = await prisma.ganttProject.findFirst({
    where: { projectRefId: projectId },
    select: {
      locations: {
        orderBy: { createdAt: "asc" },
        select: {
          name: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          zipCode: true,
        },
      },
    },
  });

  const resolved = resolveProjectLocations(project, gantt?.locations ?? []);

  const staffCounts = await prisma.projectStaffAssignment.groupBy({
    by: ["role"],
    where: { projectId },
    _count: { id: true },
  });
  const agents = staffCounts.find((s) => s.role === "agent")?._count.id ?? project.numAgents ?? 0;
  const medics = staffCounts.find((s) => s.role === "medic")?._count.id ?? project.numMedics ?? 0;
  const security = staffCounts.find((s) => s.role === "security")?._count.id ?? project.numSecurity ?? 0;

  return {
    name: project.name,
    property_name: resolved.property_name,
    address: resolved.address,
    address_2: resolved.address_2,
    city: resolved.city,
    state: resolved.state,
    zip_code: resolved.zip_code,
    timezone: project.timezone,
    usr_number: project.usrNumber,
    status: project.status,
    start_date: project.startDate?.toISOString().slice(0, 10) ?? null,
    end_date: project.endDate?.toISOString().slice(0, 10) ?? null,
    company_name: companyName,
    extra_locations: resolved.extra_locations,
    sow_per_diem: sowDefaults.sow_per_diem,
    sow_dress_code: sowDefaults.sow_dress_code,
    num_agents: project.numAgents,
    num_medics: project.numMedics,
    num_security: project.numSecurity,
    staffing: {
      agents: Number(agents),
      medics: Number(medics),
      security: Number(security),
      total: Number(agents) + Number(medics) + Number(security),
    },
  };
}

export async function loadStaffByUser(projectId: bigint) {
  await syncGanttStaffAssignmentsForProject(projectId).catch(() => {});

  const rows = await prisma.projectStaffAssignment.findMany({
    where: { projectId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const userIds = [...new Set(rows.map((r) => r.userId))];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const byUser = new Map<
    bigint,
    {
      user_id: number;
      name: string;
      email: string;
      roles: Set<string>;
      assignments: SowStaffAssignment[];
      assignment_count: number;
    }
  >();

  for (const r of rows) {
    const u = userMap.get(r.userId);
    const name = u?.name ?? u?.email ?? "Unknown";
    let entry = byUser.get(r.userId);
    if (!entry) {
      entry = {
        user_id: Number(r.userId),
        name,
        email: u?.email ?? "",
        roles: new Set(),
        assignments: [],
        assignment_count: 0,
      };
      byUser.set(r.userId, entry);
    }
    entry.roles.add(r.role);
    entry.assignment_count += 1;
    entry.assignments.push({
      role: r.role,
      work_date: r.workDate?.toISOString().slice(0, 10) ?? null,
      end_date: r.endDate?.toISOString().slice(0, 10) ?? null,
      start_time: r.startTime,
      end_time: r.endTime,
      position: r.position,
    });
  }

  return byUser;
}

export async function loadAssignmentsForUser(projectId: bigint, userId: bigint): Promise<SowStaffAssignment[]> {
  const rows = await prisma.projectStaffAssignment.findMany({
    where: { projectId, userId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return rows.map((r) => ({
    role: r.role,
    work_date: r.workDate?.toISOString().slice(0, 10) ?? null,
    end_date: r.endDate?.toISOString().slice(0, 10) ?? null,
    start_time: r.startTime,
    end_time: r.endTime,
    position: r.position,
  }));
}
