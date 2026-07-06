import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import { computeRiskScore } from "@/lib/compliance/compliance-day2";
import {
  buildRiskMatrix,
  impactDisplayLabel,
  impactWeightValue,
  likelihoodDisplayLabel,
  likelihoodWeightValue,
  riskCategoryFromTitle,
  riskCode,
  riskDescription,
  riskLevelBucket,
} from "@/lib/compliance/compliance-risks";
import { logComplianceActivity, loadOwner, serializeRisk } from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function enrichRiskRow(base: ReturnType<typeof serializeRisk>, row: { description: string | null }) {
  return {
    ...base,
    riskCode: riskCode(base.id),
    category: riskCategoryFromTitle(base.title),
    description: riskDescription(base.title, row.description),
    likelihoodValue: likelihoodWeightValue(base.likelihood),
    likelihoodLabel: likelihoodDisplayLabel(base.likelihood),
    impactValue: impactWeightValue(base.impact),
    impactLabel: impactDisplayLabel(base.impact),
    levelBucket: riskLevelBucket(base.riskLevel),
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-risks");
  if (!gate.ok) return gate.response;

  const { organizationId } = gate.actor;
  const status = (req.nextUrl.searchParams.get("status") ?? "").trim();
  const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
  const category = (req.nextUrl.searchParams.get("category") ?? "").trim();
  const level = (req.nextUrl.searchParams.get("level") ?? "").trim();
  const ownerId = req.nextUrl.searchParams.get("ownerId");

  const rows = await prisma.complianceRisk.findMany({
    where: {
      organizationId,
      ...(status ? { status } : {}),
      ...(ownerId ? { ownerUserId: BigInt(ownerId) } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    },
    orderBy: [{ severity: "desc" }, { updatedAt: "desc" }],
    take: 300,
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
    const base = serializeRisk({ ...row, owner });
    const enriched = enrichRiskRow(base, row);
    if (!enriched.ownerName && gate.actor.name) enriched.ownerName = gate.actor.name;
    return enriched;
  });

  if (category) items = items.filter((i) => i.category === category);
  if (level) items = items.filter((i) => i.levelBucket === level);

  const matrix = buildRiskMatrix(items);
  const categories = [...new Set(items.map((i) => i.category))].sort();
  const ownersList = owners.map((o) => ({ id: Number(o.id), name: o.name ?? o.email ?? "Unknown" }));

  return NextResponse.json({ ok: true, items, matrix, categories, owners: ownersList });
}

export async function POST(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-risks");
  if (!gate.ok) return gate.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ ok: false, message: "Title is required." }, { status: 400 });

  const impact = String(body.impact ?? body.severity ?? "medium").trim();
  const likelihood = String(body.likelihood ?? "possible").trim();
  const metadata = {
    mitigationPlan: String(body.mitigationPlan ?? "").trim() || undefined,
    residualImpact: String(body.residualImpact ?? "").trim() || undefined,
    residualLikelihood: String(body.residualLikelihood ?? "").trim() || undefined,
    reviewNotes: String(body.reviewNotes ?? "").trim() || undefined,
  };

  const row = await prisma.complianceRisk.create({
    data: {
      organizationId: gate.actor.organizationId,
      title,
      description: String(body.description ?? "").trim() || null,
      severity: impact,
      likelihood,
      status: String(body.status ?? "open").trim() || "open",
      ownerUserId: body.ownerUserId ? BigInt(Number(body.ownerUserId)) : gate.actor.userId,
      dueDate: body.dueDate ? new Date(String(body.dueDate)) : null,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });

  await logComplianceActivity({
    organizationId: gate.actor.organizationId,
    action: "risk_created",
    entityType: "risk",
    entityId: row.id,
    actorUserId: gate.actor.userId,
    actorName: gate.actor.name,
    metadata: { riskScore: computeRiskScore(impact, likelihood) },
  });

  const owner = await loadOwner(row.ownerUserId);
  return NextResponse.json({ ok: true, item: enrichRiskRow(serializeRisk({ ...row, owner }), row) });
}
