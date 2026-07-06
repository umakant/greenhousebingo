import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, notFound, serverError } from "@/lib/hrm-auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-offers")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const rec = await prisma.recOffer.findFirst({ where: { id: BigInt(id), createdBy: cid } });
    if (!rec) return notFound();
    const body = await req.json();
    const updated = await prisma.recOffer.update({
      where: { id: BigInt(id) },
      data: {
        position: body.position ?? rec.position,
        salary: body.salary !== undefined ? Number(body.salary) : rec.salary,
        bonus: body.bonus !== undefined ? (body.bonus ? Number(body.bonus) : null) : rec.bonus,
        benefits: body.benefits !== undefined ? body.benefits : rec.benefits,
        startDate: body.start_date ? new Date(body.start_date) : rec.startDate,
        expirationDate: body.expiration_date ? new Date(body.expiration_date) : rec.expirationDate,
        status: body.status ?? rec.status,
        approvalStatus: body.approval_status ?? rec.approvalStatus,
        responseDate: body.response_date ? new Date(body.response_date) : rec.responseDate,
        declineReason: body.decline_reason !== undefined ? body.decline_reason : rec.declineReason,
      },
    });
    return jsonR(updated);
  } catch (e) { console.error(e); return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-offers")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const rec = await prisma.recOffer.findFirst({ where: { id: BigInt(id), createdBy: cid } });
    if (!rec) return notFound();
    await prisma.recOffer.delete({ where: { id: BigInt(id) } });
    return jsonR({ success: true });
  } catch (e) { console.error(e); return serverError(); }
}
