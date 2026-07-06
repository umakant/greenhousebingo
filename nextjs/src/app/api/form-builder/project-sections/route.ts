import { NextRequest } from "next/server";
import {
  checkPerm,
  forbidden,
  getCompanyId,
  getHrmActor,
  getHrmPerms,
  jsonR,
  serverError,
  unauthorized,
} from "@/lib/hrm-auth";
import {
  PROJECT_OPS_FORM_SECTIONS,
  getProjectOpsSectionLabel,
} from "@/lib/project-ops-form-templates";
import {
  ensureAllProjectSectionForms,
  serializeProjectSectionForm,
} from "@/lib/project-ops-forms-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-formbuilder", "view-formbuilder-form")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();

  try {
    const companyId = getCompanyId(actor);
    await ensureAllProjectSectionForms(companyId);

    const { prisma } = await import("@/lib/prisma");
    const forms = await prisma.form.findMany({
      where: { createdBy: companyId, projectSectionId: { not: null } },
      include: { fields: { orderBy: { order: "asc" } }, _count: { select: { responses: true } } },
      orderBy: { name: "asc" },
    });

    const bySection = new Map(forms.map((f) => [f.projectSectionId, f]));

    const data = PROJECT_OPS_FORM_SECTIONS.map((section) => {
      const form = bySection.get(section.id);
      return {
        sectionId: section.id,
        sectionLabel: section.label,
        form: form
          ? {
              ...serializeProjectSectionForm(form),
              responsesCount: form._count.responses,
              editUrl: `/form-builder/${form.id.toString()}/edit`,
            }
          : null,
      };
    });

    return jsonR({ data });
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-formbuilder", "view-formbuilder-form", "create-formbuilder")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();

  try {
    const companyId = getCompanyId(actor);
    await ensureAllProjectSectionForms(companyId);
    return jsonR({
      ok: true,
      message: `Ensured ${PROJECT_OPS_FORM_SECTIONS.length} project section forms.`,
      sections: PROJECT_OPS_FORM_SECTIONS.map((s) => ({
        id: s.id,
        label: getProjectOpsSectionLabel(s.id),
      })),
    });
  } catch {
    return serverError();
  }
}
