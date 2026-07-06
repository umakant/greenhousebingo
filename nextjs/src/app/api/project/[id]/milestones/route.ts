import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const { id } = await params;
  const milestones = await prisma.projectMilestone.findMany({
    where: { projectId: BigInt(id) },
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json(milestones.map((m) => ({
    id: Number(m.id), project_id: Number(m.projectId),
    title: m.title, cost: m.cost?.toString() ?? null,
    start_date: m.startDate?.toISOString().slice(0, 10) ?? null,
    end_date: m.endDate?.toISOString().slice(0, 10) ?? null,
    summary: m.summary, status: m.status, progress: m.progress,
    created_at: m.createdAt.toISOString(),
  })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const m = await prisma.projectMilestone.create({
    data: {
      projectId: BigInt(id),
      title: String(body.title).trim(),
      cost: body.cost != null ? Number(body.cost) : null,
      startDate: body.start_date ? new Date(body.start_date) : null,
      endDate: body.end_date ? new Date(body.end_date) : null,
      summary: body.summary ? String(body.summary).trim() : null,
      status: body.status ?? "Incomplete",
      progress: body.progress != null ? Number(body.progress) : 0,
    },
  });
  return NextResponse.json({ ok: true, id: Number(m.id) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.milestone_id) return NextResponse.json({ error: "milestone_id required" }, { status: 400 });
  const m = await prisma.projectMilestone.findFirst({ where: { id: BigInt(body.milestone_id), projectId: BigInt(id) } });
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.projectMilestone.update({
    where: { id: BigInt(body.milestone_id) },
    data: {
      ...(body.title !== undefined && { title: String(body.title).trim() }),
      ...(body.cost !== undefined && { cost: body.cost != null ? Number(body.cost) : null }),
      ...(body.start_date !== undefined && { startDate: body.start_date ? new Date(body.start_date) : null }),
      ...(body.end_date !== undefined && { endDate: body.end_date ? new Date(body.end_date) : null }),
      ...(body.summary !== undefined && { summary: body.summary ?? null }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.progress !== undefined && { progress: Number(body.progress) }),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const url = new URL(req.url);
  const milestoneId = url.searchParams.get("milestone_id");
  if (!milestoneId) return NextResponse.json({ error: "milestone_id required" }, { status: 400 });
  await prisma.projectMilestone.deleteMany({ where: { id: BigInt(milestoneId), projectId: BigInt(id) } });
  return NextResponse.json({ ok: true });
}
