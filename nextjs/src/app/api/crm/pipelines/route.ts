import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCrmActor, getCrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, serverError } from "@/lib/crm-auth";
import { ensureDefaultCrmPipeline } from "@/lib/crm-default-pipeline";

export async function GET(req: NextRequest) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();
  const perms = await getCrmPerms(req);
  if (!checkPerm(perms, "manage-pipelines", "manage-crm", "manage-leads", "manage-deals")) return forbidden();

  try {
    const cid = getCompanyId(actor);
    await ensureDefaultCrmPipeline(cid);
    const pipelines = await prisma.crmPipeline.findMany({
      where: { createdBy: cid },
      orderBy: { createdAt: "asc" },
      include: { stages: { orderBy: { order: "asc" } } },
    });
    return jsonR({ ok: true, data: pipelines });
  } catch (e) { return serverError(e); }
}

export async function POST(req: NextRequest) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();
  const perms = await getCrmPerms(req);
  if (!checkPerm(perms, "manage-pipelines", "manage-crm")) return forbidden();

  try {
    const cid = getCompanyId(actor);
    const body = (await req.json()) as {
      name?: string;
      description?: string | null;
      is_default?: boolean;
      stages?: Array<{ name?: string; color?: string; order?: number }>;
    };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return jsonR({ ok: false, message: "Name is required" }, 400);
    }
    const pipeline = await prisma.crmPipeline.create({
      data: {
        name,
        description: body.description ?? null,
        isDefault: body.is_default ?? false,
        createdBy: cid,
      },
    });
    if (Array.isArray(body.stages) && body.stages.length > 0) {
      await prisma.crmPipelineStage.createMany({
        data: body.stages.map((s, i) => ({
          pipelineId: pipeline.id,
          name: (s.name && String(s.name).trim()) || `Stage ${i + 1}`,
          color: s.color && String(s.color).trim() ? String(s.color) : "#6366f1",
          order: typeof s.order === "number" ? s.order : i,
          createdBy: cid,
        })),
      });
    }
    const full = await prisma.crmPipeline.findFirst({
      where: { id: pipeline.id },
      include: { stages: { orderBy: { order: "asc" } } },
    });
    return jsonR({ ok: true, data: full });
  } catch (e) { return serverError(e); }
}
