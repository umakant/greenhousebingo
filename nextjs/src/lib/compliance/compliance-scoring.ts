import "server-only";

import { prisma } from "@/lib/prisma";

function pct(n: number, d: number) {
  if (d <= 0) return 0;
  return Math.round((n / d) * 100);
}

export type ComplianceScoreBundle = {
  overall: number;
  framework: number;
  control: number;
  evidence: number;
  auditReadiness: number;
  vendorRisk: number;
  security: number;
  breakdown: {
    frameworksActive: number;
    frameworksTotal: number;
    controlsImplemented: number;
    controlsTotal: number;
    controlsFailing: number;
    evidenceApproved: number;
    evidenceTotal: number;
    vendorsPending: number;
    vendorsTotal: number;
    vulnOpen: number;
    vulnCritical: number;
    monitorsPassing: number;
    monitorsTotal: number;
  };
};

export async function computeComplianceScores(organizationId: bigint): Promise<ComplianceScoreBundle> {
  const orgWhere = { organizationId };

  const [
    frameworks,
    controlsTotal,
    controlsImplemented,
    controlsFailing,
    evidenceTotal,
    evidenceApproved,
    evidenceComplete,
    vendorsTotal,
    vendorsPending,
    vendorsHighRisk,
    vulnOpen,
    vulnCritical,
    monitors,
    monitorResults,
    audits,
  ] = await Promise.all([
    prisma.complianceFramework.findMany({
      where: orgWhere,
      select: { progressPct: true, auditReadyPct: true, status: true },
    }),
    prisma.complianceControl.count({ where: orgWhere }),
    prisma.complianceControl.count({ where: { ...orgWhere, status: "implemented" } }),
    prisma.complianceControl.count({ where: { ...orgWhere, status: "failing" } }),
    prisma.complianceEvidence.count({ where: orgWhere }),
    prisma.complianceEvidence.count({ where: { ...orgWhere, status: "approved" } }),
    prisma.complianceEvidence.count({ where: { ...orgWhere, status: { in: ["complete", "approved"] } } }),
    prisma.complianceVendorReview.count({ where: orgWhere }),
    prisma.complianceVendorReview.count({ where: { ...orgWhere, reviewStatus: "pending" } }),
    prisma.complianceVendorReview.count({
      where: { ...orgWhere, riskTier: { in: ["high", "critical"] } },
    }),
    prisma.complianceVulnerability.count({ where: { ...orgWhere, status: "open" } }),
    prisma.complianceVulnerability.count({ where: { ...orgWhere, status: "open", severity: "critical" } }),
    prisma.complianceMonitor.findMany({ where: orgWhere, select: { id: true } }),
    prisma.complianceMonitorResult.findMany({
      where: orgWhere,
      orderBy: { ranAt: "desc" },
      take: 200,
      select: { monitorId: true, status: true },
    }),
    prisma.complianceAudit.findMany({
      where: orgWhere,
      select: { status: true },
    }),
  ]);

  const latestByMonitor = new Map<string, string>();
  for (const r of monitorResults) {
    const k = r.monitorId.toString();
    if (!latestByMonitor.has(k)) latestByMonitor.set(k, r.status);
  }
  let monitorsPassing = 0;
  for (const m of monitors) {
    if (latestByMonitor.get(m.id.toString()) === "pass") monitorsPassing += 1;
  }

  const frameworkProgress =
    frameworks.length > 0
      ? Math.round(frameworks.reduce((s, f) => s + f.progressPct, 0) / frameworks.length)
      : 0;
  const auditReadyAvg =
    frameworks.length > 0
      ? Math.round(frameworks.reduce((s, f) => s + f.auditReadyPct, 0) / frameworks.length)
      : 0;

  const controlScore = pct(controlsImplemented, controlsTotal);
  const evidenceScore = pct(evidenceComplete, evidenceTotal);
  const frameworkScore = frameworkProgress;
  const auditReadiness = Math.round(auditReadyAvg * 0.7 + pct(audits.filter((a) => a.status === "ready").length, Math.max(audits.length, 1)) * 0.3);

  const vendorRiskBase = vendorsTotal > 0 ? pct(vendorsPending + vendorsHighRisk, vendorsTotal * 2) : 0;
  const vendorRisk = Math.max(0, 100 - vendorRiskBase);

  const securityPenalty = controlsFailing * 8 + vulnCritical * 10 + Math.max(0, monitors.length - monitorsPassing) * 5;
  const security = Math.max(0, 100 - securityPenalty);

  const overall = Math.round(
    frameworkScore * 0.2 +
      controlScore * 0.2 +
      evidenceScore * 0.15 +
      auditReadiness * 0.15 +
      vendorRisk * 0.1 +
      security * 0.1 +
      pct(monitorsPassing, Math.max(monitors.length, 1)) * 0.1,
  );

  return {
    overall,
    framework: frameworkScore,
    control: controlScore,
    evidence: evidenceScore,
    auditReadiness,
    vendorRisk,
    security,
    breakdown: {
      frameworksActive: frameworks.filter((f) => f.status === "active").length,
      frameworksTotal: frameworks.length,
      controlsImplemented,
      controlsTotal,
      controlsFailing,
      evidenceApproved: evidenceApproved + evidenceComplete,
      evidenceTotal,
      vendorsPending,
      vendorsTotal,
      vulnOpen,
      vulnCritical,
      monitorsPassing,
      monitorsTotal: monitors.length,
    },
  };
}
