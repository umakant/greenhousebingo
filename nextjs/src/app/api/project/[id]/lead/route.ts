import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProjectOpsContext, logProjectActivity } from "@/lib/project-operations-api";
import { normalizeLeadSectionAccess } from "@/lib/project-lead-sections";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const lead = await prisma.projectLeadAssignment.findUnique({ where: { projectId } });
  const project = await prisma.project.findFirst({
    where: { id: projectId },
    select: { leadSectionAccess: true },
  });
  if (!lead) {
    return NextResponse.json({
      data: null,
      section_access: normalizeLeadSectionAccess(
        project?.leadSectionAccess as Record<string, boolean> | null | undefined,
      ),
    });
  }

  const user = await prisma.user.findFirst({
    where: { id: lead.userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) return NextResponse.json({ data: null });

  return NextResponse.json({
    data: {
      id: Number(user.id),
      name: user.name ?? user.email ?? "",
      email: user.email ?? "",
      section_access: normalizeLeadSectionAccess(
        (project?.leadSectionAccess as Record<string, boolean> | null | undefined) ??
          (lead.sectionAccess as Record<string, boolean> | null | undefined),
      ),
    },
  });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const userId = body?.user_id != null ? Number(body.user_id) : NaN;

  if (body?.user_id == null || body.user_id === "" || userId === 0) {
    await prisma.projectLeadAssignment.deleteMany({ where: { projectId } });
    const project = await prisma.project.findFirst({
      where: { id: projectId },
      select: { leadSectionAccess: true },
    });
    return NextResponse.json({
      data: null,
      section_access: normalizeLeadSectionAccess(
        project?.leadSectionAccess as Record<string, boolean> | null | undefined,
      ),
    });
  }

  if (!Number.isFinite(userId) || userId <= 0) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { id: BigInt(userId) },
    select: { id: true, name: true, email: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const sectionAccess =
    body?.section_access != null && typeof body.section_access === "object"
      ? normalizeLeadSectionAccess(body.section_access as Record<string, boolean>)
      : normalizeLeadSectionAccess(
          (
            await prisma.project.findFirst({
              where: { id: projectId },
              select: { leadSectionAccess: true },
            })
          )?.leadSectionAccess as Record<string, boolean> | null | undefined,
        );

  await prisma.projectLeadAssignment.upsert({
    where: { projectId },
    create: {
      projectId,
      userId: BigInt(userId),
      sectionAccess,
    },
    update: {
      userId: BigInt(userId),
      sectionAccess,
      updatedAt: new Date(),
    },
  });

  const name = user.name ?? user.email ?? "User";
  await logProjectActivity(projectId, auth.actor.id, auth.actor.type ?? "user", "lead_assigned", `Assigned lead agent ${name}`);

  return NextResponse.json({
    data: {
      id: Number(user.id),
      name,
      email: user.email ?? "",
      section_access: sectionAccess,
    },
  });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.projectLeadAssignment.deleteMany({ where: { projectId } });
  return NextResponse.json({ ok: true });
}
