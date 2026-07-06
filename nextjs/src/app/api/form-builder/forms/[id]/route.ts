import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, notFound, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

function serFull(f: any) {
  return {
    id: f.id.toString(),
    name: f.name,
    code: f.code,
    isActive: f.isActive,
    defaultLayout: f.defaultLayout,
    projectSectionId: f.projectSectionId ?? null,
    createdAt: f.createdAt?.toISOString() ?? null,
    fields: (f.fields ?? []).map((field: any) => ({
      id: field.id.toString(),
      label: field.label,
      type: field.type,
      required: field.required,
      placeholder: field.placeholder ?? null,
      options: field.options ?? [],
      order: field.order,
    })),
    conversion: f.conversion ? {
      id: f.conversion.id.toString(),
      moduleName: f.conversion.moduleName,
      submoduleName: f.conversion.submoduleName,
      isActive: f.conversion.isActive,
      fieldMappings: f.conversion.fieldMappings,
    } : null,
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-formbuilder", "view-formbuilder-form", "edit-formbuilder-form")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { id } = await params;

  try {
    const form = await prisma.form.findFirst({
      where: { id: BigInt(id), createdBy: companyId },
      include: { fields: { orderBy: { order: "asc" } }, conversion: true },
    });
    if (!form) return notFound();
    return jsonR({ data: serFull(form) });
  } catch { return serverError(); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-formbuilder", "edit-formbuilder-form")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { id } = await params;
  const body = await req.json().catch(() => null);

  try {
    const existing = await prisma.form.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
    if (!existing) return notFound();

    await prisma.form.update({
      where: { id: BigInt(id) },
      data: {
        ...(body?.name && { name: body.name }),
        ...(body?.is_active !== undefined && { isActive: body.is_active }),
        ...(body?.default_layout && { defaultLayout: body.default_layout }),
        updatedAt: new Date(),
      },
    });

    // If fields array provided, replace all fields
    if (Array.isArray(body?.fields)) {
      await prisma.formField.deleteMany({ where: { formId: BigInt(id) } });
      if (body.fields.length > 0) {
        await prisma.formField.createMany({
          data: body.fields.map((f: any, i: number) => ({
            formId: BigInt(id),
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
    }

    const updated = await prisma.form.findFirst({
      where: { id: BigInt(id) },
      include: { fields: { orderBy: { order: "asc" } }, conversion: true },
    });
    return jsonR({ data: serFull(updated) });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-formbuilder", "delete-formbuilder-form")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { id } = await params;

  try {
    const existing = await prisma.form.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
    if (!existing) return notFound();
    await prisma.form.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ ok: true });
  } catch { return serverError(); }
}
