import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import type { ControlRelations } from "@/lib/compliance/compliance-service";
import { loadOwner, logComplianceActivity, serializeControl } from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-controls");
  if (!gate.ok) return gate.response;

  const { id: idRaw } = await ctx.params;
  const id = BigInt(idRaw);
  const { organizationId } = gate.actor;

  const row = await prisma.complianceControl.findFirst({
    where: { id, organizationId },
    include: {
      framework: { select: { id: true, code: true, name: true } },
      _count: { select: { evidence: true, mappings: true } },
      mappings: { include: { framework: { select: { id: true, code: true, name: true } } } },
      evidence: { orderBy: { createdAt: "desc" }, take: 20 },
      remediations: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!row) {
    return NextResponse.json({ ok: false, message: "Control not found." }, { status: 404 });
  }

  const owner = await loadOwner(row.ownerUserId);
  const item = serializeControl({ ...row, owner });

  const rel = item.relations;
  const [policies, risks, vendors, monitors] = await Promise.all([
    rel.policyIds?.length
      ? prisma.compliancePolicy.findMany({
          where: { organizationId, id: { in: rel.policyIds.map((n) => BigInt(n)) } },
          select: { id: true, title: true, status: true, version: true },
        })
      : [],
    rel.riskIds?.length
      ? prisma.complianceRisk.findMany({
          where: { organizationId, id: { in: rel.riskIds.map((n) => BigInt(n)) } },
          select: { id: true, title: true, severity: true, status: true },
        })
      : [],
    rel.vendorReviewIds?.length
      ? prisma.complianceVendorReview.findMany({
          where: { organizationId, id: { in: rel.vendorReviewIds.map((n) => BigInt(n)) } },
          select: { id: true, vendorName: true, reviewStatus: true, riskTier: true },
        })
      : [],
    rel.monitorIds?.length
      ? prisma.complianceMonitor.findMany({
          where: { organizationId, id: { in: rel.monitorIds.map((n) => BigInt(n)) } },
          select: { id: true, name: true, status: true, category: true },
        })
      : [],
  ]);

  const history = await prisma.complianceActivityLog.findMany({
    where: { organizationId, entityType: "control", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, action: true, actorName: true, metadata: true, createdAt: true },
  });

  return NextResponse.json({
    ok: true,
    item,
    frameworkMappings: row.mappings.map((m) => ({
      frameworkId: Number(m.frameworkId),
      frameworkCode: m.framework.code,
      frameworkName: m.framework.name,
      mappedControlCode: m.mappedControlCode,
    })),
    evidence: row.evidence.map((e) => ({
      id: Number(e.id),
      title: e.title,
      status: e.status,
      evidenceType: e.evidenceType,
      expiresAt: e.expiresAt?.toISOString() ?? null,
    })),
    related: {
      policies: policies.map((p) => ({ id: Number(p.id), title: p.title, status: p.status, version: p.version })),
      risks: risks.map((r) => ({ id: Number(r.id), title: r.title, severity: r.severity, status: r.status })),
      vendors: vendors.map((v) => ({
        id: Number(v.id),
        vendorName: v.vendorName,
        reviewStatus: v.reviewStatus,
        riskTier: v.riskTier,
      })),
      monitors: monitors.map((m) => ({
        id: Number(m.id),
        name: m.name,
        status: m.status,
        category: m.category,
      })),
    },
    remediations: row.remediations.map((r) => ({
      id: Number(r.id),
      status: r.status,
      summary: r.summary,
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
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
  const gate = await requireComplianceApiAccess(req, "manage-compliance-controls");
  if (!gate.ok) return gate.response;

  const { id: idRaw } = await ctx.params;
  const id = BigInt(idRaw);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const existing = await prisma.complianceControl.findFirst({
    where: { id, organizationId: gate.actor.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Control not found." }, { status: 404 });
  }

  const data: Prisma.ComplianceControlUpdateInput = { updatedAt: new Date() };
  if (body.status != null) data.status = String(body.status).trim();
  if (body.title != null) data.title = String(body.title).trim();
  if (body.description != null) data.description = String(body.description).trim() || null;
  if (body.category != null) data.category = String(body.category).trim() || null;
  if (body.ownerUserId !== undefined) {
    data.ownerUserId = body.ownerUserId ? BigInt(Number(body.ownerUserId)) : null;
  }
  if (body.testSchedule != null) data.testSchedule = String(body.testSchedule).trim() || null;
  if (body.nextTestAt !== undefined) {
    data.nextTestAt = body.nextTestAt ? new Date(String(body.nextTestAt)) : null;
  }
  if (body.evidenceRequired !== undefined) data.evidenceRequired = Boolean(body.evidenceRequired);
  if (body.relations != null) data.relations = body.relations as Prisma.InputJsonValue;
  if (body.frameworkId !== undefined) {
    data.framework = body.frameworkId
      ? { connect: { id: BigInt(Number(body.frameworkId)) } }
      : { disconnect: true };
  }

  const row = await prisma.complianceControl.update({
    where: { id },
    data,
    include: {
      framework: { select: { id: true, code: true, name: true } },
      _count: { select: { evidence: true, mappings: true } },
    },
  });

  if (body.remediationSummary) {
    await prisma.complianceControlRemediation.create({
      data: {
        organizationId: gate.actor.organizationId,
        controlId: id,
        status: String(body.remediationStatus ?? "open").trim() || "open",
        summary: String(body.remediationSummary).trim(),
        createdBy: gate.actor.userId,
      },
    });
    await logComplianceActivity({
      organizationId: gate.actor.organizationId,
      action: "control_remediation",
      entityType: "control",
      entityId: id,
      actorUserId: gate.actor.userId,
      actorName: gate.actor.name,
      metadata: { summary: body.remediationSummary },
    });
  } else {
    await logComplianceActivity({
      organizationId: gate.actor.organizationId,
      action: "control_updated",
      entityType: "control",
      entityId: id,
      actorUserId: gate.actor.userId,
      actorName: gate.actor.name,
    });
  }

  const owner = await loadOwner(row.ownerUserId);
  return NextResponse.json({ ok: true, item: serializeControl({ ...row, owner }) });
}
