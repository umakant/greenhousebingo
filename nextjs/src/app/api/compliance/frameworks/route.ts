import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import {
  computeFrameworkReadiness,
  ensureComplianceOperationalSeed,
  loadOwner,
  logComplianceActivity,
  serializeFramework,
} from "@/lib/compliance/compliance-service";
import { COMPLIANCE_FRAMEWORK_TABLE_STATS } from "@/lib/compliance/compliance-frameworks";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-frameworks");
  if (!gate.ok) return gate.response;

  try {
    const { organizationId } = gate.actor;
    await ensureComplianceOperationalSeed(organizationId);

    const rows = await prisma.complianceFramework.findMany({
      where: { organizationId },
      orderBy: { code: "asc" },
      include: { _count: { select: { controls: true, mappings: true } } },
    });

    const items = await Promise.all(
      rows.map(async (row) => {
        const readiness = await computeFrameworkReadiness(organizationId, row.id);
        const owner = await loadOwner(row.ownerUserId);
        const riskCount = await prisma.complianceRisk.count({ where: { organizationId, status: "open" } });
        const tableStats =
          COMPLIANCE_FRAMEWORK_TABLE_STATS[row.code as keyof typeof COMPLIANCE_FRAMEWORK_TABLE_STATS];
        return serializeFramework({ ...row, owner }, {
          readinessScore: row.auditReadyPct,
          controlCount: tableStats?.controlTotal ?? readiness.controlCount,
          evidenceCount: tableStats?.evidenceCount ?? readiness.evidenceCount,
          controlsImplemented: tableStats?.controlImplemented ?? readiness.implemented,
          riskCount,
        });
      }),
    );

    return NextResponse.json({ ok: true, items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load frameworks.";
    console.error("[compliance/frameworks GET]", e);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-frameworks");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const code = String(body.code ?? "").trim().toUpperCase();
  const name = String(body.name ?? "").trim();
  if (!code || !name) {
    return NextResponse.json({ ok: false, message: "Code and name are required." }, { status: 400 });
  }

  const row = await prisma.complianceFramework.create({
    data: {
      organizationId: gate.actor.organizationId,
      code,
      name,
      description: String(body.description ?? "").trim() || null,
      status: String(body.status ?? "active").trim() || "active",
      enabledAt: new Date(),
      ownerUserId: body.ownerUserId ? BigInt(Number(body.ownerUserId)) : null,
    },
    include: { _count: { select: { controls: true, mappings: true } } },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: "framework_created",
    entityType: "framework",
    entityId: row.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
  });

  const owner = await loadOwner(row.ownerUserId);
  return NextResponse.json({ ok: true, item: serializeFramework({ ...row, owner }) });
}
