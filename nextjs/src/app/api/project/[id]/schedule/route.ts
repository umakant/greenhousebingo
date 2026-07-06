import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncGanttStaffAssignmentsForProject } from "@/lib/gantt-project-staff-sync";
import { getProjectOpsContext } from "@/lib/project-operations-api";

export const dynamic = "force-dynamic";

function calcHours(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (!Number.isFinite(sh) || !Number.isFinite(eh)) return null;
  const mins = eh * 60 + (em || 0) - (sh * 60 + (sm || 0));
  if (mins <= 0) return null;
  return Math.round((mins / 60) * 10) / 10;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    await syncGanttStaffAssignmentsForProject(projectId);
  } catch (e) {
    console.error("[project schedule] gantt sync failed", e);
  }

  const rows = await prisma.projectStaffAssignment.findMany({
    where: { projectId },
    orderBy: [{ workDate: "asc" }, { role: "asc" }, { id: "asc" }],
  });
  const userIds = rows.map((r) => r.userId);
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const data = rows.map((r) => {
    const u = userMap.get(r.userId);
    const typeLabel = r.role === "medic" ? "Medic" : r.role === "security" ? "Security" : "Agent";
    return {
      id: Number(r.id),
      type: typeLabel,
      role: r.role,
      name: u?.name ?? u?.email ?? "Unknown",
      position: r.position ?? "none",
      start_time: r.startTime,
      end_time: r.endTime,
      hours: calcHours(r.startTime, r.endTime),
      status: r.status,
      on_site: r.onSite,
      work_date: r.workDate?.toISOString().slice(0, 10) ?? null,
      gantt_assignment_id: r.ganttAssignmentId,
    };
  });

  return NextResponse.json({ data, total: data.length });
}
