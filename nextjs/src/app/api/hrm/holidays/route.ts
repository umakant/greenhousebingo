import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-hrm", "manage-holidays")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { searchParams: s } = new URL(req.url);
  const search = s.get("search") ?? ""; const year = s.get("year");
  const page = Math.max(1, Number(s.get("page") ?? 1)); const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 15))); const skip = (page - 1) * perPage;
  const where: any = { createdBy: companyId }; if (search) where.name = { contains: search, mode: "insensitive" };
  if (year) { where.date = { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) }; }
  try {
    const [rows, total] = await Promise.all([prisma.hrmHoliday.findMany({ where, orderBy: { date: "asc" }, skip, take: perPage }), prisma.hrmHoliday.count({ where })]);
    return jsonR({ data: rows.map(r => ({ ...r, id: r.id.toString() })), total, page, per_page: perPage, last_page: Math.ceil(total / perPage) || 1 });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-holidays", "create-holidays")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.date) return NextResponse.json({ error: "name and date required" }, { status: 400 });
  try {
    const row = await prisma.hrmHoliday.create({ data: { name: body.name, date: new Date(body.date), description: body.description ?? null, isActive: body.is_active ?? true, createdBy: getCompanyId(actor) } });
    return jsonR({ data: { ...row, id: row.id.toString() } }, { status: 201 });
  } catch { return serverError(); }
}
