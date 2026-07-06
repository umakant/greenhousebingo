import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, notFound, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-salary", "edit-salary")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params; const body = await req.json().catch(() => null);
  try {
    const existing = await prisma.hrmSalaryAllocation.findFirst({ where: { id: BigInt(id), employee: { createdBy: getCompanyId(actor) } } }); if (!existing) return notFound();
    const allowances = body?.allowances != null ? (typeof body.allowances === "object" ? body.allowances : { amount: Number(body.allowances) }) : undefined;
    const deductions = body?.deductions != null ? (typeof body.deductions === "object" ? body.deductions : { amount: Number(body.deductions) }) : undefined;
    const updated = await prisma.hrmSalaryAllocation.update({ where: { id: BigInt(id) }, data: { ...(body?.basic_salary !== undefined && { basicSalary: body.basic_salary }), ...(allowances !== undefined && { allowances }), ...(deductions !== undefined && { deductions }), ...(body?.net_salary !== undefined && { netSalary: body.net_salary }), ...(body?.effective_date !== undefined && { effectiveDate: body.effective_date ? new Date(body.effective_date) : null }), updatedAt: new Date() } });
    return jsonR({ data: updated });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-salary", "delete-salary")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const { id } = await params;
  try {
    const existing = await prisma.hrmSalaryAllocation.findFirst({ where: { id: BigInt(id), employee: { createdBy: getCompanyId(actor) } } }); if (!existing) return notFound();
    await prisma.hrmSalaryAllocation.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ ok: true });
  } catch { return serverError(); }
}
