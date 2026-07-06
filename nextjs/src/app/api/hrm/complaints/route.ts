import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

function ser(r: any) { return { ...r, id: r.id.toString(), complainantId: r.complainantId.toString(), againstId: r.againstId.toString(), complainant: r.complainant ? { ...r.complainant, id: r.complainant.id.toString() } : null, against: r.against ? { ...r.against, id: r.against.id.toString() } : null }; }

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-hrm", "manage-complaints")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { searchParams: s } = new URL(req.url);
  const status = s.get("status"); const page = Math.max(1, Number(s.get("page") ?? 1)); const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 15))); const skip = (page - 1) * perPage;
  const where: any = { complainant: { createdBy: companyId } }; if (status) where.status = status;
  try {
    const [rows, total] = await Promise.all([prisma.hrmComplaint.findMany({ where, include: { complainant: { select: { id: true, firstName: true, lastName: true } }, against: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { date: "desc" }, skip, take: perPage }), prisma.hrmComplaint.count({ where })]);
    return jsonR({ data: rows.map(ser), total, page, per_page: perPage, last_page: Math.ceil(total / perPage) || 1 });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-complaints", "create-complaints")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const body = await req.json().catch(() => null);
  if (!body?.complainant_id || !body?.against_id || !body?.subject || !body?.date) return NextResponse.json({ error: "complainant_id, against_id, subject, date required" }, { status: 400 });
  try {
    const row = await prisma.hrmComplaint.create({ data: { complainantId: BigInt(body.complainant_id), againstId: BigInt(body.against_id), subject: body.subject, description: body.description ?? null, date: new Date(body.date), status: body.status ?? "pending", createdBy: getCompanyId(actor) } });
    return jsonR({ data: ser(row) }, { status: 201 });
  } catch { return serverError(); }
}
