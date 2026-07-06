import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";
import { randomBytes, randomUUID } from "crypto";

export const dynamic = "force-dynamic";

function ser(f: any) {
  return {
    id: f.id.toString(),
    name: f.name,
    code: f.code,
    isActive: f.isActive,
    defaultLayout: f.defaultLayout,
    projectSectionId: f.projectSectionId ?? null,
    createdAt: f.createdAt?.toISOString() ?? null,
    fieldsCount: f._count?.fields ?? 0,
    responsesCount: f._count?.responses ?? 0,
  };
}

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-formbuilder", "view-formbuilder-form")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);

  const { searchParams: s } = new URL(req.url);
  const page = Math.max(1, Number(s.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 10)));
  const search = s.get("search") ?? "";
  const skip = (page - 1) * perPage;

  const where: any = { createdBy: companyId };
  if (search) where.name = { contains: search, mode: "insensitive" };

  try {
    const [rows, total] = await Promise.all([
      prisma.form.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
        include: { _count: { select: { fields: true, responses: true } } },
      }),
      prisma.form.count({ where }),
    ]);
    return jsonR({ data: rows.map(ser), total, page, per_page: perPage, last_page: Math.ceil(total / perPage) || 1 });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-formbuilder", "create-formbuilder")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "name required" }, { status: 400 });

  try {
    const code = `${randomUUID()}-${Date.now()}-${randomBytes(4).toString("hex")}`;

    const form = await prisma.$transaction(async (tx) => {
      const created = await tx.form.create({
        data: {
          name: body.name,
          code,
          isActive: body.is_active ?? true,
          defaultLayout: body.default_layout ?? "single",
          createdBy: companyId,
        },
      });
      if (Array.isArray(body.fields) && body.fields.length > 0) {
        await tx.formField.createMany({
          data: body.fields.map((f: any, i: number) => ({
            formId: created.id,
            label: f.label,
            type: f.type,
            required: f.required ?? false,
            placeholder: f.placeholder ?? null,
            options: f.options ?? null,
            order: f.order ?? i,
            createdBy: companyId,
          })),
        });
      }
      return created;
    });

    return jsonR({ data: { id: form.id.toString(), code: form.code } }, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      const target = (e.meta?.target as string[] | undefined)?.join(", ") ?? "";
      const msg =
        target.includes("code") || !target
          ? "Could not generate a unique form link. Please try Save again."
          : "This form conflicts with existing data. Please try again or change the form.";
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    return serverError();
  }
}
