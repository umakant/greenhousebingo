import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createEmployeePortalUser } from "@/lib/hrm-create-employee-portal-user";

export const dynamic = "force-dynamic";

async function getActor(req: NextRequest) {
  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  if (!email) return null;
  return prisma.user.findFirst({ where: { email }, select: { id: true, type: true, createdBy: true } });
}

function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null }) {
  return a.type === "company" ? a.id : (a.createdBy ?? a.id);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const companyId = getCompanyId(actor);
    const { id } = await params;
    const project = await prisma.project.findFirst({
      where: { id: BigInt(id), createdBy: companyId },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const members = await prisma.projectUser.findMany({ where: { projectId: BigInt(id) } });
    const userIds = members.map((m) => m.userId);
    const users = userIds.length
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true, type: true } })
      : [];
    return NextResponse.json(users.map((u) => ({ id: Number(u.id), name: u.name, email: u.email, type: u.type })));
  } catch (e) {
    console.error("[api/project/.../members] GET", e);
    const message = e instanceof Error ? e.message : "Failed to load members";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const companyId = getCompanyId(actor);
    const { id } = await params;
    const body = await req.json().catch(() => null);
    let uid = body?.user_id != null ? Number(body.user_id) : NaN;
    const employeeId = body?.employee_id != null ? Number(body.employee_id) : NaN;

    const project = await prisma.project.findFirst({
      where: { id: BigInt(id), createdBy: companyId },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    if (!Number.isFinite(uid) || uid <= 0) {
      if (!Number.isFinite(employeeId) || employeeId <= 0) {
        return NextResponse.json({ error: "user_id or employee_id required" }, { status: 400 });
      }
      const employee = await prisma.hrmEmployee.findFirst({
        where: { id: BigInt(employeeId), createdBy: companyId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          userId: true,
        },
      });
      if (!employee) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      if (employee.userId) {
        uid = Number(employee.userId);
      } else {
        const email = employee.email?.trim().toLowerCase() ?? "";
        if (!email) {
          return NextResponse.json(
            { error: "Employee has no email. Add employee email first." },
            { status: 400 },
          );
        }
        const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim() || email;
        const created = await createEmployeePortalUser({
          name: fullName,
          email,
          companyId,
        });
        if (!created.ok) {
          return NextResponse.json({ error: created.error }, { status: 400 });
        }
        await prisma.hrmEmployee.update({
          where: { id: employee.id },
          data: { userId: created.userId },
        });
        uid = Number(created.userId);
      }
    }

    const user = await prisma.user.findFirst({ where: { id: BigInt(uid), createdBy: companyId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await prisma.projectUser.upsert({
      where: { projectId_userId: { projectId: BigInt(id), userId: BigInt(uid) } },
      create: { projectId: BigInt(id), userId: BigInt(uid) },
      update: {},
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/project/.../members] POST", e);
    const message = e instanceof Error ? e.message : "Failed to add member";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const companyId = getCompanyId(actor);
    const { id } = await params;
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");
    if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

    const project = await prisma.project.findFirst({
      where: { id: BigInt(id), createdBy: companyId },
      select: { id: true },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    await prisma.projectUser.deleteMany({ where: { projectId: BigInt(id), userId: BigInt(userId) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/project/.../members] DELETE", e);
    const message = e instanceof Error ? e.message : "Failed to remove member";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
