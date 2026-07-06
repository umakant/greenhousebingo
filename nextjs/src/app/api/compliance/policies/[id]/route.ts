import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import { loadOwner, logComplianceActivity, serializePolicy } from "@/lib/compliance/compliance-service";
import {
  policyAcknowledgementTarget,
  policyCategoryFromTitle,
  policyFrameworksFromTitle,
  policyRelatedCounts,
} from "@/lib/compliance/compliance-policies";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-policies");
  if (!gate.ok) return gate.response;

  const { id: idRaw } = await ctx.params;
  const id = BigInt(idRaw);
  const { organizationId } = gate.actor;

  const row = await prisma.compliancePolicy.findFirst({
    where: { id, organizationId },
    include: { _count: { select: { acknowledgements: true } } },
  });
  if (!row) {
    return NextResponse.json({ ok: false, message: "Policy not found." }, { status: 404 });
  }

  const [acknowledgements, history] = await Promise.all([
    prisma.compliancePolicyAcknowledgement.findMany({
      where: { policyId: id },
      orderBy: { acknowledgedAt: "desc" },
      take: 50,
      select: { id: true, userId: true, version: true, acknowledgedAt: true },
    }),
    prisma.complianceActivityLog.findMany({
      where: { organizationId, entityType: "policy", entityId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, action: true, actorName: true, metadata: true, createdAt: true },
    }),
  ]);

  const owner = await loadOwner(row.ownerUserId);
  const approver = row.approvedBy ? await loadOwner(row.approvedBy) : null;
  const base = serializePolicy({ ...row, owner });
  return NextResponse.json({
    ok: true,
    item: {
      ...base,
      category: policyCategoryFromTitle(base.title),
      frameworks: policyFrameworksFromTitle(base.title),
      lastReviewedAt: row.approvedAt?.toISOString() ?? row.publishedAt?.toISOString() ?? row.updatedAt?.toISOString() ?? null,
      approvedByName: approver?.name ?? approver?.email ?? null,
    },
    relatedCounts: policyRelatedCounts(Number(row.id)),
    acknowledgementTarget: policyAcknowledgementTarget(base.acknowledgementCount),
    acknowledgements: acknowledgements.map((a) => ({
      id: Number(a.id),
      userId: Number(a.userId),
      version: a.version,
      acknowledgedAt: a.acknowledgedAt.toISOString(),
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
  const gate = await requireComplianceApiAccess(req, "manage-compliance-policies");
  if (!gate.ok) return gate.response;

  const { id: idRaw } = await ctx.params;
  const id = BigInt(idRaw);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const existing = await prisma.compliancePolicy.findFirst({
    where: { id, organizationId: gate.actor.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Policy not found." }, { status: 404 });
  }

  const data: Record<string, unknown> = { updatedAt: new Date() };
  if (body.title != null) data.title = String(body.title).trim();
  if (body.content != null) data.content = String(body.content).trim() || null;
  if (body.status != null) data.status = String(body.status).trim();
  if (body.version != null) data.version = String(body.version).trim();
  if (body.ownerUserId !== undefined) {
    data.ownerUserId = body.ownerUserId ? BigInt(Number(body.ownerUserId)) : null;
  }
  if (body.reviewDueAt !== undefined) {
    data.reviewDueAt = body.reviewDueAt ? new Date(String(body.reviewDueAt)) : null;
  }
  if (body.acknowledgementRequired !== undefined) {
    data.acknowledgementRequired = Boolean(body.acknowledgementRequired);
  }

  const archive = body.action === "archive" || body.archive === true;
  if (archive) {
    data.status = "archived";
  }

  const publish = body.action === "publish" || body.publish === true;
  const approve = body.action === "approve" || body.approve === true;
  const newVersion = body.action === "new_version" || body.newVersion === true;
  if (publish) {
    data.status = "published";
    data.publishedAt = new Date();
  }
  if (approve) {
    data.approvedBy = gate.actor.userId;
    data.approvedAt = new Date();
    if (data.status == null && existing.status === "draft") data.status = "in_review";
  }
  if (newVersion) {
    const parts = existing.version.split(".");
    const minor = Number(parts[1] ?? 0) + 1;
    data.version = `${parts[0]}.${minor}`;
    data.status = "draft";
    data.publishedAt = null;
    data.approvedAt = null;
    data.approvedBy = null;
  }

  const row = await prisma.compliancePolicy.update({
    where: { id },
    data,
    include: { _count: { select: { acknowledgements: true } } },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: archive
      ? "policy_archived"
      : publish
      ? "policy_published"
      : approve
        ? "policy_approved"
        : newVersion
          ? "policy_versioned"
          : "policy_updated",
    entityType: "policy",
    entityId: id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
    metadata: { version: row.version },
  });

  const owner = await loadOwner(row.ownerUserId);
  return NextResponse.json({ ok: true, item: serializePolicy({ ...row, owner }) });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-policies");
  if (!gate.ok) return gate.response;

  const { id: idRaw } = await ctx.params;
  const id = BigInt(idRaw);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  if (body.action !== "acknowledge") {
    return NextResponse.json({ ok: false, message: "Unsupported action." }, { status: 400 });
  }

  const policy = await prisma.compliancePolicy.findFirst({
    where: { id, organizationId: gate.actor.organizationId },
  });
  if (!policy) {
    return NextResponse.json({ ok: false, message: "Policy not found." }, { status: 404 });
  }

  const ack = await prisma.compliancePolicyAcknowledgement.upsert({
    where: {
      policyId_userId_version: {
        policyId: id,
        userId: gate.actor.userId,
        version: policy.version,
      },
    },
    create: {
      organizationId: gate.actor.organizationId,
      policyId: id,
      userId: gate.actor.userId,
      version: policy.version,
    },
    update: { acknowledgedAt: new Date() },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: "policy_acknowledged",
    entityType: "policy",
    entityId: id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
    metadata: { version: policy.version },
  });

  return NextResponse.json({
    ok: true,
    acknowledgement: {
      id: Number(ack.id),
      userId: Number(ack.userId),
      version: ack.version,
      acknowledgedAt: ack.acknowledgedAt.toISOString(),
    },
  });
}
