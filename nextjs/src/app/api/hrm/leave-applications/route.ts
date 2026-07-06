import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

function toNumberDays(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && v !== null && "toNumber" in v && typeof (v as { toNumber: () => number }).toNumber === "function") {
    return (v as { toNumber: () => number }).toNumber();
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtYmd(d: unknown): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  if (typeof d === "string") return d.slice(0, 10);
  return "";
}

function ser(r: {
  id: bigint;
  employeeId: bigint;
  leaveTypeId: bigint;
  startDate: Date;
  endDate: Date;
  totalDays: unknown;
  status: string;
  reason?: string | null;
  employee: { id: bigint; firstName: string; lastName?: string | null } | null;
  leaveType: { id: bigint; name: string } | null;
}) {
  return {
    id: r.id.toString(),
    employeeId: r.employeeId.toString(),
    leaveTypeId: r.leaveTypeId.toString(),
    startDate: fmtYmd(r.startDate),
    endDate: fmtYmd(r.endDate),
    totalDays: toNumberDays(r.totalDays),
    status: r.status,
    reason: r.reason ?? null,
    employee: r.employee
      ? { id: r.employee.id.toString(), firstName: r.employee.firstName, lastName: r.employee.lastName ?? null }
      : null,
    leaveType: r.leaveType ? { id: r.leaveType.id.toString(), name: r.leaveType.name } : null,
  };
}

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-hrm", "manage-leave-applications")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { searchParams: s } = new URL(req.url);
  const status = s.get("status"); const empId = s.get("employee_id");
  const searchRaw = s.get("search")?.trim() ?? "";
  const page = Math.max(1, Number(s.get("page") ?? 1)); const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 15))); const skip = (page - 1) * perPage;
  const where: Prisma.HrmLeaveApplicationWhereInput = { employee: { createdBy: companyId } };
  if (status) where.status = status;
  if (empId) where.employeeId = BigInt(empId);
  if (searchRaw) {
    where.AND = [
      {
        OR: [
          { employee: { firstName: { contains: searchRaw, mode: "insensitive" } } },
          { employee: { lastName: { contains: searchRaw, mode: "insensitive" } } },
          { leaveType: { name: { contains: searchRaw, mode: "insensitive" } } },
          { reason: { contains: searchRaw, mode: "insensitive" } },
        ],
      },
    ];
  }
  try {
    const [rows, total] = await Promise.all([prisma.hrmLeaveApplication.findMany({ where, include: { employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } }, leaveType: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" }, skip, take: perPage }), prisma.hrmLeaveApplication.count({ where })]);
    return jsonR({ data: rows.map(ser), total, page, per_page: perPage, last_page: Math.ceil(total / perPage) || 1 });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-leave-applications", "create-leave-applications")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const body = await req.json().catch(() => null);
  if (!body?.employee_id || !body?.leave_type_id || !body?.start_date || !body?.end_date) return NextResponse.json({ error: "employee_id, leave_type_id, start_date, end_date required" }, { status: 400 });
  const start = new Date(body.start_date); const end = new Date(body.end_date);
  const diffDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
  try {
    const row = await prisma.hrmLeaveApplication.create({ data: { employeeId: BigInt(body.employee_id), leaveTypeId: BigInt(body.leave_type_id), startDate: start, endDate: end, totalDays: body.total_days ?? diffDays, reason: body.reason ?? null, status: body.status ?? "pending", createdBy: getCompanyId(actor) }, include: { employee: { select: { id: true, firstName: true, lastName: true } }, leaveType: { select: { id: true, name: true } } } });
    return jsonR({ data: ser(row) }, { status: 201 });
  } catch { return serverError(); }
}
