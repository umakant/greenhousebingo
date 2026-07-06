import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue } from "@/lib/authz";

export const dynamic = "force-dynamic";

function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null }) {
  return a.type === "company" ? a.id : (a.createdBy ?? a.id);
}

async function getActor(req: NextRequest) {
  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  if (!email) return null;
  return prisma.user.findFirst({ where: { email }, select: { id: true, type: true, createdBy: true } });
}

function ser(v: unknown): unknown {
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Date) return v.toISOString();
  if (v !== null && typeof v === "object" && !Array.isArray(v)) {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, ser(val)]));
  }
  if (Array.isArray(v)) return v.map(ser);
  return v;
}

export async function GET(req: NextRequest) {
  if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = getCompanyId(actor);

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1") || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "20") || 20));
  const projectId = url.searchParams.get("project_id");
  const stageId = url.searchParams.get("stage_id");
  const priority = url.searchParams.get("priority");
  const search = (url.searchParams.get("search") ?? "").trim();

  const where: Record<string, unknown> = { createdBy: companyId };
  if (projectId) where.projectId = BigInt(projectId);
  if (stageId) where.stageId = BigInt(stageId);
  if (priority) where.priority = priority;
  if (search) where.title = { contains: search, mode: "insensitive" };

  const [total, tasks] = await Promise.all([
    prisma.projectTask.count({ where }),
    prisma.projectTask.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        stage: { select: { id: true, name: true, color: true } },
        milestone: { select: { id: true, title: true } },
        subtasks: { select: { id: true, name: true, isCompleted: true } },
        _count: { select: { comments: true } },
      },
    }),
  ]);

  const assignedUserIds = [...new Set(tasks.flatMap((t) => {
    if (!t.assignedTo) return [];
    const ids = Array.isArray(t.assignedTo) ? t.assignedTo : [];
    return ids.map(Number).filter(Boolean);
  }))];

  const users = assignedUserIds.length
    ? await prisma.user.findMany({ where: { id: { in: assignedUserIds.map(BigInt) } }, select: { id: true, name: true } })
    : [];
  const userMap = Object.fromEntries(users.map((u) => [Number(u.id), u.name]));

  const data = tasks.map((t) => {
    const assignedTo: number[] = Array.isArray(t.assignedTo) ? (t.assignedTo as number[]).map(Number) : [];
    let startDate: string | null = null;
    let endDate: string | null = null;
    if (t.duration && t.duration.includes(" - ")) {
      const [s, e] = t.duration.split(" - ");
      startDate = s.trim();
      endDate = e.trim();
    }
    return {
      id: Number(t.id),
      project_id: Number(t.projectId),
      milestone_id: t.milestoneId ? Number(t.milestoneId) : null,
      title: t.title,
      priority: t.priority,
      assigned_to: assignedTo,
      assigned_users: assignedTo.map((uid) => ({ id: uid, name: userMap[uid] ?? "Unknown" })),
      duration: t.duration,
      start_date: startDate,
      end_date: endDate,
      stage_id: t.stageId ? Number(t.stageId) : null,
      stage: t.stage ? { id: Number(t.stage.id), name: t.stage.name, color: t.stage.color } : null,
      milestone: t.milestone ? { id: Number(t.milestone.id), title: t.milestone.title } : null,
      description: t.description,
      comment_count: t._count.comments,
      subtask_count: t.subtasks.length,
      subtask_completed: t.subtasks.filter((s) => s.isCompleted).length,
      created_at: t.createdAt.toISOString(),
    };
  });

  return NextResponse.json({ data, total, current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)), per_page: perPage });
}

function canCreateTask(perms: string[]) {
  return (
    perms.includes("*") ||
    perms.includes("manage-project") ||
    perms.includes("manage-project-dashboard") ||
    perms.includes("create-project-task")
  );
}

export async function POST(req: NextRequest) {
  try {
    const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
    if (!canCreateTask(perms)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const companyId = getCompanyId(actor);
    const body = await req.json().catch(() => null);
    if (!body?.project_id || !body?.title) {
      return NextResponse.json({ error: "project_id and title required" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: BigInt(body.project_id), createdBy: companyId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const duration =
      body.start_date && body.end_date ? `${body.start_date} - ${body.end_date}` : (body.duration ?? null);

    const assignedRaw = Array.isArray(body.assigned_to) ? body.assigned_to.map(Number) : [];
    const task = await prisma.projectTask.create({
      data: {
        projectId: BigInt(body.project_id),
        milestoneId: body.milestone_id ? BigInt(body.milestone_id) : null,
        title: String(body.title).trim(),
        priority: ["High", "Medium", "Low"].includes(body.priority) ? body.priority : "Medium",
        assignedTo: assignedRaw,
        duration,
        stageId: body.stage_id ? BigInt(body.stage_id) : null,
        description: body.description ? String(body.description).trim() : null,
        creatorId: actor.id,
        createdBy: companyId,
      },
    });
    return NextResponse.json({ ok: true, id: Number(task.id) });
  } catch (e) {
    console.error("[api/project/tasks] POST", e);
    const message = e instanceof Error ? e.message : "Failed to create task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
