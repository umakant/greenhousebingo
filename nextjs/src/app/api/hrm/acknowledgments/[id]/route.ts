import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, notFound, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

function ser(r: {
  id: bigint;
  employeeId: bigint;
  policyTitle: string;
  acknowledgedAt: Date;
  notes: string | null;
  employee?: { id: bigint; firstName: string; lastName: string | null } | null;
}) {
  return {
    ...r,
    id: r.id.toString(),
    employeeId: r.employeeId.toString(),
    employee: r.employee
      ? { ...r.employee, id: r.employee.id.toString() }
      : null,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-hrm", "manage-acknowledgments")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { id } = await params;
  const body = await req.json().catch(() => null);
  try {
    const existing = await prisma.hrmAcknowledgment.findFirst({
      where: { id: BigInt(id), employee: { createdBy: companyId } },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!existing) return notFound();
    const updated = await prisma.hrmAcknowledgment.update({
      where: { id: BigInt(id) },
      data: {
        ...(body?.policy_title && { policyTitle: body.policy_title }),
        ...(body?.acknowledged_at && { acknowledgedAt: new Date(body.acknowledged_at) }),
        ...(body?.notes !== undefined && { notes: body.notes }),
        updatedAt: new Date(),
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });
    return jsonR({ data: ser(updated) });
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-hrm", "manage-acknowledgments")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { id } = await params;
  try {
    const existing = await prisma.hrmAcknowledgment.findFirst({
      where: { id: BigInt(id), employee: { createdBy: companyId } },
    });
    if (!existing) return notFound();
    await prisma.hrmAcknowledgment.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return serverError();
  }
}
