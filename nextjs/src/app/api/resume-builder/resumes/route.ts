import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

function ser(r: any) {
  return {
    id: r.id.toString(),
    name: r.name,
    email: r.email,
    code: r.code,
    templateId: r.templateId?.toString() ?? null,
    templateName: r.template?.name ?? null,
    data: r.data ?? {},
    createdAt: r.createdAt?.toISOString() ?? null,
  };
}

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-resume-builder", "view-resumes")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);

  const { searchParams: s } = new URL(req.url);
  const page = Math.max(1, Number(s.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 10)));
  const search = s.get("search") ?? "";
  const skip = (page - 1) * perPage;

  const where: any = { createdBy: companyId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [rows, total] = await Promise.all([
      prisma.resume.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
        include: { template: { select: { name: true } } },
      }),
      prisma.resume.count({ where }),
    ]);
    return jsonR({ data: rows.map(ser), total, page, per_page: perPage, last_page: Math.ceil(total / perPage) || 1 });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-resume-builder", "create-resume")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);

  try {
    const body = await req.json();
    const { name, email, templateId, data } = body;
    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    if (!templateId) return NextResponse.json({ error: "Template is required" }, { status: 400 });

    const code = randomUUID().split("-")[0].toUpperCase();
    const resume = await prisma.resume.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        code,
        templateId: BigInt(templateId),
        data: data ?? {},
        createdBy: companyId,
      },
      include: { template: { select: { name: true } } },
    });
    return jsonR({ data: ser(resume) }, { status: 201 });
  } catch { return serverError(); }
}
