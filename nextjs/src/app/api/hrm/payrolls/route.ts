import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

function ser(r: any) { return { ...r, id: r.id.toString(), employeeId: r.employeeId.toString(), employee: r.employee ? { ...r.employee, id: r.employee.id.toString() } : null }; }

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-hrm", "manage-payroll")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { searchParams: s } = new URL(req.url);
  const empId = s.get("employee_id"); const month = s.get("month"); const year = s.get("year"); const status = s.get("status");
  const page = Math.max(1, Number(s.get("page") ?? 1)); const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 15))); const skip = (page - 1) * perPage;
  const where: any = { employee: { createdBy: companyId } };
  if (empId) where.employeeId = BigInt(empId); if (month) where.month = Number(month); if (year) where.year = Number(year); if (status) where.status = status;
  try {
    const [rows, total] = await Promise.all([prisma.hrmPayroll.findMany({ where, include: { employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } } }, orderBy: [{ year: "desc" }, { month: "desc" }], skip, take: perPage }), prisma.hrmPayroll.count({ where })]);
    return jsonR({ data: rows.map(ser), total, page, per_page: perPage, last_page: Math.ceil(total / perPage) || 1 });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-payroll", "create-payroll")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const body = await req.json().catch(() => null);
  if (!body?.employee_id || !body?.month || !body?.year) return NextResponse.json({ error: "employee_id, month, year required" }, { status: 400 });
  try {
    const row = await prisma.hrmPayroll.create({
      data: {
        employeeId: BigInt(body.employee_id), month: Number(body.month), year: Number(body.year),
        basicSalary: body.basic_salary ?? 0, allowances: body.allowances ?? 0, deductions: body.deductions ?? 0,
        netSalary: body.net_salary ?? 0, paymentDate: body.payment_date ? new Date(body.payment_date) : null,
        status: body.status ?? "pending", notes: body.notes ?? null, createdBy: getCompanyId(actor),
      }
    });
    return jsonR({ data: ser(row) }, { status: 201 });
  } catch { return serverError(); }
}
