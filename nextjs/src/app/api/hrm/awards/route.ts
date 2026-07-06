import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

function ser(r: any) { return { ...r, id: r.id.toString(), employeeId: r.employeeId.toString(), awardTypeId: r.awardTypeId.toString(), employee: r.employee ? { ...r.employee, id: r.employee.id.toString() } : null, awardType: r.awardType ? { ...r.awardType, id: r.awardType.id.toString() } : null }; }

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-hrm", "manage-awards")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { searchParams: s } = new URL(req.url);
  const search = (s.get("search") ?? "").trim();
  const page = Math.max(1, Number(s.get("page") ?? 1)); const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 15))); const skip = (page - 1) * perPage;
  const where: any = { employee: { createdBy: companyId } };
  if (search) {
    where.OR = [
      { awardName: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { gift: { contains: search, mode: "insensitive" } },
      { employee: { firstName: { contains: search, mode: "insensitive" } } },
      { employee: { lastName: { contains: search, mode: "insensitive" } } },
      { awardType: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  try {
    const [rows, total] = await Promise.all([prisma.hrmAward.findMany({ where, include: { employee: { select: { id: true, firstName: true, lastName: true } }, awardType: { select: { id: true, name: true } } }, orderBy: { date: "desc" }, skip, take: perPage }), prisma.hrmAward.count({ where })]);
    return jsonR({ data: rows.map(ser), total, page, per_page: perPage, last_page: Math.ceil(total / perPage) || 1 });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-awards", "create-awards")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const body = await req.json().catch(() => null);
  if (!body?.employee_id || !body?.award_type_id || !body?.award_name || !body?.date) return NextResponse.json({ error: "employee_id, award_type_id, award_name, date required" }, { status: 400 });
  try {
    const row = await prisma.hrmAward.create({ data: { employeeId: BigInt(body.employee_id), awardTypeId: BigInt(body.award_type_id), awardName: body.award_name, date: new Date(body.date), gift: body.gift ?? null, cashPrice: body.cash_price ?? null, description: body.description ?? null, createdBy: getCompanyId(actor) } });
    return jsonR({ data: ser(row) }, { status: 201 });
  } catch { return serverError(); }
}
