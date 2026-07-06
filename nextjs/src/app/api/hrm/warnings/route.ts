import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

function ser(r: any) { return { ...r, id: r.id.toString(), employeeId: r.employeeId.toString(), employee: r.employee ? { ...r.employee, id: r.employee.id.toString() } : null }; }

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-hrm", "manage-warnings")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { searchParams: s } = new URL(req.url);
  const search = s.get("search") ?? ""; const page = Math.max(1, Number(s.get("page") ?? 1)); const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 15))); const skip = (page - 1) * perPage;
  const where: any = { employee: { createdBy: companyId } }; if (search) where.subject = { contains: search, mode: "insensitive" };
  try {
    const [rows, total] = await Promise.all([prisma.hrmWarning.findMany({ where, include: { employee: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { warningDate: "desc" }, skip, take: perPage }), prisma.hrmWarning.count({ where })]);
    return jsonR({ data: rows.map(ser), total, page, per_page: perPage, last_page: Math.ceil(total / perPage) || 1 });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-warnings", "create-warnings")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const body = await req.json().catch(() => null);
  if (!body?.employee_id || !body?.subject || !body?.warning_date) return NextResponse.json({ error: "employee_id, subject, warning_date required" }, { status: 400 });
  try {
    const row = await prisma.hrmWarning.create({ data: { employeeId: BigInt(body.employee_id), subject: body.subject, warningDate: new Date(body.warning_date), description: body.description ?? null, createdBy: getCompanyId(actor) } });
    return jsonR({ data: ser(row) }, { status: 201 });
  } catch { return serverError(); }
}
