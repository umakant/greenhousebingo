import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-hrm", "manage-departments", "manage-branches")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { searchParams: s } = new URL(req.url);
  const search = s.get("search") ?? "";
  const branchId = s.get("branch_id");
  const page = Math.max(1, Number(s.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 15)));
  const skip = (page - 1) * perPage;
  const where: any = { createdBy: companyId };
  if (search) where.name = { contains: search, mode: "insensitive" };
  if (branchId) where.branchId = BigInt(branchId);
  try {
    const [rows, total] = await Promise.all([
      prisma.hrmDepartment.findMany({ where, include: { branch: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" }, skip, take: perPage }),
      prisma.hrmDepartment.count({ where }),
    ]);
    return jsonR({ data: rows.map(r => ({ ...r, id: r.id.toString(), branchId: r.branchId?.toString(), branch: r.branch ? { ...r.branch, id: r.branch.id.toString() } : null })), total, page, per_page: perPage, last_page: Math.ceil(total / perPage) || 1 });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-branches", "create-departments")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  try {
    const row = await prisma.hrmDepartment.create({ data: { name: body.name, description: body.description ?? null, branchId: body.branch_id ? BigInt(body.branch_id) : null, isActive: body.is_active ?? true, createdBy: companyId } });
    return jsonR({ data: { ...row, id: row.id.toString() } }, { status: 201 });
  } catch { return serverError(); }
}
