import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-hrm", "manage-documents")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { searchParams: s } = new URL(req.url);
  const empId = s.get("employee_id"); const docType = s.get("document_type");
  const search = (s.get("search") ?? "").trim();
  const page = Math.max(1, Number(s.get("page") ?? 1)); const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 15))); const skip = (page - 1) * perPage;
  const where: any = { employee: { createdBy: companyId } };
  if (empId) where.employeeId = BigInt(empId); if (docType) where.documentType = docType;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { employee: { firstName: { contains: search, mode: "insensitive" } } },
      { employee: { lastName: { contains: search, mode: "insensitive" } } },
    ];
  }
  function ser(r: { id: bigint; title: string; documentType: string | null; filePath: string | null; expiryDate: Date | null; description: string | null; employee: { id: bigint; firstName: string; lastName: string | null } | null }) {
    return {
      id: r.id.toString(),
      documentName: r.title,
      documentType: r.documentType,
      fileUrl: r.filePath,
      expiryDate: r.expiryDate,
      description: r.description,
      employee: r.employee ? { id: r.employee.id.toString(), firstName: r.employee.firstName, lastName: r.employee.lastName } : null,
    };
  }
  try {
    const [rows, total] = await Promise.all([prisma.hrmDocument.findMany({ where, include: { employee: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" }, skip, take: perPage }), prisma.hrmDocument.count({ where })]);
    return jsonR({ data: rows.map(ser), total, page, per_page: perPage, last_page: Math.ceil(total / perPage) || 1 });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req); if (!checkPerm(perms, "manage-documents", "create-documents")) return forbidden();
  const actor = await getHrmActor(req); if (!actor) return unauthorized();
  const body = await req.json().catch(() => null);
  if (!body?.employee_id || !body?.document_name) return NextResponse.json({ error: "employee_id and document_name required" }, { status: 400 });
  try {
    const row = await prisma.hrmDocument.create({ data: { employeeId: BigInt(body.employee_id), title: body.document_name, documentType: body.document_type ?? null, filePath: body.file_path ?? null, description: body.description ?? null, expiryDate: body.expiry_date ? new Date(body.expiry_date) : null, createdBy: getCompanyId(actor) } });
    return jsonR({ data: row }, { status: 201 });
  } catch { return serverError(); }
}
