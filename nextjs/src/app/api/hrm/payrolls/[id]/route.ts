import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, notFound, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-payroll", "edit-payroll")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params; const body = await req.json().catch(() => null);
  try {
    const existing = await prisma.hrmPayroll.findFirst({ where: { id: BigInt(id), employee: { createdBy: getCompanyId(actor) } } }); if (!existing) return notFound();
    const updated = await prisma.hrmPayroll.update({ where: { id: BigInt(id) }, data: { ...(body?.basic_salary !== undefined && { basicSalary: body.basic_salary }), ...(body?.allowances !== undefined && { allowances: body.allowances }), ...(body?.deductions !== undefined && { deductions: body.deductions }), ...(body?.net_salary !== undefined && { netSalary: body.net_salary }), ...(body?.payment_date !== undefined && { paymentDate: body.payment_date ? new Date(body.payment_date) : null }), ...(body?.status !== undefined && { status: body.status }), ...(body?.notes !== undefined && { notes: body.notes }), updatedAt: new Date() } });
    return jsonR({ data: { ...updated, id: updated.id.toString(), employeeId: updated.employeeId.toString() } });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-payroll", "delete-payroll")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.hrmPayroll.findFirst({ where: { id: BigInt(id), employee: { createdBy: getCompanyId(actor) } } }); if (!existing) return notFound();
    await prisma.hrmPayroll.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ ok: true });
  } catch { return serverError(); }
}
