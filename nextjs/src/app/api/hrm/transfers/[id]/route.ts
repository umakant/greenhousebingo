import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, notFound, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-transfers", "edit-transfers")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params; const body = await req.json().catch(() => null);
  try {
    const existing = await prisma.hrmTransfer.findFirst({ where: { id: BigInt(id), employee: { createdBy: getCompanyId(actor) } } }); if (!existing) return notFound();
    const updated = await prisma.hrmTransfer.update({
      where: { id: BigInt(id) },
      data: {
        ...(body?.from_department_id !== undefined && { fromDepartmentId: body.from_department_id ? BigInt(body.from_department_id) : null }),
        ...(body?.to_department_id !== undefined && { toDepartmentId: body.to_department_id ? BigInt(body.to_department_id) : null }),
        ...(body?.from_branch_id !== undefined && { fromBranchId: body.from_branch_id ? BigInt(body.from_branch_id) : null }),
        ...(body?.to_branch_id !== undefined && { toBranchId: body.to_branch_id ? BigInt(body.to_branch_id) : null }),
        ...(body?.transfer_date && { transferDate: new Date(body.transfer_date) }),
        ...(body?.description !== undefined && { description: body.description }),
        updatedAt: new Date(),
      }
    });
    return jsonR({ data: updated });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-transfers", "delete-transfers")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.hrmTransfer.findFirst({ where: { id: BigInt(id), employee: { createdBy: getCompanyId(actor) } } }); if (!existing) return notFound();
    await prisma.hrmTransfer.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ ok: true });
  } catch { return serverError(); }
}
