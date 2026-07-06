import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, notFound, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-hrm", "manage-branches")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params;
  try {
    const row = await prisma.hrmBranch.findFirst({ where: { id: BigInt(id), createdBy: getCompanyId(actor) } });
    if (!row) return notFound();
    return jsonR({ data: { ...row, id: row.id.toString() } });
  } catch { return serverError(); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-branches", "edit-branches")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params;
  const body = await req.json().catch(() => null);
  try {
    const existing = await prisma.hrmBranch.findFirst({ where: { id: BigInt(id), createdBy: getCompanyId(actor) } });
    if (!existing) return notFound();
    const updated = await prisma.hrmBranch.update({ where: { id: BigInt(id) }, data: { ...(body?.name && { name: body.name }), ...(body?.description !== undefined && { description: body.description }), ...(body?.phone !== undefined && { phone: body.phone }), ...(body?.email !== undefined && { email: body.email }), ...(body?.address !== undefined && { address: body.address }), ...(body?.city !== undefined && { city: body.city }), ...(body?.country !== undefined && { country: body.country }), ...(body?.is_active !== undefined && { isActive: body.is_active }), updatedAt: new Date() } });
    return jsonR({ data: { ...updated, id: updated.id.toString() } });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-branches", "delete-branches")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.hrmBranch.findFirst({ where: { id: BigInt(id), createdBy: getCompanyId(actor) } });
    if (!existing) return notFound();
    await prisma.hrmBranch.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ ok: true });
  } catch { return serverError(); }
}
