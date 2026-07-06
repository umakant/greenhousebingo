import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import {
  COMPLIANCE_INTEGRATION_PROVIDERS,
  integrationProviderMeta,
} from "@/lib/compliance/compliance-day4";
import {
  accountSubtitle,
  categoryLabel,
  connectedAccountEmail,
  integrationDisplayStatus,
  integrationOwner,
  integrationStats,
  integrationSyncMode,
  lastSyncTone,
  nextSyncIn,
  systemUseCase,
} from "@/lib/compliance/compliance-integrations";
import { logComplianceActivity, serializeIntegration } from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function enrichCatalogItem(
  base: ReturnType<typeof serializeIntegration> | {
    id: null;
    provider: string;
    providerName: string;
    category: string;
    status: string;
    lastSyncAt: null;
    controlsSupported: string[];
    monitorsSupported: string[];
    scope: Record<string, unknown>;
    syncLogs: never[];
    credentialsConfigured: boolean;
    createdAt: null;
    updatedAt: null;
  },
  connectedBy?: string,
) {
  const displayStatus = integrationDisplayStatus(base.status);
  const lastLog = base.syncLogs?.[0];
  return {
    ...base,
    categoryLabel: categoryLabel(base.category),
    accountSubtitle: accountSubtitle(base.provider),
    systemUseCase: systemUseCase(base.provider, base.category),
    displayStatus,
    syncMode: integrationSyncMode(displayStatus),
    ownerName: integrationOwner(base.provider, base.id),
    connectedAccount: connectedAccountEmail(base.provider, connectedBy, base.id ?? 0),
    nextSyncIn: nextSyncIn(base.lastSyncAt, displayStatus),
    lastSyncTone: lastSyncTone(displayStatus, lastLog?.status),
    controlsCount: base.controlsSupported.length,
    monitorsCount: base.monitorsSupported.length,
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-integrations");
  if (!gate.ok) return gate.response;

  const { organizationId } = gate.actor;
  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const category = (req.nextUrl.searchParams.get("category") ?? "").trim();
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();
  const system = (req.nextUrl.searchParams.get("system") ?? "").trim();

  const connected = await prisma.complianceIntegration.findMany({
    where: { organizationId },
    orderBy: { provider: "asc" },
  });
  const byProvider = new Map(connected.map((r) => [r.provider, r]));

  let catalog = COMPLIANCE_INTEGRATION_PROVIDERS.map((p) => {
    const row = byProvider.get(p.key);
    if (row) {
      const serialized = serializeIntegration(row);
      const config = row.config as { connectedBy?: string } | null;
      return enrichCatalogItem(serialized, config?.connectedBy);
    }
    return enrichCatalogItem({
      id: null,
      provider: p.key,
      providerName: p.name,
      category: p.category,
      status: "disconnected",
      lastSyncAt: null,
      controlsSupported: [...p.controlsSupported],
      monitorsSupported: [...p.monitorsSupported],
      scope: p.defaultScope as Record<string, unknown>,
      syncLogs: [],
      credentialsConfigured: false,
      createdAt: null,
      updatedAt: null,
    });
  });

  if (search) {
    const q = search.toLowerCase();
    catalog = catalog.filter(
      (i) =>
        i.providerName.toLowerCase().includes(q) ||
        i.systemUseCase.toLowerCase().includes(q) ||
        i.accountSubtitle.toLowerCase().includes(q),
    );
  }
  if (category && category !== "all") {
    catalog = catalog.filter((i) => i.category === category || i.categoryLabel === category);
  }
  if (status && status !== "all") {
    catalog = catalog.filter((i) => i.displayStatus === status);
  }
  if (system && system !== "all") {
    catalog = catalog.filter((i) => i.systemUseCase === system);
  }

  const categories = [...new Set(COMPLIANCE_INTEGRATION_PROVIDERS.map((p) => p.category))];
  const systems = [...new Set(catalog.map((i) => i.systemUseCase))].sort();
  const owners = [...new Set(catalog.map((i) => i.ownerName))].sort();
  const stats = integrationStats(catalog);

  return NextResponse.json({
    ok: true,
    items: catalog,
    stats,
    categories,
    systems,
    owners,
    summary: {
      connected: stats.connected,
      total: stats.total,
    },
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-integrations");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const provider = String(body.provider ?? "").trim();
  const meta = integrationProviderMeta(provider);
  if (!meta) {
    return NextResponse.json({ ok: false, message: "Unknown integration provider." }, { status: 400 });
  }

  const scope =
    body.scope && typeof body.scope === "object" && !Array.isArray(body.scope)
      ? (body.scope as Record<string, unknown>)
      : meta.defaultScope;

  const config = {
    scope,
    credentialsConfigured: Boolean(body.credentialsConfigured ?? true),
    connectedBy: gate.actor.email,
    syncLogs: [
      {
        at: new Date().toISOString(),
        status: "success" as const,
        message: "Integration connected",
        recordsSynced: 0,
      },
    ],
  };

  const row = await prisma.complianceIntegration.upsert({
    where: {
      organizationId_provider: {
        organizationId: gate.actor.organizationId,
        provider,
      },
    },
    create: {
      organizationId: gate.actor.organizationId,
      provider,
      status: "connected",
      lastSyncAt: new Date(),
      config: config as Prisma.InputJsonValue,
    },
    update: {
      status: "connected",
      lastSyncAt: new Date(),
      config: config as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: "integration_connected",
    entityType: "integration",
    entityId: row.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
    metadata: { provider },
  });

  const serialized = serializeIntegration(row);
  return NextResponse.json({
    ok: true,
    item: enrichCatalogItem(serialized, gate.actor.email ?? undefined),
  });
}
