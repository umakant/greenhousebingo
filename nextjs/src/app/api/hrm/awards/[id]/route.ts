import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, notFound, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-awards", "edit-awards")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params; const body = await req.json().catch(() => null);
  try {
    const existing = await prisma.hrmAward.findFirst({ where: { id: BigInt(id), employee: { createdBy: getCompanyId(actor) } } }); if (!existing) return notFound();
    const updated = await prisma.hrmAward.update({ where: { id: BigInt(id) }, data: { ...(body?.award_name && { awardName: body.award_name }), ...(body?.award_type_id && { awardTypeId: BigInt(body.award_type_id) }), ...(body?.date && { date: new Date(body.date) }), ...(body?.gift !== undefined && { gift: body.gift }), ...(body?.cash_price !== undefined && { cashPrice: body.cash_price }), ...(body?.description !== undefined && { description: body.description }), updatedAt: new Date() } });
    return jsonR({ data: { ...updated, id: updated.id.toString(), employeeId: updated.employeeId.toString(), awardTypeId: updated.awardTypeId.toString() } });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-awards", "delete-awards")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.hrmAward.findFirst({ where: { id: BigInt(id), employee: { createdBy: getCompanyId(actor) } } }); if (!existing) return notFound();
    await prisma.hrmAward.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ ok: true });
  } catch { return serverError(); }
}
