import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProjectOpsContext, logProjectActivity } from "@/lib/project-operations-api";

export const dynamic = "force-dynamic";

function serialize(
  row: {
    id: bigint;
    title: string;
    description: string | null;
    severity: string | null;
    status: string;
    location: string | null;
    reportedBy: bigint | null;
    reportedAt: Date | null;
    createdAt: Date;
  },
  reporterName?: string,
) {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    severity: row.severity,
    status: row.status,
    location: row.location,
    reported_by: row.reportedBy != null ? Number(row.reportedBy) : null,
    reporter_name: reporterName ?? null,
    reported_at: row.reportedAt?.toISOString() ?? row.createdAt.toISOString(),
    created_at: row.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const rows = await prisma.projectIncidentReport.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  const userIds = rows.map((r) => r.reportedBy).filter((u): u is bigint => u != null);
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json({
    data: rows.map((r) => {
      const u = r.reportedBy ? userMap.get(r.reportedBy) : undefined;
      return serialize(r, u?.name ?? u?.email ?? undefined);
    }),
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const row = await prisma.projectIncidentReport.create({
    data: {
      projectId,
      title,
      description: typeof body?.description === "string" ? body.description : null,
      severity: typeof body?.severity === "string" ? body.severity : "low",
      status: typeof body?.status === "string" ? body.status : "open",
      location: typeof body?.location === "string" ? body.location : null,
      reportedBy: auth.actor.id,
      reportedAt: new Date(),
    },
  });

  await logProjectActivity(projectId, auth.actor.id, auth.actor.type ?? "user", "incident_report", `Filed incident report: ${title}`);
  return NextResponse.json({ data: serialize(row, auth.actor.name ?? auth.actor.email ?? undefined) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const reportId = req.nextUrl.searchParams.get("id");
  if (!reportId) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.projectIncidentReport.deleteMany({ where: { id: BigInt(reportId), projectId } });
  return NextResponse.json({ ok: true });
}
