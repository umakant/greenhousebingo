import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, notFound, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-warnings", "edit-warnings")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params; const body = await req.json().catch(() => null);
  try {
    const existing = await prisma.hrmWarning.findFirst({ where: { id: BigInt(id), employee: { createdBy: getCompanyId(actor) } } }); if (!existing) return notFound();
    const updated = await prisma.hrmWarning.update({ where: { id: BigInt(id) }, data: { ...(body?.subject && { subject: body.subject }), ...(body?.warning_date && { warningDate: new Date(body.warning_date) }), ...(body?.description !== undefined && { description: body.description }), updatedAt: new Date() } });
    return jsonR({ data: { ...updated, id: updated.id.toString(), employeeId: updated.employeeId.toString() } });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-warnings", "delete-warnings")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.hrmWarning.findFirst({ where: { id: BigInt(id), employee: { createdBy: getCompanyId(actor) } } }); if (!existing) return notFound();
    await prisma.hrmWarning.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ ok: true });
  } catch { return serverError(); }
}
