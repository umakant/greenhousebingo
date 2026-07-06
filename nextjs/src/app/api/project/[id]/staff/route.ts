import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncGanttStaffAssignmentsForProject } from "@/lib/gantt-project-staff-sync";
import { getProjectOpsContext, logProjectActivity } from "@/lib/project-operations-api";

export const dynamic = "force-dynamic";

const ROLES = new Set(["agent", "medic", "security"]);

function serializeAssignment(
  row: {
    id: bigint;
    userId: bigint;
    role: string;
    workDate: Date | null;
    endDate: Date | null;
    startTime: string | null;
    endTime: string | null;
    position: string | null;
    status: string;
    onSite: boolean;
    sortOrder: number;
  },
  user: { id: bigint; name: string | null; email: string | null } | null | undefined,
) {
  const name = user?.name ?? user?.email ?? "Unknown";
  return {
    id: Number(row.id),
    user_id: Number(row.userId),
    name,
    email: user?.email ?? "",
    role: row.role,
    work_date: row.workDate?.toISOString().slice(0, 10) ?? null,
    end_date: row.endDate?.toISOString().slice(0, 10) ?? null,
    start_time: row.startTime,
    end_time: row.endTime,
    position: row.position,
    status: row.status,
    on_site: row.onSite,
    sort_order: row.sortOrder,
  };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await syncGanttStaffAssignmentsForProject(projectId).catch(() => {});

  const role = req.nextUrl.searchParams.get("role");
  const where: { projectId: bigint; role?: string } = { projectId };
  if (role && ROLES.has(role)) where.role = role;

  const rows = await prisma.projectStaffAssignment.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const userIds = rows.map((r) => r.userId);
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json({
    data: rows.map((r) => serializeAssignment(r, userMap.get(r.userId))),
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const role = typeof body?.role === "string" ? body.role : "";
  if (!ROLES.has(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  let userId = body?.user_id != null ? Number(body.user_id) : NaN;

  if (!Number.isFinite(userId) || userId <= 0) {
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const firstName = typeof body?.first_name === "string" ? body.first_name.trim() : "";
    const lastName = typeof body?.last_name === "string" ? body.last_name.trim() : "";
    const nameFromParts = [firstName, lastName].filter(Boolean).join(" ").trim();
    const name = typeof body?.name === "string" ? body.name.trim() : nameFromParts;
    if (!email || !name) {
      return NextResponse.json(
        { error: "user_id or name+email (or first_name+last_name+email) required" },
        { status: 400 },
      );
    }
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      userId = Number(existing.id);
    } else {
      const maxId = await prisma.user.aggregate({ _max: { id: true } });
      const newId = (maxId._max.id ?? BigInt(0)) + BigInt(1);
      const created = await prisma.user.create({
        data: {
          id: newId,
          name,
          email,
          type: "staff",
          createdBy: auth.companyId,
          operationsRole: role,
          isActive: true,
        },
      });
      userId = Number(created.id);
    }
  }

  const workDate = body?.work_date ? new Date(String(body.work_date)) : null;
  const endDate = body?.end_date ? new Date(String(body.end_date)) : workDate;
  const maxOrder = await prisma.projectStaffAssignment.aggregate({
    where: { projectId, role },
    _max: { sortOrder: true },
  });

  const row = await prisma.projectStaffAssignment.create({
    data: {
      projectId,
      userId: BigInt(userId),
      role,
      workDate: workDate && !Number.isNaN(workDate.getTime()) ? workDate : null,
      endDate: endDate && !Number.isNaN(endDate.getTime()) ? endDate : null,
      startTime: typeof body?.start_time === "string" ? body.start_time : null,
      endTime: typeof body?.end_time === "string" ? body.end_time : null,
      position: typeof body?.position === "string" ? body.position : null,
      status: typeof body?.status === "string" ? body.status : "confirmed",
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  const user = await prisma.user.findFirst({
    where: { id: BigInt(userId) },
    select: { id: true, name: true, email: true },
  });
  const label = role === "medic" ? "medic" : role === "security" ? "security agent" : "agent";
  await logProjectActivity(
    projectId,
    auth.actor.id,
    auth.actor.type ?? "user",
    "staff_assign",
    `Added ${label} ${user?.name ?? user?.email ?? ""} to project`,
  );

  return NextResponse.json({ data: serializeAssignment(row, user) });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const assignmentId = body?.id != null ? Number(body.id) : NaN;
  if (!Number.isFinite(assignmentId)) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await prisma.projectStaffAssignment.findFirst({
    where: { id: BigInt(assignmentId), projectId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body?.status === "string") data.status = body.status;
  if (typeof body?.on_site === "boolean") data.onSite = body.on_site;
  if (typeof body?.position === "string") data.position = body.position;
  if (typeof body?.start_time === "string") data.startTime = body.start_time;
  if (typeof body?.end_time === "string") data.endTime = body.end_time;
  if (body?.work_date) {
    const d = new Date(String(body.work_date));
    if (!Number.isNaN(d.getTime())) data.workDate = d;
  }
  if (body?.end_date) {
    const d = new Date(String(body.end_date));
    if (!Number.isNaN(d.getTime())) data.endDate = d;
  }

  const updated = await prisma.projectStaffAssignment.update({
    where: { id: BigInt(assignmentId) },
    data,
  });
  const user = await prisma.user.findFirst({
    where: { id: updated.userId },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ data: serializeAssignment(updated, user) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const assignmentId = req.nextUrl.searchParams.get("assignment_id");
  if (!assignmentId) return NextResponse.json({ error: "assignment_id required" }, { status: 400 });

  const existing = await prisma.projectStaffAssignment.findFirst({
    where: { id: BigInt(assignmentId), projectId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.projectStaffAssignment.delete({ where: { id: BigInt(assignmentId) } });
  return NextResponse.json({ ok: true });
}
