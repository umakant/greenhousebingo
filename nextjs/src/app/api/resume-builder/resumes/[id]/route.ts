import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

function ser(r: any) {
  return {
    id: r.id.toString(),
    name: r.name,
    email: r.email,
    code: r.code,
    templateId: r.templateId?.toString() ?? null,
    templateName: r.template?.name ?? null,
    templateSlug: r.template?.slug ?? null,
    data: r.data ?? {},
    createdAt: r.createdAt?.toISOString() ?? null,
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-resume-builder", "view-resumes")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);

  try {
    const row = await prisma.resume.findFirst({
      where: { id: BigInt(id), createdBy: companyId },
      include: { template: { select: { name: true, slug: true } } },
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return jsonR({ data: ser(row) });
  } catch { return serverError(); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-resume-builder", "edit-resume")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);

  try {
    const body = await req.json();
    const { name, email, templateId, data } = body;

    const existing = await prisma.resume.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.resume.update({
      where: { id: BigInt(id) },
      data: {
        ...(name != null ? { name: String(name).trim() } : {}),
        ...(email != null ? { email: String(email).trim() } : {}),
        ...(templateId != null ? { templateId: BigInt(templateId) } : {}),
        ...(data != null ? { data } : {}),
        updatedAt: new Date(),
      },
      include: { template: { select: { name: true, slug: true } } },
    });
    return jsonR({ data: ser(updated) });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-resume-builder", "delete-resume")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);

  try {
    const existing = await prisma.resume.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.resume.delete({ where: { id: BigInt(id) } });
    return jsonR({ success: true });
  } catch { return serverError(); }
}
