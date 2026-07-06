import { prisma } from "@/lib/prisma";
import { ganttStaffMergeKey } from "@/lib/gantt-staff-dedupe";

const STAFF_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4", "#F97316", "#84CC16"];

type StaffCandidate = { name: string; email: string | null };

type GanttStaffWithCounts = {
  id: string;
  name: string;
  email: string | null;
  color: string | null;
  companyId: string | null;
  createdAt: Date;
  _count: { assignments: number };
};

function buildStaffCandidates(
  portalStaff: Array<{ name: string | null; email: string | null }>,
  hrmEmployees: Array<{ firstName: string; lastName: string | null; email: string | null }>,
): StaffCandidate[] {
  const map = new Map<string, StaffCandidate>();

  for (const user of portalStaff) {
    const name = (user.name ?? "Staff").trim();
    if (!name) continue;
    const email = user.email?.trim() || null;
    const key = ganttStaffMergeKey({ name, email });
    if (!map.has(key)) map.set(key, { name, email });
  }

  for (const emp of hrmEmployees) {
    const name = `${emp.firstName} ${emp.lastName ?? ""}`.trim();
    if (!name) continue;
    const email = emp.email?.trim() || null;
    const key = ganttStaffMergeKey({ name, email });
    if (!map.has(key)) map.set(key, { name, email });
  }

  return [...map.values()];
}

function filterNewStaffCandidates(
  existing: Array<{ name: string; email: string | null }>,
  candidates: StaffCandidate[],
): StaffCandidate[] {
  const existingKeys = new Set(existing.map((row) => ganttStaffMergeKey(row)));

  return candidates.filter((candidate) => !existingKeys.has(ganttStaffMergeKey(candidate)));
}

function compareStaffKeepPreference(a: GanttStaffWithCounts, b: GanttStaffWithCounts): number {
  if (a._count.assignments !== b._count.assignments) {
    return b._count.assignments - a._count.assignments;
  }
  const aHasEmail = a.email?.trim() ? 1 : 0;
  const bHasEmail = b.email?.trim() ? 1 : 0;
  if (aHasEmail !== bHasEmail) return bHasEmail - aHasEmail;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

/** Collapse duplicate gantt_staff rows (same email or name) and re-point assignments. */
export async function mergeDuplicateGanttStaff(companyId: string): Promise<number> {
  const rows = await prisma.ganttStaff.findMany({
    where: { companyId },
    include: { _count: { select: { assignments: true } } },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, GanttStaffWithCounts[]>();
  for (const row of rows) {
    const key = ganttStaffMergeKey(row);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  let removed = 0;
  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    const sorted = [...group].sort(compareStaffKeepPreference);
    const keeper = sorted[0];
    for (const dupe of sorted.slice(1)) {
      await prisma.ganttProjectStaff.updateMany({
        where: { staffId: dupe.id },
        data: { staffId: keeper.id },
      });
      await prisma.ganttStaff.delete({ where: { id: dupe.id } });
      removed += 1;
    }
  }

  return removed;
}

/** Ensure GanttStaff rows exist for portal staff users and HRM employees. */
export async function syncGanttStaffForCompany(companyId: string, companyBigId: bigint) {
  const existing = await prisma.ganttStaff.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });

  const [portalStaff, hrmEmployees] = await Promise.all([
    prisma.user.findMany({
      where: { type: "staff", createdBy: companyBigId },
      select: { name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.hrmEmployee.findMany({
      where: { createdBy: companyBigId, status: "active" },
      select: { firstName: true, lastName: true, email: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  const candidates = buildStaffCandidates(portalStaff, hrmEmployees);
  const toCreate = filterNewStaffCandidates(existing, candidates);

  if (toCreate.length > 0) {
    await prisma.ganttStaff.createMany({
      data: toCreate.map((candidate, index) => ({
        name: candidate.name,
        email: candidate.email,
        color: STAFF_COLORS[(existing.length + index) % STAFF_COLORS.length],
        companyId,
      })),
      skipDuplicates: true,
    });
  }

  await mergeDuplicateGanttStaff(companyId);

  return prisma.ganttStaff.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
}
