import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-hrm", "manage-leave-balance", "manage-leave-applications")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { searchParams: s } = new URL(req.url);
  const year = Number(s.get("year") ?? new Date().getFullYear());
  const empId = s.get("employee_id");
  const page = Math.max(1, Number(s.get("page") ?? 1)); const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 15))); const skip = (page - 1) * perPage;
  try {
    const empWhere: any = { createdBy: companyId, status: "active" };
    if (empId) empWhere.id = BigInt(empId);
    const [employees, leaveTypes] = await Promise.all([
      prisma.hrmEmployee.findMany({ where: empWhere, select: { id: true, firstName: true, lastName: true, employeeId: true }, skip, take: perPage }),
      prisma.hrmLeaveType.findMany({ where: { createdBy: companyId, isActive: true } }),
    ]);
    const total = await prisma.hrmEmployee.count({ where: empWhere });
    const startOfYear = new Date(`${year}-01-01`); const endOfYear = new Date(`${year}-12-31`);
    const usageRows = await prisma.hrmLeaveApplication.findMany({ where: { employee: { createdBy: companyId }, status: "approved", startDate: { gte: startOfYear }, endDate: { lte: endOfYear } }, select: { employeeId: true, leaveTypeId: true, totalDays: true } });
    const usageMap: Record<string, Record<string, number>> = {};
    for (const u of usageRows) { const ek = u.employeeId.toString(); const lk = u.leaveTypeId.toString(); if (!usageMap[ek]) usageMap[ek] = {}; usageMap[ek][lk] = (usageMap[ek][lk] ?? 0) + Number(u.totalDays); }
    const data = employees.map(emp => ({ ...emp, id: emp.id.toString(), balances: leaveTypes.map(lt => ({ leaveTypeId: lt.id.toString(), leaveTypeName: lt.name, allowed: lt.daysAllowed, used: usageMap[emp.id.toString()]?.[lt.id.toString()] ?? 0, remaining: Math.max(0, lt.daysAllowed - (usageMap[emp.id.toString()]?.[lt.id.toString()] ?? 0)) })) }));
    return jsonR({ data, total, page, per_page: perPage, last_page: Math.ceil(total / perPage) || 1, leave_types: leaveTypes.map(l => ({ ...l, id: l.id.toString() })) });
  } catch { return serverError(); }
}
