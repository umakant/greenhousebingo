import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue } from "@/lib/authz";

export const dynamic = "force-dynamic";

function normalizeEmail(e: string) { return e.trim().toLowerCase(); }
function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null }): bigint {
  return a.type === "company" ? a.id : (a.createdBy ?? a.id);
}

function buildMonths(now: Date) {
  const months: { month: string; label: string; created: number; completed: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      label: d.toLocaleDateString("en-US", { month: "short" }),
      created: 0,
      completed: 0,
    });
  }
  return months;
}

/** Last 6 calendar years including the current year (e.g. 2021–2026). */
function buildYears(now: Date) {
  const years: { year: string; created: number; completed: number }[] = [];
  const currentY = now.getFullYear();
  for (let i = 5; i >= 0; i--) {
    const y = currentY - i;
    years.push({ year: String(y), created: 0, completed: 0 });
  }
  return years;
}

const emptyResponse = (now: Date) => ({
  stats: { total_projects: 0, total_tasks: 0, total_bugs: 0, total_users: 0, total_clients: 0, completed_tasks: 0, completion_rate: 0, overdue_projects: 0 },
  monthlyProgress: buildMonths(now),
  yearlyProgress: buildYears(now),
  projectStatus: [
    { name: "Ongoing", value: 0, color: "#3b82f6" },
    { name: "Finished", value: 0, color: "#10b981" },
    { name: "On Hold", value: 0, color: "#f59e0b" },
  ],
  taskPriority: [
    { name: "High", value: 0, color: "#ef4444" },
    { name: "Medium", value: 0, color: "#f59e0b" },
    { name: "Low", value: 0, color: "#10b981" },
  ],
  teamPerformance: [] as { name: string; total_tasks: number; completed_tasks: number; completion_rate: number }[],
  recentTasks: [] as {
    id: number; title: string; priority: string; stage_name: string | null;
    stage_color: string | null; stage_complete: boolean;
    assigned_users: string[]; project_name: string;
  }[],
});

export async function GET() {
  const now = new Date();
  try {
    const store = await cookies();
    const role = store.get("pf_role")?.value;
    if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const perms = getPermissionsFromCookieValue(store.get("pf_permissions")?.value);
    const canView = perms.includes("*") || perms.includes("manage-project-dashboard") || perms.includes("manage-project");
    if (!canView) return NextResponse.json(emptyResponse(now));

    const actorEmail = normalizeEmail(store.get("pf_email")?.value ?? "");
    if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const actor = await prisma.user.findFirst({
      where: { email: actorEmail },
      select: { id: true, type: true, createdBy: true },
    });
    if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = getCompanyId(actor);

    // ── Parallel fetches ───────────────────────────────────────────────────
    const [
      projects,
      totalUsers,
      totalClients,
      overdueProjects,
      completedStages,
      tasks,
      staffUsers,
      bugStages,
      allBugs,
    ] = await Promise.all([
      prisma.project.findMany({
        where: { createdBy: companyId },
        select: { id: true, status: true, endDate: true, createdAt: true },
      }),
      prisma.user.count({ where: { createdBy: companyId, type: "staff" } }),
      prisma.user.count({ where: { createdBy: companyId, type: "client" } }),
      prisma.project.count({
        where: { createdBy: companyId, endDate: { lt: now }, status: { not: "Finished" } },
      }),
      prisma.taskStage.findMany({
        where: { createdBy: companyId, complete: true },
        select: { id: true },
      }),
      prisma.projectTask.findMany({
        where: { createdBy: companyId },
        select: {
          id: true, priority: true, stageId: true, assignedTo: true, createdAt: true,
          stage: { select: { complete: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: { createdBy: companyId, type: "staff" },
        select: { id: true, name: true },
      }),
      prisma.bugStage.findMany({
        where: { createdBy: companyId },
        select: { id: true, complete: true },
      }),
      prisma.projectBug.findMany({
        where: { createdBy: companyId },
        select: { id: true, stageId: true },
      }),
    ]);

    const projectIds = projects.map((p) => p.id);
    const completedStageIds = new Set(completedStages.map((s) => s.id.toString()));

    // ── Bug Stats ─────────────────────────────────────────────────────────
    const completedBugStageIds = new Set(bugStages.filter((s) => s.complete).map((s) => s.id.toString()));
    const activeBugs = allBugs.filter((b) => !b.stageId || !completedBugStageIds.has(b.stageId.toString())).length;
    const resolvedBugs = allBugs.filter((b) => b.stageId && completedBugStageIds.has(b.stageId.toString())).length;

    // Recent tasks with stage + project info
    const recentTasksRaw = await prisma.projectTask.findMany({
      where: { projectId: { in: projectIds } },
      select: {
        id: true, title: true, priority: true, assignedTo: true, createdAt: true,
        stage: { select: { name: true, color: true, complete: true } },
        milestone: { select: { id: true, title: true } },
        projectId: true,
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    });

    // Get project names for recent tasks
    const projectNameMap: Record<string, string> = {};
    for (const p of await prisma.project.findMany({
      where: { id: { in: [...new Set(recentTasksRaw.map((t) => t.projectId))] } },
      select: { id: true, name: true },
    })) {
      projectNameMap[p.id.toString()] = p.name;
    }

    // Staff ID → name map
    const staffMap: Record<string, string> = {};
    for (const u of staffUsers) staffMap[u.id.toString()] = u.name ?? `#${u.id}`;

    // ── Stats ──────────────────────────────────────────────────────────────
    const totalProjects = projects.length;
    const ongoingCount = projects.filter((p) => p.status === "Ongoing").length;
    const finishedCount = projects.filter((p) => p.status === "Finished").length;
    const onholdCount = projects.filter((p) => p.status === "On Hold" || p.status === "Onhold").length;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.stageId && completedStageIds.has(t.stageId.toString())).length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // ── Task Priority ──────────────────────────────────────────────────────
    const priorityMap: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
    for (const t of tasks) {
      const p = t.priority ?? "Medium";
      const key = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
      if (key === "High" || key === "Urgent") priorityMap["High"]++;
      else if (key === "Low") priorityMap["Low"]++;
      else priorityMap["Medium"]++;
    }

    // ── Monthly Progress (last 6 months) ──────────────────────────────────
    const months = buildMonths(now);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const recentTasks6m = await prisma.projectTask.findMany({
      where: { projectId: { in: projectIds }, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, stageId: true },
    });
    for (const t of recentTasks6m) {
      const label = t.createdAt.toLocaleDateString("en-US", { month: "short" });
      const m = months.find((mo) => mo.month === label);
      if (m) {
        m.created++;
        if (t.stageId && completedStageIds.has(t.stageId.toString())) m.completed++;
      }
    }

    // ── Yearly Progress (last 6 years) ────────────────────────────────────
    const years = buildYears(now);
    const earliestYearStart = new Date(now.getFullYear() - 5, 0, 1);
    const recentTasks6y = await prisma.projectTask.findMany({
      where: { projectId: { in: projectIds }, createdAt: { gte: earliestYearStart } },
      select: { createdAt: true, stageId: true },
    });
    for (const t of recentTasks6y) {
      const y = String(t.createdAt.getFullYear());
      const row = years.find((yr) => yr.year === y);
      if (row) {
        row.created++;
        if (t.stageId && completedStageIds.has(t.stageId.toString())) row.completed++;
      }
    }

    // ── Team Performance ──────────────────────────────────────────────────
    const staffTaskMap: Record<string, { total: number; completed: number }> = {};
    for (const u of staffUsers) staffTaskMap[u.id.toString()] = { total: 0, completed: 0 };

    for (const t of tasks) {
      let assignees: string[] = [];
      try {
        if (Array.isArray(t.assignedTo)) assignees = (t.assignedTo as unknown[]).map(String);
        else if (typeof t.assignedTo === "string") assignees = JSON.parse(t.assignedTo as string);
      } catch { assignees = []; }
      const isDone = t.stageId ? completedStageIds.has(t.stageId.toString()) : false;
      for (const uid of assignees) {
        if (!staffTaskMap[uid]) staffTaskMap[uid] = { total: 0, completed: 0 };
        staffTaskMap[uid].total++;
        if (isDone) staffTaskMap[uid].completed++;
      }
    }

    const teamPerformance = staffUsers
      .map((u) => {
        const rec = staffTaskMap[u.id.toString()] ?? { total: 0, completed: 0 };
        return {
          name: u.name ?? `Staff #${u.id}`,
          total_tasks: rec.total,
          completed_tasks: rec.completed,
          completion_rate: rec.total > 0 ? Math.round((rec.completed / rec.total) * 100) : 0,
        };
      })
      .filter((u) => u.total_tasks > 0)
      .sort((a, b) => b.total_tasks - a.total_tasks)
      .slice(0, 6);

    // ── Recent Tasks ──────────────────────────────────────────────────────
    const recentTasksFormatted = recentTasksRaw.map((t) => {
      let assignees: string[] = [];
      try {
        if (Array.isArray(t.assignedTo)) assignees = (t.assignedTo as unknown[]).map(String);
        else if (typeof t.assignedTo === "string") assignees = JSON.parse(t.assignedTo as string);
      } catch { assignees = []; }
      const assignedNames = assignees.map((uid) => staffMap[uid] ?? `User #${uid}`).filter(Boolean);
      return {
        id: Number(t.id),
        title: t.title,
        priority: t.priority ?? "Medium",
        stage_name: t.stage?.name ?? null,
        stage_color: t.stage?.color ?? null,
        stage_complete: t.stage?.complete ?? false,
        assigned_users: assignedNames,
        project_name: projectNameMap[t.projectId.toString()] ?? "—",
      };
    });

    return NextResponse.json({
      stats: {
        total_projects: totalProjects,
        total_tasks: totalTasks,
        total_bugs: activeBugs + resolvedBugs,
        active_bugs: activeBugs,
        resolved_bugs: resolvedBugs,
        total_users: totalUsers,
        total_clients: totalClients,
        completed_tasks: completedTasks,
        completion_rate: completionRate,
        overdue_projects: overdueProjects,
      },
      monthlyProgress: months,
      yearlyProgress: years,
      projectStatus: [
        { name: "Ongoing", value: ongoingCount, color: "#3b82f6" },
        { name: "Finished", value: finishedCount, color: "#10b981" },
        { name: "On Hold", value: onholdCount, color: "#f59e0b" },
      ],
      taskPriority: [
        { name: "High", value: priorityMap["High"], color: "#ef4444" },
        { name: "Medium", value: priorityMap["Medium"], color: "#f59e0b" },
        { name: "Low", value: priorityMap["Low"], color: "#10b981" },
      ],
      teamPerformance,
      recentTasks: recentTasksFormatted,
    });
  } catch (e) {
    console.error("Project dashboard error:", e);
    return NextResponse.json(emptyResponse(now));
  }
}
