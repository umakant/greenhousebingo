import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import {
  monitorDescription,
  monitorDisplayStatus,
  monitorFrameworksFromName,
  monitorIntegrationFromName,
  monitorNextRunAt,
  monitorRelatedCounts,
  monitorRiskLevel,
  scheduleFrequencyLabel,
  slaLabel,
} from "@/lib/compliance/compliance-monitors";
import {
  loadOwner,
  logComplianceActivity,
  refreshMonitor,
  serializeMonitor,
} from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function enrichDetail(
  base: ReturnType<typeof serializeMonitor>,
  row: { description: string | null; lastRunAt: Date | null },
  ownerName: string | null,
) {
  const displayStatus = monitorDisplayStatus({
    latestResultStatus: base.latestResult?.status,
    remediationStatus: base.remediationStatus,
    lastRunAt: base.lastRunAt,
    slaHours: base.slaHours,
  });
  const risk = monitorRiskLevel(displayStatus);
  return {
    ...base,
    ownerName,
    description: monitorDescription(base.name, row.description),
    integration: monitorIntegrationFromName(base.name),
    frequency: scheduleFrequencyLabel(base.schedule),
    slaLabel: slaLabel(base.slaHours),
    displayStatus,
    frameworks: monitorFrameworksFromName(base.name),
    nextRunAt: monitorNextRunAt(base.lastRunAt, base.schedule),
    riskLabel: risk.label,
    riskTone: risk.tone,
  };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-monitors");
  if (!gate.ok) return gate.response;

  const { id: idRaw } = await ctx.params;
  const id = BigInt(idRaw);
  const { organizationId } = gate.actor;

  const row = await prisma.complianceMonitor.findFirst({
    where: { id, organizationId },
    include: { results: { orderBy: { ranAt: "desc" }, take: 30 } },
  });
  if (!row) {
    return NextResponse.json({ ok: false, message: "Monitor not found." }, { status: 404 });
  }

  const owner = row.ownerUserId ? await loadOwner(row.ownerUserId) : null;
  const ownerName = owner?.name ?? owner?.email ?? gate.actor.name;
  const base = serializeMonitor({ ...row, owner }, row.results[0] ?? null);

  const history = await prisma.complianceActivityLog.findMany({
    where: { organizationId, entityType: "monitor", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, action: true, actorName: true, metadata: true, createdAt: true },
  });

  return NextResponse.json({
    ok: true,
    item: enrichDetail(base, row, ownerName),
    relatedCounts: monitorRelatedCounts(Number(row.id)),
    results: row.results.map((r) => ({
      id: Number(r.id),
      status: r.status,
      summary: r.summary,
      ranAt: r.ranAt.toISOString(),
      details: r.details,
    })),
    remediation: row.remediationStatus
      ? {
          status: row.remediationStatus,
          summary:
            row.remediationStatus === "open"
              ? "Remediation required — assign an owner and resolve the failing check."
              : "No open remediation items.",
        }
      : null,
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
  const gate = await requireComplianceApiAccess(req, "manage-compliance-monitors");
  if (!gate.ok) return gate.response;

  const { id: idRaw } = await ctx.params;
  const id = BigInt(idRaw);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const existing = await prisma.complianceMonitor.findFirst({
    where: { id, organizationId: gate.actor.organizationId },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Monitor not found." }, { status: 404 });
  }

  const data: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status != null) data.status = String(body.status).trim();
  if (body.schedule != null) data.schedule = String(body.schedule).trim() || null;
  if (body.category != null) data.category = String(body.category).trim() || null;
  if (body.description != null) data.description = String(body.description).trim() || null;
  if (body.slaHours != null) data.slaHours = Number(body.slaHours) || null;
  if (body.ownerUserId !== undefined) {
    data.ownerUserId = body.ownerUserId ? BigInt(Number(body.ownerUserId)) : null;
  }
  if (body.remediationStatus != null) {
    data.remediationStatus = String(body.remediationStatus).trim() || null;
  }

  const row = await prisma.complianceMonitor.update({
    where: { id },
    data,
    include: { results: { orderBy: { ranAt: "desc" }, take: 1 } },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: "monitor_updated",
    entityType: "monitor",
    entityId: id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
  });

  const owner = await loadOwner(row.ownerUserId);
  const ownerName = owner?.name ?? owner?.email ?? gate.actor.name;
  const base = serializeMonitor({ ...row, owner }, row.results[0] ?? null);
  return NextResponse.json({ ok: true, item: enrichDetail(base, row, ownerName) });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-monitors");
  if (!gate.ok) return gate.response;

  const { id: idRaw } = await ctx.params;
  const id = BigInt(idRaw);
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  if (body.action !== "refresh") {
    return NextResponse.json({ ok: false, message: "Unsupported action." }, { status: 400 });
  }

  const result = await refreshMonitor(gate.actor.organizationId, id);
  if (!result) {
    return NextResponse.json({ ok: false, message: "Monitor not found." }, { status: 404 });
  }

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: "monitor_refreshed",
    entityType: "monitor",
    entityId: id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
    metadata: { status: result.status },
  });

  const row = await prisma.complianceMonitor.findFirst({
    where: { id, organizationId: gate.actor.organizationId },
    include: { results: { orderBy: { ranAt: "desc" }, take: 1 } },
  });

  const owner = row?.ownerUserId ? await loadOwner(row.ownerUserId) : null;
  const ownerName = owner?.name ?? owner?.email ?? gate.actor.name;
  return NextResponse.json({
    ok: true,
    result: {
      id: Number(result.id),
      status: result.status,
      summary: result.summary,
      ranAt: result.ranAt.toISOString(),
    },
    item: row ? enrichDetail(serializeMonitor({ ...row, owner }, row.results[0] ?? null), row, ownerName) : null,
  });
}
