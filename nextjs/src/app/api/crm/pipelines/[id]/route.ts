import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCrmActor, getCrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, serverError } from "@/lib/crm-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();
  const perms = await getCrmPerms(req);
  if (!checkPerm(perms, "manage-pipelines", "manage-crm", "manage-leads", "manage-deals")) return forbidden();
  try {
    const { id } = await params;
    const pipeline = await prisma.crmPipeline.findUnique({
      where: { id: BigInt(id) },
      include: { stages: { orderBy: { order: "asc" } } },
    });
    if (!pipeline) return jsonR({ ok: false, message: "Not found" }, 404);
    return jsonR({ ok: true, data: pipeline });
  } catch (e) { return serverError(e); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();
  const perms = await getCrmPerms(req);
  if (!checkPerm(perms, "manage-pipelines", "manage-crm")) return forbidden();
  try {
    const { id } = await params;
    const body = await req.json();
    const cid = getCompanyId(actor);

    // Handle stages upsert if provided
    if (Array.isArray(body.stages)) {
      // Delete removed stages
      const keepIds = body.stages.filter((s: any) => s.id).map((s: any) => BigInt(s.id));
      await prisma.crmPipelineStage.deleteMany({
        where: { pipelineId: BigInt(id), id: { notIn: keepIds } },
      });
      // Upsert each stage
      for (let i = 0; i < body.stages.length; i++) {
        const s = body.stages[i];
        if (s.id) {
          await prisma.crmPipelineStage.update({
            where: { id: BigInt(s.id) },
            data: { name: s.name, color: s.color ?? "#6366f1", order: i },
          });
        } else {
          await prisma.crmPipelineStage.create({
            data: { pipelineId: BigInt(id), name: s.name, color: s.color ?? "#6366f1", order: i, createdBy: cid },
          });
        }
      }
    }

    const pipeline = await prisma.crmPipeline.update({
      where: { id: BigInt(id) },
      data: {
        name: body.name,
        description: body.description ?? null,
        isDefault: body.is_default ?? false,
      },
      include: { stages: { orderBy: { order: "asc" } } },
    });
    return jsonR({ ok: true, data: pipeline });
  } catch (e) { return serverError(e); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();
  const perms = await getCrmPerms(req);
  if (!checkPerm(perms, "manage-pipelines", "manage-crm")) return forbidden();
  try {
    const { id } = await params;
    await prisma.crmPipeline.delete({ where: { id: BigInt(id) } });
    return jsonR({ ok: true });
  } catch (e) { return serverError(e); }
}
