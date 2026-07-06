import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import {
  accessReviewDescription,
  accessReviewDisplayStatus,
  accessReviewProgress,
  accessReviewReviewers,
  accessReviewSystemFromName,
  accessReviewTypeFromName,
} from "@/lib/compliance/compliance-access-reviews";
import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import type { AccessReviewMetadata } from "@/lib/compliance/compliance-day2";
import { logComplianceActivity, loadOwner, serializeAccessReview } from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function enrichAccessReviewRow(
  base: ReturnType<typeof serializeAccessReview>,
  ownerName: string | null,
) {
  const displayStatus = accessReviewDisplayStatus(base.status, base.dueDate);
  const progress = accessReviewProgress(
    base.id,
    base.approvedCount,
    base.revokedCount,
    base.exceptionCount,
    base.status,
  );
  const reviewers = accessReviewReviewers(base.id, ownerName ?? base.reviewerName);
  return {
    ...base,
    ownerName: ownerName ?? base.reviewerName,
    system: accessReviewSystemFromName(base.name, base.scope),
    reviewType: accessReviewTypeFromName(base.name, base.scope),
    description: accessReviewDescription(base.name, base.scope),
    displayStatus,
    progressPct: progress.progressPct,
    usersInScope: progress.usersInScope,
    reviewedCount: progress.reviewed,
    pendingCount: progress.pending,
    reviewers,
    reviewerCount: reviewers.length,
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-access-reviews");
  if (!gate.ok) return gate.response;

  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();
  const system = (req.nextUrl.searchParams.get("system") ?? "").trim();
  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();

  const rows = await prisma.complianceAccessReview.findMany({
    where: {
      organizationId: gate.actor.organizationId,
      ...(status ? { status } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  let items = rows.map((row) => {
    const base = serializeAccessReview({ ...row, reviewer: null });
    return enrichAccessReviewRow(base, gate.actor.name);
  });

  if (system) items = items.filter((i) => i.system === system);
  if (status === "overdue") items = items.filter((i) => i.displayStatus === "overdue");
  if (status === "pending_review") items = items.filter((i) => i.displayStatus === "pending_review");

  const systems = [...new Set(items.map((i) => i.system))].sort();

  return NextResponse.json({ ok: true, items, systems });
}

export async function POST(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-access-reviews");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ ok: false, message: "Campaign name is required." }, { status: 400 });

  const metadata: AccessReviewMetadata = {
    userReviews: Array.isArray(body.userReviews) ? (body.userReviews as AccessReviewMetadata["userReviews"]) : [],
  };

  const row = await prisma.complianceAccessReview.create({
    data: {
      organizationId: gate.actor.organizationId,
      name,
      scope: String(body.scope ?? "").trim() || null,
      status: String(body.status ?? "scheduled").trim() || "scheduled",
      dueDate: body.dueDate ? new Date(String(body.dueDate)) : null,
      reviewerUserId: body.reviewerUserId ? BigInt(Number(body.reviewerUserId)) : gate.actor.userId,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: "access_review_created",
    entityType: "access_review",
    entityId: row.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
  });

  const base = serializeAccessReview({ ...row, reviewer: null });
  return NextResponse.json({ ok: true, item: enrichAccessReviewRow(base, gate.actor.name) });
}
