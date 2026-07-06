import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getActor(req: NextRequest) {
  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  if (!email) return null;
  return prisma.user.findFirst({ where: { email }, select: { id: true, type: true, createdBy: true } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const subtasks = await prisma.taskSubtask.findMany({ where: { taskId: BigInt(id) }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(subtasks.map((s) => ({
    id: Number(s.id), task_id: Number(s.taskId), name: s.name,
    due_date: s.dueDate?.toISOString().slice(0, 10) ?? null,
    is_completed: s.isCompleted, user_id: Number(s.userId),
    created_at: s.createdAt.toISOString(),
  })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const sub = await prisma.taskSubtask.create({
    data: {
      taskId: BigInt(id),
      name: String(body.name).trim(),
      dueDate: body.due_date ? new Date(body.due_date) : null,
      isCompleted: false,
      userId: actor.id,
    },
  });
  return NextResponse.json({ ok: true, id: Number(sub.id), name: sub.name, is_completed: sub.isCompleted });
}

export async function PATCH(req: NextRequest) {
  if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const updated = await prisma.taskSubtask.update({
    where: { id: BigInt(body.id) },
    data: {
      ...(body.name !== undefined && { name: String(body.name).trim() }),
      ...(body.is_completed !== undefined && { isCompleted: Boolean(body.is_completed) }),
      ...(body.due_date !== undefined && { dueDate: body.due_date ? new Date(body.due_date) : null }),
    },
  });
  return NextResponse.json({ ok: true, id: Number(updated.id), is_completed: updated.isCompleted });
}

export async function DELETE(req: NextRequest) {
  if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const subtaskId = url.searchParams.get("subtask_id");
  if (!subtaskId) return NextResponse.json({ error: "subtask_id required" }, { status: 400 });
  await prisma.taskSubtask.delete({ where: { id: BigInt(subtaskId) } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
