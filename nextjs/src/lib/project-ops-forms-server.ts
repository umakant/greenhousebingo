import { randomBytes, randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getProjectOpsFormTemplate,
  isProjectOpsSectionId,
  type ProjectOpsSectionId,
} from "@/lib/project-ops-form-templates";
import { serializeFormField } from "@/lib/project-ops-form-utils";

export async function ensureProjectSectionForm(companyId: bigint, sectionId: ProjectOpsSectionId) {
  const existing = await prisma.form.findFirst({
    where: { createdBy: companyId, projectSectionId: sectionId },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  if (existing) return existing;

  const template = getProjectOpsFormTemplate(sectionId);
  const code = `project-${sectionId}-${randomUUID()}-${Date.now()}-${randomBytes(4).toString("hex")}`;

  return prisma.$transaction(async (tx) => {
    const created = await tx.form.create({
      data: {
        name: template.name,
        code,
        isActive: true,
        defaultLayout: template.default_layout,
        projectSectionId: sectionId,
        createdBy: companyId,
      },
    });

    if (template.fields.length > 0) {
      await tx.formField.createMany({
        data: template.fields.map((field, i) => ({
          formId: created.id,
          label: field.label,
          type: field.type,
          required: field.required ?? false,
          placeholder: field.placeholder ?? null,
          options: (field.options ?? []) as Prisma.InputJsonValue,
          order: field.order ?? i,
          createdBy: companyId,
        })),
      });
    }

    return tx.form.findFirstOrThrow({
      where: { id: created.id },
      include: { fields: { orderBy: { order: "asc" } } },
    });
  });
}

export async function ensureAllProjectSectionForms(companyId: bigint) {
  const sectionIds = [
    "after_action",
    "agent_checklist",
    "agents",
    "medics",
    "security",
    "bugs",
    "checklist",
    "documents",
    "files",
    "incident_reports",
    "leadership",
    "lodging",
    "lost_found",
    "medical_facilities",
    "milestones",
    "tasks",
    "team",
    "notes",
    "position",
    "risk_assessment",
    "vendors",
  ] as ProjectOpsSectionId[];

  for (const sectionId of sectionIds) {
    await ensureProjectSectionForm(companyId, sectionId);
  }
}

export function serializeProjectSectionForm(form: {
  id: bigint;
  name: string;
  code: string;
  isActive: boolean;
  defaultLayout: string;
  projectSectionId: string | null;
  fields: Array<{
    id: bigint;
    label: string;
    type: string;
    required: boolean;
    placeholder: string | null;
    options: unknown;
    order: number;
  }>;
}) {
  return {
    id: form.id.toString(),
    name: form.name,
    code: form.code,
    isActive: form.isActive,
    defaultLayout: form.defaultLayout,
    projectSectionId: form.projectSectionId,
    fields: form.fields.map(serializeFormField),
  };
}

export async function getProjectSectionFormForCompany(companyId: bigint, sectionId: string) {
  if (!isProjectOpsSectionId(sectionId)) return null;
  const form = await ensureProjectSectionForm(companyId, sectionId);
  return serializeProjectSectionForm(form);
}
