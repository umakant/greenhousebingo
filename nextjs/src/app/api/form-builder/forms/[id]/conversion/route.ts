import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, notFound, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-formbuilder", "edit-formbuilder-form")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { id } = await params;

  try {
    const form = await prisma.form.findFirst({
      where: { id: BigInt(id), createdBy: companyId },
      include: { conversion: true, fields: { orderBy: { order: "asc" } } },
    });
    if (!form) return notFound();
    return jsonR({
      conversion: form.conversion ? {
        id: form.conversion.id.toString(),
        moduleName: form.conversion.moduleName,
        submoduleName: form.conversion.submoduleName,
        isActive: form.conversion.isActive,
        fieldMappings: form.conversion.fieldMappings,
      } : null,
      fields: form.fields.map(f => ({ id: f.id.toString(), label: f.label, type: f.type })),
    });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-formbuilder", "edit-formbuilder-form")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.module_name) return jsonR({ error: "module_name required" }, { status: 400 });

  try {
    const form = await prisma.form.findFirst({ where: { id: BigInt(id), createdBy: companyId } });
    if (!form) return notFound();

    const conversion = await prisma.formConversion.upsert({
      where: { formId: BigInt(id) },
      create: {
        formId: BigInt(id),
        moduleName: body.module_name,
        submoduleName: body.submodule_name ?? null,
        isActive: body.is_active ?? false,
        fieldMappings: body.field_mappings ?? {},
        createdBy: companyId,
      },
      update: {
        moduleName: body.module_name,
        submoduleName: body.submodule_name ?? null,
        isActive: body.is_active ?? false,
        fieldMappings: body.field_mappings ?? {},
        updatedAt: new Date(),
      },
    });
    return jsonR({ data: { id: conversion.id.toString() } });
  } catch { return serverError(); }
}
