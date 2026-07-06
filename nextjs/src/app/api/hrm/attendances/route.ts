import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

function timeToMinutes(t: string | null | undefined): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function ser(r: any) {
  const shift = r.employee?.shift ?? null;
  const breakMins = shift?.breakMinutes ?? 0;
  const breakHours = breakMins / 60;

  const wh = r.workHours ? Number(r.workHours) : 0;
  const shiftDuration = shift
    ? (timeToMinutes(shift.endTime) - timeToMinutes(shift.startTime)) / 60
    : 0;
  const regularHours = shiftDuration > 0 ? Math.max(0, shiftDuration - breakHours) : 0;
  const overtime = wh > 0 && regularHours > 0 ? Math.max(0, wh - regularHours) : 0;

  return {
    ...r,
    id: r.id.toString(),
    employeeId: r.employeeId.toString(),
    workHours: wh,
    breakHours,
    overtime: Math.round(overtime * 100) / 100,
    shiftName: shift?.name ?? null,
    employee: r.employee
      ? {
          ...r.employee,
          id: r.employee.id.toString(),
          shift: undefined,
        }
      : null,
  };
}

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-hrm", "manage-attendances")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { searchParams: s } = new URL(req.url);
  const empId = s.get("employee_id");
  const dateFrom = s.get("date_from");
  const dateTo = s.get("date_to");
  const status = s.get("status");
  const search = s.get("search");
  const page = Math.max(1, Number(s.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 10)));
  const skip = (page - 1) * perPage;

  const where: any = { employee: { createdBy: companyId } };
  if (empId) where.employeeId = BigInt(empId);
  if (status && status !== "all") where.status = status;
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) {
      const [y, m, d] = dateFrom.split("-").map(Number);
      if (y && m && d) where.date.gte = new Date(Date.UTC(y, m - 1, d));
    }
    if (dateTo) {
      const [y, m, d] = dateTo.split("-").map(Number);
      if (y && m && d) where.date.lte = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
    }
  }
  if (search) {
    where.employee = {
      ...where.employee,
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  try {
    const [rows, total] = await Promise.all([
      prisma.hrmAttendance.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
              shift: { select: { id: true, name: true, startTime: true, endTime: true, breakMinutes: true } },
            },
          },
        },
        orderBy: { date: "desc" },
        skip,
        take: perPage,
      }),
      prisma.hrmAttendance.count({ where }),
    ]);
    return jsonR({ data: rows.map(ser), total, page, per_page: perPage, last_page: Math.ceil(total / perPage) || 1 });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-attendances", "create-attendances")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const body = await req.json().catch(() => null);
  if (!body?.employee_id || !body?.date)
    return NextResponse.json({ error: "employee_id and date required" }, { status: 400 });
  try {
    const row = await prisma.hrmAttendance.upsert({
      where: { employeeId_date: { employeeId: BigInt(body.employee_id), date: new Date(body.date) } },
      create: {
        employeeId: BigInt(body.employee_id),
        date: new Date(body.date),
        clockIn: body.clock_in ?? null,
        clockOut: body.clock_out ?? null,
        workHours: body.work_hours ?? null,
        status: body.status ?? "present",
        note: body.note ?? null,
        createdBy: getCompanyId(actor),
      },
      update: {
        clockIn: body.clock_in ?? undefined,
        clockOut: body.clock_out ?? undefined,
        workHours: body.work_hours ?? undefined,
        status: body.status ?? undefined,
        note: body.note ?? undefined,
        updatedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            shift: { select: { id: true, name: true, startTime: true, endTime: true, breakMinutes: true } },
          },
        },
      },
    });
    return jsonR({ data: ser(row) }, { status: 201 });
  } catch { return serverError(); }
}
