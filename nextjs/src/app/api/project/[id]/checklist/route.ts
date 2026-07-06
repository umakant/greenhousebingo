import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProjectOpsContext, logProjectActivity } from "@/lib/project-operations-api";

export const dynamic = "force-dynamic";

const PHASES = new Set(["pre_project", "project", "post_project"]);

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const phase = req.nextUrl.searchParams.get("phase");
  const items = await prisma.projectChecklistItem.findMany({
    where: phase && PHASES.has(phase) ? { projectId, phase } : { projectId },
    orderBy: [{ phase: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
  });

  const completedIds = items
    .map((i) => i.completedById)
    .filter((id): id is bigint => id != null);
  const completers =
    completedIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: completedIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const completerMap = new Map(
    completers.map((u) => [u.id, u.name?.trim() || u.email || "Unknown"]),
  );

  return NextResponse.json({
    data: items.map((i) => ({
      id: Number(i.id),
      name: i.name,
      phase: i.phase,
      status: i.status,
      sort_order: i.sortOrder,
      completed_by_id: i.completedById != null ? Number(i.completedById) : null,
      completed_by_name:
        i.completedById != null ? completerMap.get(i.completedById) ?? null : null,
    })),
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phase = typeof body?.phase === "string" ? body.phase : "";
  if (!name || !PHASES.has(phase)) {
    return NextResponse.json({ error: "name and valid phase required" }, { status: 400 });
  }

  const maxOrder = await prisma.projectChecklistItem.aggregate({
    where: { projectId, phase },
    _max: { sortOrder: true },
  });

  const item = await prisma.projectChecklistItem.create({
    data: {
      projectId,
      name,
      phase,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  await logProjectActivity(projectId, auth.actor.id, auth.actor.type ?? "user", "checklist_add", `Added checklist item: ${name}`);

  return NextResponse.json({
    data: {
      id: Number(item.id),
      name: item.name,
      phase: item.phase,
      status: item.status,
      sort_order: item.sortOrder,
    },
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const itemId = body?.id != null ? Number(body.id) : NaN;
  if (!Number.isFinite(itemId)) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await prisma.projectChecklistItem.findFirst({
    where: { id: BigInt(itemId), projectId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const status = body?.status === "completed" || body?.status === "pending" ? body.status : undefined;
  const data: {
    status?: string;
    completedById?: bigint | null;
    name?: string;
    phase?: string;
  } = {};
  if (status) {
    data.status = status;
    data.completedById = status === "completed" ? auth.actor.id : null;
  }
  if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body?.phase === "string" && PHASES.has(body.phase)) data.phase = body.phase;

  const updated = await prisma.projectChecklistItem.update({
    where: { id: BigInt(itemId) },
    data,
  });

  if (status === "completed") {
    await logProjectActivity(
      projectId,
      auth.actor.id,
      auth.actor.type ?? "user",
      "checklist_complete",
      `Completed checklist item: ${updated.name}`,
    );
  }

  let completedByName: string | null = null;
  if (updated.completedById != null) {
    const u = await prisma.user.findFirst({
      where: { id: updated.completedById },
      select: { name: true, email: true },
    });
    completedByName = u?.name?.trim() || u?.email || null;
  }

  return NextResponse.json({
    data: {
      id: Number(updated.id),
      name: updated.name,
      phase: updated.phase,
      status: updated.status,
      sort_order: updated.sortOrder,
      completed_by_id: updated.completedById != null ? Number(updated.completedById) : null,
      completed_by_name: completedByName,
    },
  });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const itemId = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isFinite(itemId)) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await prisma.projectChecklistItem.findFirst({
    where: { id: BigInt(itemId), projectId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.projectChecklistItem.delete({ where: { id: BigInt(itemId) } });
  await logProjectActivity(
    projectId,
    auth.actor.id,
    auth.actor.type ?? "user",
    "checklist_delete",
    `Deleted checklist item: ${existing.name}`,
  );

  return NextResponse.json({ ok: true });
}
