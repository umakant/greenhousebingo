import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, notFound, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-formbuilder", "view-formbuilder-form-responses")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { id } = await params;

  const { searchParams: s } = new URL(req.url);
  const page = Math.max(1, Number(s.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 20)));
  const skip = (page - 1) * perPage;

  try {
    const form = await prisma.form.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
    if (!form) return notFound();

    const [rows, total] = await Promise.all([
      prisma.formResponse.findMany({
        where: { formId: BigInt(id) },
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
      }),
      prisma.formResponse.count({ where: { formId: BigInt(id) } }),
    ]);

    return jsonR({
      data: rows.map(r => ({
        id: r.id.toString(),
        formId: r.formId.toString(),
        responseData: r.responseData,
        submitterIp: r.submitterIp,
        createdAt: r.createdAt?.toISOString() ?? null,
      })),
      total,
      page,
      per_page: perPage,
      last_page: Math.ceil(total / perPage) || 1,
    });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-formbuilder", "delete-formbuilder-form")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const responseId = searchParams.get("response_id");

  try {
    const form = await prisma.form.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
    if (!form) return notFound();

    if (responseId) {
      await prisma.formResponse.delete({ where: { id: BigInt(responseId) } });
    } else {
      await prisma.formResponse.deleteMany({ where: { formId: BigInt(id) } });
    }
    return NextResponse.json({ ok: true });
  } catch { return serverError(); }
}
