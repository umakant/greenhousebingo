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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = getCompanyId(actor);
  const { id } = await params;

  const task = await prisma.projectTask.findFirst({
    where: { id: BigInt(id), createdBy: companyId },
    include: {
      stage: { select: { id: true, name: true, color: true } },
      milestone: { select: { id: true, title: true } },
      comments: { include: { task: false }, orderBy: { createdAt: "asc" } },
      subtasks: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assignedTo: number[] = Array.isArray(task.assignedTo) ? (task.assignedTo as number[]).map(Number) : [];
  const users = assignedTo.length ? await prisma.user.findMany({ where: { id: { in: assignedTo.map(BigInt) } }, select: { id: true, name: true } }) : [];
  const userMap = Object.fromEntries(users.map((u) => [Number(u.id), u.name]));

  const commentUserIds = [...new Set(task.comments.map((c) => Number(c.userId)))];
  const commentUsers = commentUserIds.length ? await prisma.user.findMany({ where: { id: { in: commentUserIds.map(BigInt) } }, select: { id: true, name: true } }) : [];
  const commentUserMap = Object.fromEntries(commentUsers.map((u) => [Number(u.id), u.name]));

  let startDate: string | null = null;
  let endDate: string | null = null;
  if (task.duration && task.duration.includes(" - ")) {
    const [s, e] = task.duration.split(" - ");
    startDate = s.trim();
    endDate = e.trim();
  }

  return NextResponse.json({
    id: Number(task.id),
    project_id: Number(task.projectId),
    milestone_id: task.milestoneId ? Number(task.milestoneId) : null,
    title: task.title,
    priority: task.priority,
    assigned_to: assignedTo,
    assigned_users: assignedTo.map((uid) => ({ id: uid, name: userMap[uid] ?? "Unknown" })),
    duration: task.duration,
    start_date: startDate,
    end_date: endDate,
    stage_id: task.stageId ? Number(task.stageId) : null,
    stage: task.stage ? { id: Number(task.stage.id), name: task.stage.name, color: task.stage.color } : null,
    milestone: task.milestone ? { id: Number(task.milestone.id), title: task.milestone.title } : null,
    description: task.description,
    comments: task.comments.map((c) => ({
      id: Number(c.id), task_id: Number(c.taskId), comment: c.comment,
      user_id: Number(c.userId), user_name: commentUserMap[Number(c.userId)] ?? "Unknown",
      created_at: c.createdAt.toISOString(),
    })),
    subtasks: task.subtasks.map((s) => ({
      id: Number(s.id), task_id: Number(s.taskId), name: s.name,
      due_date: s.dueDate?.toISOString().slice(0, 10) ?? null,
      is_completed: s.isCompleted, user_id: Number(s.userId),
      created_at: s.createdAt.toISOString(),
    })),
    created_at: task.createdAt.toISOString(),
  });
}

function canEditTask(perms: string[]) {
  return (
    perms.includes("*") ||
    perms.includes("manage-project") ||
    perms.includes("manage-project-dashboard") ||
    perms.includes("edit-project-task")
  );
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
    if (!canEditTask(perms)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const companyId = getCompanyId(actor);
    const { id } = await params;
    const body = await req.json().catch(() => null);

    const task = await prisma.projectTask.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const duration =
      body?.start_date && body?.end_date
        ? `${body.start_date} - ${body.end_date}`
        : body?.duration !== undefined
          ? body.duration
          : task.duration;

    await prisma.projectTask.update({
      where: { id: BigInt(id) },
      data: {
        ...(body?.title !== undefined && { title: String(body.title).trim() }),
        ...(body?.priority !== undefined && { priority: body.priority }),
        ...(body?.assigned_to !== undefined && {
          assignedTo: Array.isArray(body.assigned_to) ? body.assigned_to.map(Number) : [],
        }),
        ...(body?.stage_id !== undefined && { stageId: body.stage_id ? BigInt(body.stage_id) : null }),
        ...(body?.milestone_id !== undefined && {
          milestoneId: body.milestone_id ? BigInt(body.milestone_id) : null,
        }),
        ...(body?.description !== undefined && { description: body.description ?? null }),
        duration,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/project/tasks] PATCH", e);
    const message = e instanceof Error ? e.message : "Failed to update task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function canDeleteTask(perms: string[]) {
  return (
    perms.includes("*") ||
    perms.includes("manage-project") ||
    perms.includes("manage-project-dashboard") ||
    perms.includes("delete-project-task")
  );
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
    if (!canDeleteTask(perms)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const companyId = getCompanyId(actor);
    const { id } = await params;
    const task = await prisma.projectTask.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.projectTask.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/project/tasks] DELETE", e);
    const message = e instanceof Error ? e.message : "Failed to delete task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
