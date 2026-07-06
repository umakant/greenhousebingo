import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

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

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-hrm", "manage-acknowledgments")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { searchParams: s } = new URL(req.url);
  const search = s.get("search") ?? "";
  const page = Math.max(1, Number(s.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 15)));
  const skip = (page - 1) * perPage;
  const where: {
    employee: { createdBy: bigint };
    policyTitle?: { contains: string; mode: "insensitive" };
  } = { employee: { createdBy: companyId } };
  if (search) where.policyTitle = { contains: search, mode: "insensitive" };
  try {
    const [rows, total] = await Promise.all([
      prisma.hrmAcknowledgment.findMany({
        where,
        include: { employee: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { acknowledgedAt: "desc" },
        skip,
        take: perPage,
      }),
      prisma.hrmAcknowledgment.count({ where }),
    ]);
    return jsonR({
      data: rows.map((r) => ser(r)),
      total,
      page,
      per_page: perPage,
      last_page: Math.ceil(total / perPage) || 1,
    });
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-hrm", "manage-acknowledgments")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const body = await req.json().catch(() => null);
  if (!body?.employee_id || !body?.policy_title || !body?.acknowledged_at) {
    return NextResponse.json({ error: "employee_id, policy_title, acknowledged_at required" }, { status: 400 });
  }
  const companyId = getCompanyId(actor);
  try {
    const emp = await prisma.hrmEmployee.findFirst({
      where: { id: BigInt(body.employee_id), createdBy: companyId },
    });
    if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 400 });
    const row = await prisma.hrmAcknowledgment.create({
      data: {
        employeeId: BigInt(body.employee_id),
        policyTitle: body.policy_title,
        acknowledgedAt: new Date(body.acknowledged_at),
        notes: body.notes ?? null,
        createdBy: companyId,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });
    return jsonR({ data: ser(row) }, { status: 201 });
  } catch {
    return serverError();
  }
}
