import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-hrm", "manage-salary")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { searchParams: s } = new URL(req.url);
  const empId = s.get("employee_id"); const search = s.get("search") ?? "";
  const page = Math.max(1, Number(s.get("page") ?? 1)); const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 15))); const skip = (page - 1) * perPage;
  const where: any = { employee: { createdBy: companyId } };
  if (empId) where.employeeId = BigInt(empId);
  if (search) where.employee = { ...where.employee, OR: [{ firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }] };
  try {
    const [rows, total] = await Promise.all([prisma.hrmSalaryAllocation.findMany({ where, include: { employee: { select: { id: true, firstName: true, lastName: true, employeeId: true, designation: { select: { name: true } } } } }, orderBy: { createdAt: "desc" }, skip, take: perPage }), prisma.hrmSalaryAllocation.count({ where })]);
    return jsonR({ data: rows, total, page, per_page: perPage, last_page: Math.ceil(total / perPage) || 1 });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-salary", "create-salary")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const body = await req.json().catch(() => null);
  if (!body?.employee_id) return NextResponse.json({ error: "employee_id required" }, { status: 400 });
  try {
    const allowances = body.allowances != null ? (typeof body.allowances === "object" ? body.allowances : { amount: Number(body.allowances) }) : null;
    const deductions = body.deductions != null ? (typeof body.deductions === "object" ? body.deductions : { amount: Number(body.deductions) }) : null;
    const row = await prisma.hrmSalaryAllocation.upsert({
      where: { employeeId: BigInt(body.employee_id) },
      create: { employeeId: BigInt(body.employee_id), basicSalary: body.basic_salary ?? 0, allowances, deductions, netSalary: body.net_salary ?? 0, effectiveDate: body.effective_date ? new Date(body.effective_date) : new Date(), createdBy: getCompanyId(actor) },
      update: { basicSalary: body.basic_salary ?? undefined, allowances: allowances ?? undefined, deductions: deductions ?? undefined, netSalary: body.net_salary ?? undefined, effectiveDate: body.effective_date ? new Date(body.effective_date) : undefined, updatedAt: new Date() },
    });
    return jsonR({ data: row }, { status: 201 });
  } catch { return serverError(); }
}
