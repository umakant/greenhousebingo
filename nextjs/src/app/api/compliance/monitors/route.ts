import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import { COMPLIANCE_MONITOR_CATEGORIES } from "@/lib/compliance/compliance-constants";
import {
  COMPLIANCE_MONITOR_INTEGRATIONS,
  monitorDescription,
  monitorDisplayStatus,
  monitorIntegrationFromName,
  monitorCategoryTab,
  scheduleFrequencyLabel,
} from "@/lib/compliance/compliance-monitors";
import {
  ensureComplianceOperationalSeed,
  loadOwner,
  logComplianceActivity,
  serializeMonitor,
} from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function enrichMonitorRow(
  base: ReturnType<typeof serializeMonitor>,
  row: { description: string | null; lastRunAt: Date | null },
) {
  const displayStatus = monitorDisplayStatus({
    latestResultStatus: base.latestResult?.status,
    remediationStatus: base.remediationStatus,
    lastRunAt: base.lastRunAt,
    slaHours: base.slaHours,
  });
  return {
    ...base,
    description: monitorDescription(base.name, row.description),
    integration: monitorIntegrationFromName(base.name),
    frequency: scheduleFrequencyLabel(base.schedule),
    categoryTab: monitorCategoryTab(base.category),
    displayStatus,
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-monitors");
  if (!gate.ok) return gate.response;

  const { organizationId } = gate.actor;
  await ensureComplianceOperationalSeed(organizationId);

  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const category = (req.nextUrl.searchParams.get("category") ?? "").trim();
  const categoryTab = (req.nextUrl.searchParams.get("categoryTab") ?? "").trim();
  const integration = (req.nextUrl.searchParams.get("integration") ?? "").trim();
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();

  const rows = await prisma.complianceMonitor.findMany({
    where: {
      organizationId,
      ...(status && status !== "passing" && status !== "failing" && status !== "needs_attention" && status !== "overdue"
        ? { status }
        : {}),
      ...(category ? { category } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    take: 200,
    include: {
      results: { orderBy: { ranAt: "desc" }, take: 1 },
    },
  });

  const ownerIds = [...new Set(rows.map((r) => r.ownerUserId).filter(Boolean) as bigint[])];
  const owners = ownerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const ownerById = new Map(owners.map((o) => [String(o.id), o.name ?? o.email ?? null]));

  let items = rows.map((row) => {
    const owner = row.ownerUserId
      ? { id: row.ownerUserId, name: ownerById.get(String(row.ownerUserId)) ?? null, email: null }
      : null;
    const base = serializeMonitor({ ...row, owner }, row.results[0] ?? null);
    const enriched = enrichMonitorRow(base, row);
    if (!enriched.ownerName && gate.actor.name) {
      enriched.ownerName = gate.actor.name;
    }
    return enriched;
  });

  if (categoryTab && categoryTab !== "all") {
    items = items.filter((i) => i.categoryTab === categoryTab);
  }
  if (integration && integration !== "all") {
    items = items.filter((i) => i.integration === integration);
  }
  if (status === "passing" || status === "failing" || status === "needs_attention" || status === "overdue") {
    items = items.filter((i) => i.displayStatus === status);
  }

  const categories = [...new Set(items.map((i) => i.category))].sort();
  const integrations = [...COMPLIANCE_MONITOR_INTEGRATIONS];

  return NextResponse.json({
    ok: true,
    items,
    categories,
    categoryTabs: ["Security", "Cloud", "HR", "Vendor", "Compliance", "Custom"],
    integrations,
    monitorCategories: COMPLIANCE_MONITOR_CATEGORIES,
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-monitors");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ ok: false, message: "Monitor name is required." }, { status: 400 });
  }

  const row = await prisma.complianceMonitor.create({
    data: {
      organizationId: gate.actor.organizationId,
      name,
      monitorType: String(body.monitorType ?? body.monitor_type ?? "automated").trim() || "automated",
      category: String(body.category ?? "Compliance").trim() || "Compliance",
      status: String(body.status ?? "active").trim() || "active",
      schedule: String(body.schedule ?? "daily").trim() || null,
      slaHours: body.slaHours != null ? Number(body.slaHours) : null,
      description: String(body.description ?? "").trim() || null,
      ownerUserId: body.ownerUserId ? BigInt(Number(body.ownerUserId)) : gate.actor.userId,
    },
    include: { results: { orderBy: { ranAt: "desc" }, take: 1 } },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: "monitor_created",
    entityType: "monitor",
    entityId: row.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
  });

  const owner = await loadOwner(row.ownerUserId);
  const base = serializeMonitor({ ...row, owner });
  return NextResponse.json({ ok: true, item: enrichMonitorRow(base, row) });
}
