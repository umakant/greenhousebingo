import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-hrm", "manage-attendances")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);

  const { searchParams: s } = new URL(req.url);
  const now = new Date();
  const month = Math.min(12, Math.max(1, Number(s.get("month") ?? now.getMonth() + 1)));
  const year = Number(s.get("year") ?? now.getFullYear());
  const empId = s.get("employee_id");
  const deptId = s.get("department_id");
  const desigId = s.get("designation_id");

  const daysInMonth = new Date(year, month, 0).getDate();
  /** Align with PostgreSQL `DATE` (stored calendar day as UTC midnight in Prisma). */
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));

  const empWhere: any = { createdBy: companyId, status: "active" };
  if (empId) empWhere.id = BigInt(empId);
  if (deptId) empWhere.departmentId = BigInt(deptId);
  if (desigId) empWhere.designationId = BigInt(desigId);

  const employees = await prisma.hrmEmployee.findMany({
    where: empWhere,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeId: true,
      profilePhoto: true,
      department: { select: { id: true, name: true } },
      designation: { select: { id: true, name: true } },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 200,
  });

  const empIds = employees.map(e => e.id);

  const records = empIds.length > 0
    ? await prisma.hrmAttendance.findMany({
        where: {
          employeeId: { in: empIds },
          date: { gte: monthStart, lte: monthEnd },
        },
        select: { employeeId: true, date: true, status: true, clockIn: true, clockOut: true },
      })
    : [];

  const byEmp: Record<string, Record<number, { status: string; clockIn: string | null; clockOut: string | null }>> = {};
  for (const r of records) {
    const eid = r.employeeId.toString();
    const day = new Date(r.date).getUTCDate();
    if (!byEmp[eid]) byEmp[eid] = {};
    byEmp[eid][day] = { status: r.status, clockIn: r.clockIn ?? null, clockOut: r.clockOut ?? null };
  }

  const result = employees.map(e => {
    const eid = e.id.toString();
    const dayMap = byEmp[eid] ?? {};
    const presentStatuses = ["present", "late", "half_day", "on_leave"];
    const totalPresent = Object.values(dayMap).filter(d => presentStatuses.includes(d.status)).length;
    return {
      id: eid,
      name: `${e.firstName} ${e.lastName ?? ""}`.trim(),
      employeeId: e.employeeId,
      profilePhoto: e.profilePhoto,
      department: e.department ? { id: e.department.id.toString(), name: e.department.name } : null,
      designation: e.designation ? { id: e.designation.id.toString(), name: e.designation.name } : null,
      attendance: dayMap,
      totalPresent,
      totalDays: daysInMonth,
    };
  });

  return jsonR({ month, year, daysInMonth, employees: result });
}
