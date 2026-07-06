import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, notFound, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-holidays", "edit-holidays")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params; const body = await req.json().catch(() => null);
  try {
    const existing = await prisma.hrmHoliday.findFirst({ where: { id: BigInt(id), createdBy: getCompanyId(actor) } }); if (!existing) return notFound();
    const updated = await prisma.hrmHoliday.update({ where: { id: BigInt(id) }, data: { ...(body?.name && { name: body.name }), ...(body?.date && { date: new Date(body.date) }), ...(body?.description !== undefined && { description: body.description }), ...(body?.is_active !== undefined && { isActive: body.is_active }), updatedAt: new Date() } });
    return jsonR({ data: { ...updated, id: updated.id.toString() } });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-holidays", "delete-holidays")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.hrmHoliday.findFirst({ where: { id: BigInt(id), createdBy: getCompanyId(actor) } }); if (!existing) return notFound();
    await prisma.hrmHoliday.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ ok: true });
  } catch { return serverError(); }
}
