import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, notFound, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-leave-applications", "edit-leave-applications")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params; const body = await req.json().catch(() => null);
  try {
    const existing = await prisma.hrmLeaveApplication.findFirst({ where: { id: BigInt(id), employee: { createdBy: getCompanyId(actor) } } }); if (!existing) return notFound();
    const data: any = { updatedAt: new Date() };
    if (body?.status) { data.status = body.status; if (body.status === "approved") { data.approvedById = getCompanyId(actor); data.approvedAt = new Date(); } }
    if (body?.reason !== undefined) data.reason = body.reason;
    const updated = await prisma.hrmLeaveApplication.update({ where: { id: BigInt(id) }, data });
    const totalDays =
      updated.totalDays != null && typeof (updated.totalDays as { toNumber?: () => number }).toNumber === "function"
        ? (updated.totalDays as { toNumber: () => number }).toNumber()
        : Number(updated.totalDays);
    return jsonR({
      data: {
        id: updated.id.toString(),
        employeeId: updated.employeeId.toString(),
        leaveTypeId: updated.leaveTypeId.toString(),
        startDate:
          updated.startDate instanceof Date ? updated.startDate.toISOString().slice(0, 10) : String(updated.startDate ?? ""),
        endDate: updated.endDate instanceof Date ? updated.endDate.toISOString().slice(0, 10) : String(updated.endDate ?? ""),
        totalDays: Number.isFinite(totalDays) ? totalDays : 0,
        status: updated.status,
        reason: updated.reason ?? null,
      },
    });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-leave-applications", "delete-leave-applications")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.hrmLeaveApplication.findFirst({ where: { id: BigInt(id), employee: { createdBy: getCompanyId(actor) } } }); if (!existing) return notFound();
    await prisma.hrmLeaveApplication.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ ok: true });
  } catch { return serverError(); }
}
