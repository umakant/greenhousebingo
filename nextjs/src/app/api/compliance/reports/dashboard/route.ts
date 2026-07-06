import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import { buildRiskMatrix } from "@/lib/compliance/compliance-risks";
import {
  auditDisplayStatusLabel,
  auditReadinessFromFramework,
  metricDelta,
  recentGeneratedReports,
  scheduledReports,
  scoreTrend,
} from "@/lib/compliance/compliance-reports-data";
import { computeComplianceScores } from "@/lib/compliance/compliance-scoring";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function pct(n: number, d: number) {
  if (d <= 0) return 0;
  return Math.round((n / d) * 100);
}

export async function GET(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-reports");
  if (!gate.ok) return gate.response;

  const { organizationId } = gate.actor;
  const orgId = Number(organizationId);
  const orgWhere = { organizationId };
  const now = new Date();

  const [
    scores,
    frameworks,
    controlsTotal,
    controlsImplemented,
    evidenceTotal,
    evidenceApproved,
    evidencePending,
    evidenceRejected,
    evidenceExpired,
    risksOpen,
    risksCritical,
    risksHigh,
    risksMedium,
    risksLow,
    riskRows,
    vulnCritical,
    vulnOpen,
    audits,
  ] = await Promise.all([
    computeComplianceScores(organizationId),
    prisma.complianceFramework.findMany({
      where: orgWhere,
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, progressPct: true, auditReadyPct: true, status: true, updatedAt: true },
    }),
    prisma.complianceControl.count({ where: orgWhere }),
    prisma.complianceControl.count({ where: { ...orgWhere, status: "implemented" } }),
    prisma.complianceEvidence.count({ where: orgWhere }),
    prisma.complianceEvidence.count({ where: { ...orgWhere, status: { in: ["approved", "complete"] } } }),
    prisma.complianceEvidence.count({ where: { ...orgWhere, status: "pending" } }),
    prisma.complianceEvidence.count({ where: { ...orgWhere, status: "rejected" } }),
    prisma.complianceEvidence.count({
      where: { ...orgWhere, expiresAt: { lt: now }, status: { notIn: ["complete", "approved"] } },
    }),
    prisma.complianceRisk.count({ where: { ...orgWhere, status: "open" } }),
    prisma.complianceRisk.count({ where: { ...orgWhere, status: "open", severity: "critical" } }),
    prisma.complianceRisk.count({ where: { ...orgWhere, status: "open", severity: "high" } }),
    prisma.complianceRisk.count({ where: { ...orgWhere, status: "open", severity: "medium" } }),
    prisma.complianceRisk.count({ where: { ...orgWhere, status: "open", severity: "low" } }),
    prisma.complianceRisk.findMany({
      where: { ...orgWhere, status: "open" },
      select: { severity: true, likelihood: true },
      take: 500,
    }),
    prisma.complianceVulnerability.count({ where: { ...orgWhere, status: "open", severity: "critical" } }),
    prisma.complianceVulnerability.count({ where: { ...orgWhere, status: "open" } }),
    prisma.complianceAudit.findMany({
      where: orgWhere,
      include: { framework: { select: { code: true, name: true, auditReadyPct: true } } },
      orderBy: { startDate: "asc" },
      take: 12,
    }),
  ]);

  const matrix = buildRiskMatrix(
    riskRows.map((r) => ({ impact: r.severity, likelihood: r.likelihood })),
  );
  const frameworkCodes = frameworks.map((f) => f.code);

  const auditRows = audits.map((a) => {
    const readiness = auditReadinessFromFramework(
      a.framework?.auditReadyPct ?? frameworks.find((f) => f.id === a.frameworkId)?.auditReadyPct ?? 0,
      a.status,
    );
    const statusLabel = auditDisplayStatusLabel(a.status, a.endDate);
    return {
      id: Number(a.id),
      name: a.name,
      framework: a.framework?.name ?? a.framework?.code ?? "—",
      status: a.status,
      statusLabel,
      readiness,
      lastUpdated: a.updatedAt?.toISOString() ?? a.endDate?.toISOString() ?? null,
    };
  });

  const complianceDelta = metricDelta(orgId, true);
  const auditDelta = metricDelta(orgId + 3, true);
  const riskDelta = metricDelta(orgId + 5, false);
  const vulnDelta = metricDelta(orgId + 7, false);

  return NextResponse.json({
    ok: true,
    summary: {
      complianceScore: scores.overall,
      complianceScoreDelta: complianceDelta,
      auditReadiness: scores.auditReadiness,
      auditReadinessDelta: auditDelta,
      controlsPassing: controlsImplemented,
      controlsTotal,
      evidenceApproved,
      evidenceTotal,
      openRisks: risksOpen,
      openRisksDelta: riskDelta,
      criticalVulnerabilities: vulnCritical,
      criticalVulnerabilitiesDelta: vulnDelta,
      openVulnerabilities: vulnOpen,
    },
    scoreBreakdown: [
      { label: "Framework", value: scores.framework },
      { label: "Control", value: scores.control },
      { label: "Evidence", value: scores.evidence },
      { label: "Audit Readiness", value: scores.auditReadiness },
      { label: "Vendor Risk", value: scores.vendorRisk },
      { label: "Security", value: scores.security },
    ],
    frameworks: frameworks.map((f) => ({
      id: Number(f.id),
      code: f.code,
      name: f.name,
      progressPct: f.auditReadyPct || f.progressPct,
    })),
    scoreTrend: scoreTrend(scores.overall),
    evidenceAnalytics: {
      approved: evidenceApproved,
      pending: evidencePending,
      rejected: evidenceRejected,
      expired: evidenceExpired,
      total: evidenceTotal,
    },
    riskAnalytics: {
      matrix,
      critical: risksCritical,
      high: risksHigh,
      medium: risksMedium,
      low: risksLow,
      total: risksOpen,
    },
    audits: auditRows,
    recentReports: recentGeneratedReports(orgId, gate.actor.name, frameworkCodes),
    scheduledReports: scheduledReports(orgId),
    controlsPassingPct: pct(controlsImplemented, controlsTotal),
    evidenceApprovedPct: pct(evidenceApproved, evidenceTotal),
  });
}
