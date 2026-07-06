import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, notFound, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-complaints", "edit-complaints")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params; const body = await req.json().catch(() => null);
  try {
    const existing = await prisma.hrmComplaint.findFirst({ where: { id: BigInt(id), complainant: { createdBy: getCompanyId(actor) } } }); if (!existing) return notFound();
    const updated = await prisma.hrmComplaint.update({ where: { id: BigInt(id) }, data: { ...(body?.subject && { subject: body.subject }), ...(body?.description !== undefined && { description: body.description }), ...(body?.date && { date: new Date(body.date) }), ...(body?.status !== undefined && { status: body.status }), updatedAt: new Date() } });
    return jsonR({ data: { ...updated, id: updated.id.toString(), complainantId: updated.complainantId.toString(), againstId: updated.againstId.toString() } });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-complaints", "delete-complaints")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.hrmComplaint.findFirst({ where: { id: BigInt(id), complainant: { createdBy: getCompanyId(actor) } } }); if (!existing) return notFound();
    await prisma.hrmComplaint.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ ok: true });
  } catch { return serverError(); }
}
