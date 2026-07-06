import { prisma } from "@/lib/prisma";

export const DEFAULT_CRM_PIPELINE_STAGES = [
  { name: "New", color: "#6366f1", order: 0 },
  { name: "Qualified", color: "#f59e0b", order: 1 },
  { name: "Won", color: "#10b981", order: 2 },
  { name: "Lost", color: "#ef4444", order: 3 },
] as const;

export type CrmLeadPlacement = {
  pipelineId: bigint;
  stageId: bigint;
};

/** Default pipeline for a company (creates one with standard stages when missing). */
export async function ensureDefaultCrmPipeline(companyId: bigint) {
  const existing = await prisma.crmPipeline.findFirst({
    where: { createdBy: companyId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include: { stages: { orderBy: { order: "asc" } } },
  });
  if (existing) return existing;

  const pipeline = await prisma.crmPipeline.create({
    data: {
      name: "Sales Pipeline",
      description: "Default lead pipeline",
      isDefault: true,
      createdBy: companyId,
    },
  });

  await prisma.crmPipelineStage.createMany({
    data: DEFAULT_CRM_PIPELINE_STAGES.map((s) => ({
      pipelineId: pipeline.id,
      name: s.name,
      color: s.color,
      order: s.order,
      createdBy: companyId,
    })),
  });

  return prisma.crmPipeline.findFirstOrThrow({
    where: { id: pipeline.id },
    include: { stages: { orderBy: { order: "asc" } } },
  });
}

/** First stage of the default pipeline — used when creating or backfilling leads. */
export async function resolveDefaultLeadPlacement(companyId: bigint): Promise<CrmLeadPlacement | null> {
  const pipeline = await ensureDefaultCrmPipeline(companyId);
  const stage = pipeline.stages[0];
  if (!stage) return null;
  return { pipelineId: pipeline.id, stageId: stage.id };
}

/** Assign leads with no pipeline to the default pipeline (first stage). */
export async function backfillOrphanCrmLeads(companyId: bigint, pipelineId?: bigint) {
  const pipeline = pipelineId
    ? await prisma.crmPipeline.findFirst({
        where: { id: pipelineId, createdBy: companyId },
        include: { stages: { orderBy: { order: "asc" }, take: 1 } },
      })
    : await ensureDefaultCrmPipeline(companyId);

  if (!pipeline?.stages[0]) return 0;

  const result = await prisma.crmLead.updateMany({
    where: { createdBy: companyId, pipelineId: null },
    data: {
      pipelineId: pipeline.id,
      stageId: pipeline.stages[0].id,
    },
  });
  return result.count;
}
