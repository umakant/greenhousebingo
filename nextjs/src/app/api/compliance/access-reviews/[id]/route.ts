import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import {
  accessReviewDescription,
  accessReviewDisplayStatus,
  accessReviewProgress,
  accessReviewReviewers,
  accessReviewStartDate,
  accessReviewSystemFromName,
  accessReviewTypeFromName,
  systemInfoFromName,
} from "@/lib/compliance/compliance-access-reviews";
import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import type { AccessReviewMetadata } from "@/lib/compliance/compliance-day2";
import { logComplianceActivity, loadOwner, serializeAccessReview } from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function enrichDetail(base: ReturnType<typeof serializeAccessReview>, ownerName: string | null) {
  const displayStatus = accessReviewDisplayStatus(base.status, base.dueDate);
  const progress = accessReviewProgress(
    base.id,
    base.approvedCount,
    base.revokedCount,
    base.exceptionCount,
    base.status,
  );
  const reviewers = accessReviewReviewers(base.id, ownerName ?? base.reviewerName);
  const systemInfo = systemInfoFromName(base.name, base.scope);
  return {
    ...base,
    ownerName: ownerName ?? base.reviewerName,
    system: accessReviewSystemFromName(base.name, base.scope),
    reviewType: accessReviewTypeFromName(base.name, base.scope),
    description: accessReviewDescription(base.name, base.scope),
    displayStatus,
    startDate: accessReviewStartDate(base.createdAt),
    progress,
    reviewers,
    reviewerCount: reviewers.length,
    systemInfo,
  };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-access-reviews");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const row = await prisma.complianceAccessReview.findFirst({
    where: { id: BigInt(id), organizationId: gate.actor.organizationId },
  });
  if (!row) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const reviewer = await loadOwner(row.reviewerUserId);
  const ownerName = reviewer?.name ?? reviewer?.email ?? gate.actor.name;

  const [history] = await Promise.all([
    prisma.complianceActivityLog.findMany({
      where: { organizationId: gate.actor.organizationId, entityType: "access_review", entityId: row.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, action: true, actorName: true, createdAt: true },
    }),
  ]);

  const base = serializeAccessReview({ ...row, reviewer });
  return NextResponse.json({
    ok: true,
    item: enrichDetail(base, ownerName),
    history: history.map((h) => ({
      id: Number(h.id),
      action: h.action,
      actorName: h.actorName,
      createdAt: h.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-access-reviews");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const existing = await prisma.complianceAccessReview.findFirst({
    where: { id: BigInt(id), organizationId: gate.actor.organizationId },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const prevMeta = (existing.metadata ?? {}) as AccessReviewMetadata;
  const metadata: AccessReviewMetadata = { ...prevMeta };

  if (Array.isArray(body.userReviews)) {
    metadata.userReviews = body.userReviews as AccessReviewMetadata["userReviews"];
  }
  if (body.exportEvidence === true) {
    metadata.evidenceExportedAt = new Date().toISOString();
  }

  const completed = body.status === "completed";
  const startReview = body.action === "start_review";
  const row = await prisma.complianceAccessReview.update({
    where: { id: existing.id },
    data: {
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.scope !== undefined ? { scope: String(body.scope).trim() || null } : {}),
      ...(body.status !== undefined ? { status: String(body.status).trim() } : {}),
      ...(startReview ? { status: "in_progress" } : {}),
      ...(body.dueDate !== undefined ? { dueDate: body.dueDate ? new Date(String(body.dueDate)) : null } : {}),
      ...(body.reviewerUserId !== undefined
        ? { reviewerUserId: body.reviewerUserId ? BigInt(Number(body.reviewerUserId)) : null }
        : {}),
      ...(completed ? { completedAt: new Date() } : {}),
      metadata: metadata as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: body.exportEvidence
      ? "access_review_exported"
      : startReview
        ? "access_review_started"
        : "access_review_updated",
    entityType: "access_review",
    entityId: row.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
  });

  const reviewer = await loadOwner(row.reviewerUserId);
  const base = serializeAccessReview({ ...row, reviewer });
  return NextResponse.json({ ok: true, item: enrichDetail(base, gate.actor.name) });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-access-reviews");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const existing = await prisma.complianceAccessReview.findFirst({
    where: { id: BigInt(id), organizationId: gate.actor.organizationId },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  await prisma.complianceAccessReview.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
