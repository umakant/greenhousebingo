import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import type { RiskMetadata } from "@/lib/compliance/compliance-day2";
import {
  daysUntilReview,
  impactDisplayLabel,
  impactWeightValue,
  likelihoodDisplayLabel,
  likelihoodWeightValue,
  nextReviewDate,
  riskAppetite,
  riskCategoryFromTitle,
  riskCode,
  riskDescription,
  riskRelatedCounts,
} from "@/lib/compliance/compliance-risks";
import { logComplianceActivity, loadOwner, serializeRisk } from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function enrichDetail(base: ReturnType<typeof serializeRisk>, row: { description: string | null; createdAt: Date }) {
  const nextReview = nextReviewDate(base.lastReviewedAt, base.dueDate);
  return {
    ...base,
    riskCode: riskCode(base.id),
    category: riskCategoryFromTitle(base.title),
    description: riskDescription(base.title, row.description),
    likelihoodValue: likelihoodWeightValue(base.likelihood),
    likelihoodLabel: likelihoodDisplayLabel(base.likelihood),
    impactValue: impactWeightValue(base.impact),
    impactLabel: impactDisplayLabel(base.impact),
    riskAppetite: riskAppetite(base.riskLevel),
    dateIdentified: row.createdAt.toISOString(),
    nextReviewAt: nextReview,
    nextReviewIn: daysUntilReview(nextReview),
  };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-risks");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const row = await prisma.complianceRisk.findFirst({
    where: { id: BigInt(id), organizationId: gate.actor.organizationId },
  });
  if (!row) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const [owner, comments, history] = await Promise.all([
    loadOwner(row.ownerUserId),
    prisma.complianceComment.findMany({
      where: { organizationId: gate.actor.organizationId, entityType: "risk", entityId: row.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.complianceActivityLog.findMany({
      where: { organizationId: gate.actor.organizationId, entityType: "risk", entityId: row.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, action: true, actorName: true, metadata: true, createdAt: true },
    }),
  ]);

  const ownerName = owner?.name ?? owner?.email ?? gate.actor.name;
  const base = serializeRisk({ ...row, owner: owner ? { ...owner, id: row.ownerUserId! } : null });

  return NextResponse.json({
    ok: true,
    item: { ...enrichDetail(base, row), ownerName },
    relatedCounts: riskRelatedCounts(Number(row.id)),
    comments: comments.map((c) => ({
      id: Number(c.id),
      body: c.body,
      authorName: c.authorName,
      createdAt: c.createdAt.toISOString(),
    })),
    history: history.map((h) => ({
      id: Number(h.id),
      action: h.action,
      actorName: h.actorName,
      metadata: h.metadata,
      createdAt: h.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-risks");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const existing = await prisma.complianceRisk.findFirst({
    where: { id: BigInt(id), organizationId: gate.actor.organizationId },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const prevMeta = (existing.metadata ?? {}) as RiskMetadata;
  const metadata: RiskMetadata = {
    ...prevMeta,
    ...(body.mitigationPlan !== undefined
      ? { mitigationPlan: String(body.mitigationPlan).trim() || undefined }
      : {}),
    ...(body.residualImpact !== undefined
      ? { residualImpact: String(body.residualImpact).trim() || undefined }
      : {}),
    ...(body.residualLikelihood !== undefined
      ? { residualLikelihood: String(body.residualLikelihood).trim() || undefined }
      : {}),
    ...(body.reviewNotes !== undefined ? { reviewNotes: String(body.reviewNotes).trim() || undefined } : {}),
  };

  const reviewNow = body.recordReview === true;
  if (reviewNow) metadata.lastReviewedAt = new Date().toISOString();

  const row = await prisma.complianceRisk.update({
    where: { id: existing.id },
    data: {
      ...(body.title !== undefined ? { title: String(body.title).trim() } : {}),
      ...(body.description !== undefined ? { description: String(body.description).trim() || null } : {}),
      ...(body.impact !== undefined || body.severity !== undefined
        ? { severity: String(body.impact ?? body.severity).trim() }
        : {}),
      ...(body.likelihood !== undefined ? { likelihood: String(body.likelihood).trim() } : {}),
      ...(body.status !== undefined ? { status: String(body.status).trim() } : {}),
      ...(body.ownerUserId !== undefined
        ? { ownerUserId: body.ownerUserId ? BigInt(Number(body.ownerUserId)) : null }
        : {}),
      ...(body.dueDate !== undefined ? { dueDate: body.dueDate ? new Date(String(body.dueDate)) : null } : {}),
      ...(reviewNow ? { lastReviewedAt: new Date() } : {}),
      metadata: metadata as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: reviewNow ? "risk_reviewed" : "risk_updated",
    entityType: "risk",
    entityId: row.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
  });

  const owner = await loadOwner(row.ownerUserId);
  const base = serializeRisk({ ...row, owner });
  return NextResponse.json({ ok: true, item: enrichDetail(base, row) });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-risks");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const existing = await prisma.complianceRisk.findFirst({
    where: { id: BigInt(id), organizationId: gate.actor.organizationId },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  await prisma.complianceRisk.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
