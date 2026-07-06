import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProjectOpsContext, logProjectActivity } from "@/lib/project-operations-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const rows = await prisma.projectPosition.findMany({
    where: { projectId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return NextResponse.json({
    data: rows.map((r) => ({ id: Number(r.id), name: r.name, sort_order: r.sortOrder })),
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
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const maxOrder = await prisma.projectPosition.aggregate({
    where: { projectId },
    _max: { sortOrder: true },
  });

  const row = await prisma.projectPosition.create({
    data: { projectId, name, sortOrder: (maxOrder._max.sortOrder ?? -1) + 1 },
  });
  await logProjectActivity(projectId, auth.actor.id, auth.actor.type ?? "user", "position_add", `Added position ${name}`);
  return NextResponse.json({ data: { id: Number(row.id), name: row.name, sort_order: row.sortOrder } });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const posId = req.nextUrl.searchParams.get("id");
  if (!posId) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.projectPosition.deleteMany({ where: { id: BigInt(posId), projectId } });
  return NextResponse.json({ ok: true });
}
