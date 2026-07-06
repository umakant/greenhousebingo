import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, notFound, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-resignations", "edit-resignations")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params; const body = await req.json().catch(() => null);
  try {
    const existing = await prisma.hrmResignation.findFirst({ where: { id: BigInt(id), employee: { createdBy: getCompanyId(actor) } } }); if (!existing) return notFound();
    const updated = await prisma.hrmResignation.update({ where: { id: BigInt(id) }, data: { ...(body?.notice_date !== undefined && { noticeDate: body.notice_date ? new Date(body.notice_date) : null }), ...(body?.resignation_date !== undefined && { resignationDate: body.resignation_date ? new Date(body.resignation_date) : null }), ...(body?.reason !== undefined && { reason: body.reason }), ...(body?.status !== undefined && { status: body.status }), updatedAt: new Date() } });
    return jsonR({ data: { ...updated, id: updated.id.toString(), employeeId: updated.employeeId.toString() } });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-resignations", "delete-resignations")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.hrmResignation.findFirst({ where: { id: BigInt(id), employee: { createdBy: getCompanyId(actor) } } }); if (!existing) return notFound();
    await prisma.hrmResignation.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ ok: true });
  } catch { return serverError(); }
}
