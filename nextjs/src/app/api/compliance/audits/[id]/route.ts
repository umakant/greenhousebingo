import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import type { AuditMetadata } from "@/lib/compliance/compliance-day2";
import {
  auditDisplayStatus,
  auditMilestones,
  auditProgressPct,
  auditScope,
  auditSubtitle,
  auditTaskBreakdown,
  auditTypeCategory,
  auditTypeLabel,
  auditorDisplay,
  daysUntilEnd,
} from "@/lib/compliance/compliance-audits";
import { logComplianceActivity, serializeAudit } from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function newId() {
  return `${Date.now()}-${randomBytes(4).toString("hex")}`;
}

function enrichDetail(base: ReturnType<typeof serializeAudit>) {
  const displayStatus = auditDisplayStatus(base.status, base.startDate, base.endDate);
  const auditor = auditorDisplay(base.auditorName, base.id, base.auditType);
  const progressPct = auditProgressPct(base.status, displayStatus, base.id);
  const tasks = auditTaskBreakdown(base.id, displayStatus);
  return {
    ...base,
    typeLabel: auditTypeLabel(base.auditType),
    typeCategory: auditTypeCategory(base.auditType),
    displayStatus,
    subtitle: auditSubtitle(base.name, base.frameworkName, base.auditType),
    scope: auditScope(base.id, base.auditType, base.frameworkName),
    auditorPersonName: auditor.personName,
    auditorCompanyName: auditor.companyName,
    progressPct,
    endIn: daysUntilEnd(base.endDate),
    milestones: auditMilestones(base.startDate, base.endDate, base.status, base.id),
    taskBreakdown: tasks,
    findingsCount: (base.findings ?? []).length,
    requestsCount: (base.requests ?? []).length,
    evidencePackagesCount: (base.evidencePackages ?? []).length,
  };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-audits");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const row = await prisma.complianceAudit.findFirst({
    where: { id: BigInt(id), organizationId: gate.actor.organizationId },
    include: { framework: { select: { id: true, code: true, name: true } } },
  });
  if (!row) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const [invites, history] = await Promise.all([
    prisma.complianceAuditorInvite.findMany({
      where: { organizationId: gate.actor.organizationId, auditId: row.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.complianceActivityLog.findMany({
      where: { organizationId: gate.actor.organizationId, entityType: "audit", entityId: row.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, action: true, actorName: true, metadata: true, createdAt: true },
    }),
  ]);

  const item = enrichDetail(serializeAudit(row));

  return NextResponse.json({
    ok: true,
    item,
    auditorInvites: invites.map((i) => ({
      id: Number(i.id),
      auditorName: i.auditorName,
      auditorEmail: i.auditorEmail,
      token: i.token,
      expiresAt: i.expiresAt?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
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
  const gate = await requireComplianceApiAccess(req, "manage-compliance-audits");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const existing = await prisma.complianceAudit.findFirst({
    where: { id: BigInt(id), organizationId: gate.actor.organizationId },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const prevMeta = (existing.metadata ?? {}) as AuditMetadata;
  const metadata: AuditMetadata = { ...prevMeta };

  if (body.addFinding && typeof body.addFinding === "object") {
    const f = body.addFinding as Record<string, unknown>;
    metadata.findings = [
      ...(metadata.findings ?? []),
      {
        id: newId(),
        title: String(f.title ?? "Finding").trim(),
        severity: String(f.severity ?? "medium").trim(),
        status: String(f.status ?? "open").trim(),
        description: String(f.description ?? "").trim() || undefined,
      },
    ];
  }
  if (body.addRequest && typeof body.addRequest === "object") {
    const r = body.addRequest as Record<string, unknown>;
    metadata.requests = [
      ...(metadata.requests ?? []),
      {
        id: newId(),
        title: String(r.title ?? "Evidence request").trim(),
        status: "open",
        requestedAt: new Date().toISOString(),
        notes: String(r.notes ?? "").trim() || undefined,
      },
    ];
  }
  if (body.addEvidencePackage && typeof body.addEvidencePackage === "object") {
    const p = body.addEvidencePackage as Record<string, unknown>;
    metadata.evidencePackages = [
      ...(metadata.evidencePackages ?? []),
      {
        id: newId(),
        name: String(p.name ?? "Evidence package").trim(),
        documentIds: Array.isArray(p.documentIds) ? p.documentIds.map((x) => Number(x)) : [],
        evidenceIds: Array.isArray(p.evidenceIds) ? p.evidenceIds.map((x) => Number(x)) : [],
      },
    ];
  }
  if (body.finalReportUrl !== undefined) {
    metadata.finalReportUrl = String(body.finalReportUrl).trim() || undefined;
  }
  if (body.findings !== undefined) metadata.findings = body.findings as AuditMetadata["findings"];
  if (body.requests !== undefined) metadata.requests = body.requests as AuditMetadata["requests"];
  if (body.evidencePackages !== undefined) {
    metadata.evidencePackages = body.evidencePackages as AuditMetadata["evidencePackages"];
  }

  const row = await prisma.complianceAudit.update({
    where: { id: existing.id },
    data: {
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.frameworkId !== undefined
        ? { frameworkId: body.frameworkId ? BigInt(Number(body.frameworkId)) : null }
        : {}),
      ...(body.auditType !== undefined ? { auditType: String(body.auditType).trim() } : {}),
      ...(body.status !== undefined ? { status: String(body.status).trim() } : {}),
      ...(body.auditorName !== undefined ? { auditorName: String(body.auditorName).trim() || null } : {}),
      ...(body.startDate !== undefined ? { startDate: body.startDate ? new Date(String(body.startDate)) : null } : {}),
      ...(body.endDate !== undefined ? { endDate: body.endDate ? new Date(String(body.endDate)) : null } : {}),
      metadata: metadata as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
    include: { framework: { select: { id: true, code: true, name: true } } },
  });

  let auditorInvite = null;
  if (body.inviteAuditor && typeof body.inviteAuditor === "object") {
    const inv = body.inviteAuditor as Record<string, unknown>;
    const token = randomBytes(24).toString("hex");
    const invite = await prisma.complianceAuditorInvite.create({
      data: {
        organizationId: gate.actor.organizationId,
        auditId: row.id,
        token,
        auditorName: String(inv.auditorName ?? "Auditor").trim(),
        auditorEmail: String(inv.auditorEmail ?? "").trim() || null,
        expiresAt: inv.expiresAt ? new Date(String(inv.expiresAt)) : new Date(Date.now() + 90 * 86400000),
      },
    });
    await prisma.complianceTrustCenter.upsert({
      where: { organizationId: gate.actor.organizationId },
      create: {
        organizationId: gate.actor.organizationId,
        auditorPortalEnabled: true,
        activeAuditors: 1,
      },
      update: {
        auditorPortalEnabled: true,
        activeAuditors: { increment: 1 },
        updatedAt: new Date(),
      },
    });
    auditorInvite = {
      id: Number(invite.id),
      token: invite.token,
      auditorName: invite.auditorName,
      portalUrl: `/auditor/${invite.token}`,
    };
  }

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: "audit_updated",
    entityType: "audit",
    entityId: row.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
  });

  return NextResponse.json({ ok: true, item: enrichDetail(serializeAudit(row)), auditorInvite });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-audits");
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const existing = await prisma.complianceAudit.findFirst({
    where: { id: BigInt(id), organizationId: gate.actor.organizationId },
  });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  await prisma.complianceAudit.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
