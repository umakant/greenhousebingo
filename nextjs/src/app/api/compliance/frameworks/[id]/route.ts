import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import {
  computeFrameworkReadiness,
  loadOwner,
  logComplianceActivity,
  serializeFramework,
} from "@/lib/compliance/compliance-service";
import { COMPLIANCE_FRAMEWORK_TABLE_STATS } from "@/lib/compliance/compliance-frameworks";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-frameworks");
  if (!gate.ok) return gate.response;

  const { id: idRaw } = await ctx.params;
  const id = BigInt(idRaw);
  const { organizationId } = gate.actor;

  const row = await prisma.complianceFramework.findFirst({
    where: { id, organizationId },
    include: {
      _count: { select: { controls: true, mappings: true } },
      mappings: {
        include: {
          control: {
            select: {
              id: true,
              controlCode: true,
              title: true,
              status: true,
              category: true,
              _count: { select: { evidence: true } },
            },
          },
        },
      },
    },
  });
  if (!row) {
    return NextResponse.json({ ok: false, message: "Framework not found." }, { status: 404 });
  }

  const readiness = await computeFrameworkReadiness(organizationId, id);
  const owner = await loadOwner(row.ownerUserId);

  const controlIds = row.mappings.map((m) => m.controlId);
  const evidence = controlIds.length
    ? await prisma.complianceEvidence.findMany({
        where: { organizationId, controlId: { in: controlIds } },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          status: true,
          controlId: true,
          expiresAt: true,
          auditorVisible: true,
        },
      })
    : [];

  const risks = await prisma.complianceRisk.findMany({
    where: { organizationId, status: "open" },
    orderBy: { severity: "desc" },
    take: 20,
    select: { id: true, title: true, severity: true, status: true },
  });

  const history = await prisma.complianceActivityLog.findMany({
    where: { organizationId, entityType: "framework", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, action: true, actorName: true, metadata: true, createdAt: true },
  });

  const now = new Date();
  const nextAudit = await prisma.complianceAudit.findFirst({
    where: { organizationId, frameworkId: id },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      name: true,
      auditType: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  });
  const auditDaysRemaining =
    nextAudit?.endDate && nextAudit.endDate >= now
      ? Math.ceil((nextAudit.endDate.getTime() - now.getTime()) / 86400000)
      : null;

  const tableStats =
    COMPLIANCE_FRAMEWORK_TABLE_STATS[row.code as keyof typeof COMPLIANCE_FRAMEWORK_TABLE_STATS];

  return NextResponse.json({
    ok: true,
    item: serializeFramework({ ...row, owner }, {
      ...readiness,
      readinessScore: row.auditReadyPct,
      controlCount: tableStats?.controlTotal ?? readiness.controlCount,
      evidenceCount: tableStats?.evidenceCount ?? readiness.evidenceCount,
      controlsImplemented: tableStats?.controlImplemented ?? readiness.implemented,
    }),
    controls: row.mappings.map((m) => ({
      id: Number(m.control.id),
      controlCode: m.control.controlCode,
      title: m.control.title,
      status: m.control.status,
      category: m.control.category,
      mappedControlCode: m.mappedControlCode,
      evidenceCount: m.control._count.evidence,
    })),
    evidence: evidence.map((e) => ({
      id: Number(e.id),
      title: e.title,
      status: e.status,
      controlId: e.controlId ? Number(e.controlId) : null,
      expiresAt: e.expiresAt?.toISOString() ?? null,
      auditorVisible: e.auditorVisible,
    })),
    risks: risks.map((r) => ({
      id: Number(r.id),
      title: r.title,
      severity: r.severity,
      status: r.status,
    })),
    history: history.map((h) => ({
      id: Number(h.id),
      action: h.action,
      actorName: h.actorName,
      metadata: h.metadata,
      createdAt: h.createdAt.toISOString(),
    })),
    nextAudit: nextAudit
      ? {
          id: Number(nextAudit.id),
          name: nextAudit.name,
          auditType: nextAudit.auditType,
          startDate: nextAudit.startDate?.toISOString().slice(0, 10) ?? null,
          endDate: nextAudit.endDate?.toISOString().slice(0, 10) ?? null,
          status: nextAudit.status,
          daysRemaining: auditDaysRemaining,
        }
      : null,
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-frameworks");
  if (!gate.ok) return gate.response;

  const { id: idRaw } = await ctx.params;
  const id = BigInt(idRaw);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const existing = await prisma.complianceFramework.findFirst({
    where: { id, organizationId: gate.actor.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Framework not found." }, { status: 404 });
  }

  const data: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status != null) data.status = String(body.status).trim();
  if (body.description != null) data.description = String(body.description).trim() || null;
  if (body.progressPct != null) data.progressPct = Math.max(0, Math.min(100, Number(body.progressPct) || 0));
  if (body.auditReadyPct != null) data.auditReadyPct = Math.max(0, Math.min(100, Number(body.auditReadyPct) || 0));
  if (body.ownerUserId !== undefined) {
    data.ownerUserId = body.ownerUserId ? BigInt(Number(body.ownerUserId)) : null;
  }
  if (body.iconUrl !== undefined) {
    const raw = body.iconUrl === null ? null : String(body.iconUrl).trim();
    if (raw && raw.length > 2048) {
      return NextResponse.json({ ok: false, message: "Icon URL is too long." }, { status: 400 });
    }
    if (raw && !/^https?:\/\//i.test(raw) && !raw.startsWith("/uploads/")) {
      return NextResponse.json({ ok: false, message: "Icon URL must be http(s) or an uploaded path." }, { status: 400 });
    }
    data.iconUrl = raw || null;
  }

  const row = await prisma.complianceFramework.update({
    where: { id },
    data,
    include: { _count: { select: { controls: true, mappings: true } } },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action:
      body.iconUrl !== undefined
        ? "framework_icon_updated"
        : body.ownerUserId !== undefined
          ? "framework_owner_assigned"
          : "framework_updated",
    entityType: "framework",
    entityId: id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
    metadata: {
      ownerUserId: body.ownerUserId ?? null,
      iconUrl: body.iconUrl !== undefined ? data.iconUrl ?? null : undefined,
    },
  });

  const owner = await loadOwner(row.ownerUserId);
  const readiness = await computeFrameworkReadiness(gate.actor.organizationId, id);
  return NextResponse.json({ ok: true, item: serializeFramework({ ...row, owner }, readiness) });
}
