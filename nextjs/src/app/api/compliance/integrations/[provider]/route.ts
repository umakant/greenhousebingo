import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import { integrationProviderMeta, parseIntegrationConfig } from "@/lib/compliance/compliance-day4";
import {
  accountSubtitle,
  categoryLabel,
  connectedAccountEmail,
  dataCoverage,
  integrationAccessRole,
  integrationDisplayStatus,
  integrationOwner,
  integrationSyncMode,
  integrationTip,
  nextSyncIn,
  syncHealth,
  systemUseCase,
} from "@/lib/compliance/compliance-integrations";
import { logComplianceActivity, serializeIntegration } from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ provider: string }> };

function enrichDetail(
  base: ReturnType<typeof serializeIntegration>,
  connectedBy?: string,
) {
  const displayStatus = integrationDisplayStatus(base.status);
  return {
    ...base,
    categoryLabel: categoryLabel(base.category),
    accountSubtitle: accountSubtitle(base.provider),
    systemUseCase: systemUseCase(base.provider, base.category),
    displayStatus,
    syncMode: integrationSyncMode(displayStatus),
    ownerName: integrationOwner(base.provider, base.id),
    connectedAccount: connectedAccountEmail(base.provider, connectedBy, base.id),
    connectedOn: base.createdAt,
    accessRole: integrationAccessRole(base.provider),
    nextSyncIn: nextSyncIn(base.lastSyncAt, displayStatus),
    syncHealth: syncHealth(base.provider, base.id, displayStatus),
    coverage: dataCoverage(base.provider, base.id),
    tip: integrationTip(base.provider),
  };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-integrations");
  if (!gate.ok) return gate.response;

  const { provider } = await ctx.params;
  const row = await prisma.complianceIntegration.findFirst({
    where: { organizationId: gate.actor.organizationId, provider },
  });
  const meta = integrationProviderMeta(provider);
  if (!row && !meta) {
    return NextResponse.json({ ok: false, message: "Unknown provider." }, { status: 404 });
  }
  if (!row) {
    return NextResponse.json({
      ok: true,
      item: enrichDetail({
        id: 0,
        provider,
        providerName: meta?.name ?? provider,
        category: meta?.category ?? "other",
        status: "disconnected",
        lastSyncAt: null,
        controlsSupported: meta?.controlsSupported ?? [],
        monitorsSupported: meta?.monitorsSupported ?? [],
        scope: meta?.defaultScope ?? {},
        syncLogs: [],
        credentialsConfigured: false,
        createdAt: null,
        updatedAt: null,
      }),
    });
  }
  const config = parseIntegrationConfig(row.config);
  return NextResponse.json({ ok: true, item: enrichDetail(serializeIntegration(row), config.connectedBy) });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-integrations");
  if (!gate.ok) return gate.response;

  const { provider } = await ctx.params;
  const existing = await prisma.complianceIntegration.findFirst({
    where: { organizationId: gate.actor.organizationId, provider },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Connect integration first." }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const prev = parseIntegrationConfig(existing.config);
  const config = {
    ...prev,
    ...(body.scope && typeof body.scope === "object"
      ? { scope: body.scope as Record<string, unknown> }
      : {}),
    ...(body.credentialsConfigured !== undefined
      ? { credentialsConfigured: Boolean(body.credentialsConfigured) }
      : {}),
  };

  const row = await prisma.complianceIntegration.update({
    where: { id: existing.id },
    data: {
      ...(body.status !== undefined ? { status: String(body.status).trim() } : {}),
      config: config as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    item: enrichDetail(serializeIntegration(row), config.connectedBy),
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-integrations");
  if (!gate.ok) return gate.response;

  const { provider } = await ctx.params;
  const existing = await prisma.complianceIntegration.findFirst({
    where: { organizationId: gate.actor.organizationId, provider },
  });
  if (!existing || existing.status !== "connected") {
    return NextResponse.json({ ok: false, message: "Integration not connected." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? "sync").trim();
  const prev = parseIntegrationConfig(existing.config);
  const syncLogs = [...(prev.syncLogs ?? [])];

  if (action === "disconnect") {
    await prisma.complianceIntegration.update({
      where: { id: existing.id },
      data: { status: "disconnected", updatedAt: new Date() },
    });
    await logComplianceActivity({
      organizationId: gate.actor.organizationId,
      action: "integration_disconnected",
      entityType: "integration",
      entityId: existing.id,
      actorUserId: gate.actor.userId,
      actorName: gate.actor.name,
      metadata: { provider },
    });
    return NextResponse.json({ ok: true, status: "disconnected" });
  }

  const success = Math.random() > 0.1;
  const recordsSynced = Math.floor(Math.random() * 40) + 5;
  syncLogs.unshift({
    at: new Date().toISOString(),
    status: success ? "success" : "error",
    message: success ? `Synced ${recordsSynced} records from ${provider}` : "Sync failed — check credentials",
    recordsSynced: success ? recordsSynced : undefined,
  });

  const row = await prisma.complianceIntegration.update({
    where: { id: existing.id },
    data: {
      lastSyncAt: success ? new Date() : existing.lastSyncAt,
      status: success ? "connected" : "error",
      config: { ...prev, syncLogs: syncLogs.slice(0, 50) } as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: success ? "integration_synced" : "integration_sync_failed",
    entityType: "integration",
    entityId: existing.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
    metadata: { provider, recordsSynced },
  });

  return NextResponse.json({ ok: true, item: enrichDetail(serializeIntegration(row), parseIntegrationConfig(row.config).connectedBy) });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-integrations");
  if (!gate.ok) return gate.response;

  const { provider } = await ctx.params;
  const existing = await prisma.complianceIntegration.findFirst({
    where: { organizationId: gate.actor.organizationId, provider },
  });
  if (!existing) return NextResponse.json({ ok: true });

  await prisma.complianceIntegration.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
