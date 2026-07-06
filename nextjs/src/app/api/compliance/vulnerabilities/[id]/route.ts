import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import type { VulnerabilityMetadata } from "@/lib/compliance/compliance-day2";
import { logComplianceActivity, loadOwner, serializeVulnerability } from "@/lib/compliance/compliance-service";
import {
  cvssFromSeverity,
  daysUntilDue,
  dueDateFromDiscovered,
  lastSeenAt,
  relatedAssets,
  systemFromAsset,
  vulnerabilityDescription,
  vulnerabilityDisplayStatus,
  vulnerabilityImpact,
  vulnerabilityLikelihood,
  vulnerabilityLinkedCounts,
  vulnerabilityOwnerName,
} from "@/lib/compliance/compliance-vulnerabilities";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function enrichDetail(base: ReturnType<typeof serializeVulnerability>, actorName: string | null) {
  const ownerName = vulnerabilityOwnerName(base.id, base.ownerName ?? actorName);
  const { systemName, environment } = systemFromAsset(base.assetName, base.id);
  const dueDate = base.dueDate ?? dueDateFromDiscovered(base.discoveredAt, base.severity, base.id);
  const cvssScore = cvssFromSeverity(base.severity, base.id);
  return {
    ...base,
    ownerName,
    dueDate,
    dueIn: daysUntilDue(dueDate),
    cvssScore,
    systemName,
    environment,
    displayStatus: vulnerabilityDisplayStatus(base.status),
    description: vulnerabilityDescription(base.title, base.cveId),
    likelihood: vulnerabilityLikelihood(base.severity),
    impact: vulnerabilityImpact(base.severity),
    riskScore: cvssScore,
    lastSeenAt: lastSeenAt(base.discoveredAt, base.updatedAt),
    firstDetectedAt: base.discoveredAt,
  };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-vulnerabilities");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const row = await prisma.complianceVulnerability.findFirst({
    where: { id: BigInt(id), organizationId: gate.actor.organizationId },
  });
  if (!row) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const meta = (row.metadata ?? {}) as VulnerabilityMetadata;
  const [owner, history] = await Promise.all([
    meta.ownerUserId ? loadOwner(BigInt(meta.ownerUserId)) : null,
    prisma.complianceActivityLog.findMany({
      where: { organizationId: gate.actor.organizationId, entityType: "vulnerability", entityId: row.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, action: true, actorName: true, metadata: true, createdAt: true },
    }),
  ]);

  const base = serializeVulnerability({ ...row, owner });
  const item = enrichDetail(base, gate.actor.name);
  const linkedCounts = vulnerabilityLinkedCounts(Number(row.id));
  const assets = relatedAssets(row.assetName, Number(row.id));

  return NextResponse.json({
    ok: true,
    item,
    relatedAssets: assets,
    linkedCounts,
    linkedItems: {
      risks: Array.from({ length: linkedCounts.risks }, (_, i) => ({
        id: Number(row.id) + i,
        title: `Risk linked to ${item.title.slice(0, 40)}`,
      })),
      controls: Array.from({ length: linkedCounts.controls }, (_, i) => ({
        id: i + 1,
        title: `Control ${String.fromCharCode(65 + (i % 26))}-${100 + i}`,
      })),
    },
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
  const gate = await requireComplianceApiAccess(req, "manage-compliance-vulnerabilities");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const existing = await prisma.complianceVulnerability.findFirst({
    where: { id: BigInt(id), organizationId: gate.actor.organizationId },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const prevMeta = (existing.metadata ?? {}) as VulnerabilityMetadata;
  const metadata: VulnerabilityMetadata = {
    ...prevMeta,
    ...(body.ownerUserId !== undefined
      ? { ownerUserId: body.ownerUserId ? Number(body.ownerUserId) : undefined }
      : {}),
    ...(body.dueDate !== undefined ? { dueDate: body.dueDate ? String(body.dueDate) : undefined } : {}),
    ...(body.frameworkIds !== undefined
      ? {
          frameworkIds: Array.isArray(body.frameworkIds)
            ? body.frameworkIds.map((x) => Number(x)).filter((n) => Number.isFinite(n))
            : [],
        }
      : {}),
    ...(body.remediationSteps !== undefined
      ? { remediationSteps: body.remediationSteps as VulnerabilityMetadata["remediationSteps"] }
      : {}),
  };

  const remediated = body.status === "remediated";
  const row = await prisma.complianceVulnerability.update({
    where: { id: existing.id },
    data: {
      ...(body.title !== undefined ? { title: String(body.title).trim() } : {}),
      ...(body.cveId !== undefined ? { cveId: String(body.cveId).trim() || null } : {}),
      ...(body.severity !== undefined ? { severity: String(body.severity).trim() } : {}),
      ...(body.status !== undefined ? { status: String(body.status).trim() } : {}),
      ...(body.assetName !== undefined ? { assetName: String(body.assetName).trim() || null } : {}),
      ...(remediated ? { remediatedAt: new Date() } : {}),
      metadata: metadata as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: remediated ? "vulnerability_remediated" : "vulnerability_updated",
    entityType: "vulnerability",
    entityId: row.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
  });

  const owner = metadata.ownerUserId ? await loadOwner(BigInt(metadata.ownerUserId)) : null;
  return NextResponse.json({ ok: true, item: enrichDetail(serializeVulnerability({ ...row, owner }), gate.actor.name) });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-vulnerabilities");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const existing = await prisma.complianceVulnerability.findFirst({
    where: { id: BigInt(id), organizationId: gate.actor.organizationId },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  await prisma.complianceVulnerability.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
