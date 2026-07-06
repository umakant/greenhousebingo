import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-hrm", "manage-transfers")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { searchParams: s } = new URL(req.url);
  const page = Math.max(1, Number(s.get("page") ?? 1)); const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 15))); const skip = (page - 1) * perPage;
  try {
    const [rows, total] = await Promise.all([
      prisma.hrmTransfer.findMany({
        where: { employee: { createdBy: companyId } },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true } },
          fromDepartment: { select: { id: true, name: true } },
          toDepartment: { select: { id: true, name: true } },
          fromBranch: { select: { id: true, name: true } },
          toBranch: { select: { id: true, name: true } },
        },
        orderBy: { transferDate: "desc" }, skip, take: perPage
      }),
      prisma.hrmTransfer.count({ where: { employee: { createdBy: companyId } } }),
    ]);
    return jsonR({ data: rows, total, page, per_page: perPage, last_page: Math.ceil(total / perPage) || 1 });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-transfers", "create-transfers")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const body = await req.json().catch(() => null);
  if (!body?.employee_id || !body?.transfer_date) return NextResponse.json({ error: "employee_id and transfer_date required" }, { status: 400 });
  try {
    const row = await prisma.hrmTransfer.create({
      data: {
        employeeId: BigInt(body.employee_id),
        fromDepartmentId: body.from_department_id ? BigInt(body.from_department_id) : null,
        toDepartmentId: body.to_department_id ? BigInt(body.to_department_id) : null,
        fromBranchId: body.from_branch_id ? BigInt(body.from_branch_id) : null,
        toBranchId: body.to_branch_id ? BigInt(body.to_branch_id) : null,
        transferDate: new Date(body.transfer_date),
        description: body.description ?? null,
        createdBy: getCompanyId(actor),
      }
    });
    return jsonR({ data: row }, { status: 201 });
  } catch { return serverError(); }
}
