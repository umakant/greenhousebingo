import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

function ser(r: any) { return { ...r, id: r.id.toString(), employeeId: r.employeeId.toString(), fromDesignationId: r.fromDesignationId?.toString() ?? null, toDesignationId: r.toDesignationId?.toString() ?? null, employee: r.employee ? { ...r.employee, id: r.employee.id.toString() } : null, fromDesignation: r.fromDesignation ? { ...r.fromDesignation, id: r.fromDesignation.id.toString() } : null, toDesignation: r.toDesignation ? { ...r.toDesignation, id: r.toDesignation.id.toString() } : null }; }

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-hrm", "manage-promotions")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { searchParams: s } = new URL(req.url);
  const search = (s.get("search") ?? "").trim();
  const page = Math.max(1, Number(s.get("page") ?? 1)); const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 15))); const skip = (page - 1) * perPage;
  const where: any = { employee: { createdBy: companyId } };
  if (search) {
    where.OR = [
      { description: { contains: search, mode: "insensitive" } },
      { employee: { firstName: { contains: search, mode: "insensitive" } } },
      { employee: { lastName: { contains: search, mode: "insensitive" } } },
      { fromDesignation: { name: { contains: search, mode: "insensitive" } } },
      { toDesignation: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  try {
    const [rows, total] = await Promise.all([prisma.hrmPromotion.findMany({ where, include: { employee: { select: { id: true, firstName: true, lastName: true } }, fromDesignation: { select: { id: true, name: true } }, toDesignation: { select: { id: true, name: true } } }, orderBy: { date: "desc" }, skip, take: perPage }), prisma.hrmPromotion.count({ where })]);
    return jsonR({ data: rows.map(ser), total, page, per_page: perPage, last_page: Math.ceil(total / perPage) || 1 });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-promotions", "create-promotions")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const body = await req.json().catch(() => null);
  if (!body?.employee_id || !body?.date) return NextResponse.json({ error: "employee_id and date required" }, { status: 400 });
  try {
    const row = await prisma.hrmPromotion.create({ data: { employeeId: BigInt(body.employee_id), fromDesignationId: body.from_designation_id ? BigInt(body.from_designation_id) : null, toDesignationId: body.to_designation_id ? BigInt(body.to_designation_id) : null, date: new Date(body.date), description: body.description ?? null, createdBy: getCompanyId(actor) } });
    return jsonR({ data: ser(row) }, { status: 201 });
  } catch { return serverError(); }
}
