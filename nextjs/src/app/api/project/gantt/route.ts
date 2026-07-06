import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue } from "@/lib/authz";

export const dynamic = "force-dynamic";

function ser(v: unknown): unknown {
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Date) return v.toISOString();
  if (v !== null && typeof v === "object" && !Array.isArray(v))
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, ser(val)]));
  if (Array.isArray(v)) return v.map(ser);
  return v;
}

function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null }) {
  return a.type === "company" ? a.id : (a.createdBy ?? a.id);
}

export async function GET(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  const canView = perms.includes("*") || perms.includes("manage-project") || perms.includes("manage-project-dashboard");
  if (!canView) return NextResponse.json({ projects: [] });

  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findFirst({
    where: { email },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = getCompanyId(actor);

  const [projects, tasks, taskStages] = await Promise.all([
    prisma.project.findMany({
      where: { createdBy: companyId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        budget: true,
        createdAt: true,
      },
    }),
    prisma.projectTask.findMany({
      where: { createdBy: companyId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        projectId: true,
        milestoneId: true,
        title: true,
        priority: true,
        duration: true,
        stageId: true,
        assignedTo: true,
        stage: { select: { id: true, name: true, color: true, complete: true } },
        milestone: { select: { id: true, title: true } },
      },
    }),
    prisma.taskStage.findMany({
      where: { createdBy: companyId },
      orderBy: { order: "asc" },
      select: { id: true, name: true, color: true, complete: true },
    }),
  ]);

  const projectIds = projects.map((p) => p.id);
  const milestones = projectIds.length
    ? await prisma.projectMilestone.findMany({
        where: { projectId: { in: projectIds } },
        orderBy: { createdAt: "asc" },
        select: { id: true, projectId: true, title: true, startDate: true, endDate: true, status: true },
      })
    : [];

  const tasksByProject: Record<number, typeof tasks> = {};
  for (const t of tasks) {
    const pid = Number(t.projectId);
    if (!tasksByProject[pid]) tasksByProject[pid] = [];
    tasksByProject[pid].push(t);
  }

  const milestonesByProject: Record<number, typeof milestones> = {};
  for (const m of milestones) {
    const pid = Number(m.projectId);
    if (!milestonesByProject[pid]) milestonesByProject[pid] = [];
    milestonesByProject[pid].push(m);
  }

  const data = projects.map((p) => ({
    ...p,
    tasks: (tasksByProject[Number(p.id)] ?? []).map((t) => {
      let startDate: string | null = null;
      let endDate: string | null = null;
      if (t.duration && t.duration.includes(" - ")) {
        const [s, e] = t.duration.split(" - ");
        startDate = s.trim();
        endDate = e.trim();
      }
      return { ...t, startDate, endDate };
    }),
    milestones: milestonesByProject[Number(p.id)] ?? [],
  }));

  return NextResponse.json(ser({ projects: data, taskStages }));
}
