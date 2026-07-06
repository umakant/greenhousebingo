import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, notFound, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-attendances", "edit-attendances")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params; const body = await req.json().catch(() => null);
  try {
    const existing = await prisma.hrmAttendance.findFirst({ where: { id: BigInt(id), employee: { createdBy: getCompanyId(actor) } } }); if (!existing) return notFound();
    const updated = await prisma.hrmAttendance.update({ where: { id: BigInt(id) }, data: { ...(body?.clock_in !== undefined && { clockIn: body.clock_in }), ...(body?.clock_out !== undefined && { clockOut: body.clock_out }), ...(body?.work_hours !== undefined && { workHours: body.work_hours }), ...(body?.status !== undefined && { status: body.status }), ...(body?.note !== undefined && { note: body.note }), updatedAt: new Date() } });
    return jsonR({ data: { ...updated, id: updated.id.toString(), employeeId: updated.employeeId.toString() } });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-attendances", "delete-attendances")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.hrmAttendance.findFirst({ where: { id: BigInt(id), employee: { createdBy: getCompanyId(actor) } } }); if (!existing) return notFound();
    await prisma.hrmAttendance.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ ok: true });
  } catch { return serverError(); }
}
