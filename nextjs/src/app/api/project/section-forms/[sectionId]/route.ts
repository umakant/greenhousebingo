import { NextRequest } from "next/server";
import {
  forbidden,
  getCompanyId,
  getHrmActor,
  jsonR,
  serverError,
  unauthorized,
} from "@/lib/hrm-auth";
import { isProjectOpsSectionId } from "@/lib/project-ops-form-templates";
import { getProjectSectionFormForCompany } from "@/lib/project-ops-forms-server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> },
) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();

  const { sectionId } = await params;
  if (!isProjectOpsSectionId(sectionId)) {
    return jsonR({ error: "Unknown project section" }, { status: 404 });
  }

  try {
    const companyId = getCompanyId(actor);
    const form = await getProjectSectionFormForCompany(companyId, sectionId);
    if (!form) return jsonR({ error: "Form not found" }, { status: 404 });
    return jsonR({ data: form });
  } catch {
    return serverError();
  }
}
