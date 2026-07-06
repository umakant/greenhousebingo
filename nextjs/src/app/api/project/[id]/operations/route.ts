import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getProjectOpsContext,
  logProjectActivity,
  serializeProjectOps,
} from "@/lib/project-operations-api";
import { syncGanttStaffAssignmentsForProject } from "@/lib/gantt-project-staff-sync";
import { normalizeProjectVisibleSections } from "@/lib/project-visible-sections";

function parseOptionalInt(value: unknown): number | null {
  if (value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const project = await prisma.project.findFirst({
    where: { id: projectId },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await syncGanttStaffAssignmentsForProject(projectId).catch(() => {});

  const lead = await prisma.projectLeadAssignment.findUnique({
    where: { projectId },
  });
  let leadUser: { id: number; name: string; email: string } | null = null;
  if (lead) {
    const u = await prisma.user.findFirst({
      where: { id: lead.userId },
      select: { id: true, name: true, email: true },
    });
    if (u) leadUser = { id: Number(u.id), name: u.name ?? u.email ?? "", email: u.email ?? "" };
  }

  const checklistPhases = ["pre_project", "project", "post_project"] as const;
  const checklistItems = await prisma.projectChecklistItem.findMany({
    where: { projectId },
    orderBy: [{ phase: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
  });

  const phaseProgress: Record<string, number> = {};
  for (const phase of checklistPhases) {
    const items = checklistItems.filter((i) => i.phase === phase);
    if (items.length === 0) phaseProgress[phase] = 0;
    else {
      const done = items.filter((i) => i.status === "completed").length;
      phaseProgress[phase] = Math.round((done / items.length) * 100);
    }
  }

  const staffCounts = await prisma.projectStaffAssignment.groupBy({
    by: ["role"],
    where: { projectId },
    _count: { id: true },
  });

  return NextResponse.json({
    project: serializeProjectOps(project),
    visible_sections: serializeProjectOps(project).visible_sections,
    lead: leadUser ?? null,
    phase_progress: {
      pre_project: phaseProgress.pre_project,
      project: phaseProgress.project,
      post_project: phaseProgress.post_project,
    },
    staff_counts: {
      agent: staffCounts.find((s) => s.role === "agent")?._count.id ?? 0,
      medic: staffCounts.find((s) => s.role === "medic")?._count.id ?? 0,
      security: staffCounts.find((s) => s.role === "security")?._count.id ?? 0,
    },
    can_manage: auth.canManage,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data: Record<string, unknown> = { updatedAt: new Date() };
  if ("num_attendees" in body) data.numAttendees = parseOptionalInt(body.num_attendees);
  if ("num_agents" in body) data.numAgents = parseOptionalInt(body.num_agents);
  if ("num_medics" in body) data.numMedics = parseOptionalInt(body.num_medics);
  if ("num_security" in body) data.numSecurity = parseOptionalInt(body.num_security);
  if ("visible_sections" in body && body.visible_sections != null && typeof body.visible_sections === "object") {
    data.visibleSections = normalizeProjectVisibleSections(body.visible_sections as Record<string, boolean>);
  }

  const updatedKeys = Object.keys(data).filter((k) => k !== "updatedAt");
  if (updatedKeys.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data,
  });

  await logProjectActivity(
    projectId,
    auth.actor.id,
    auth.actor.type ?? "user",
    updatedKeys.includes("visibleSections") ? "project_setup" : "event_overview",
    updatedKeys.includes("visibleSections")
      ? "Updated project sidebar sections"
      : "Updated event overview staffing targets",
  );

  return NextResponse.json({ ok: true, project: serializeProjectOps(project) });
}
