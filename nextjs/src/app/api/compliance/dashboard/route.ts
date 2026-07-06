import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { canAccessComplianceDashboard } from "@/lib/compliance/compliance-access";
import { computeLaunchpadState } from "@/lib/compliance/compliance-launchpad-engine";
import { loadComplianceActorFromEmail, resolveComplianceOrganizationId } from "@/lib/compliance/compliance-tenant";
import { ensureComplianceAddOnRow } from "@/lib/ensure-add-on-db";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

export const dynamic = "force-dynamic";

function pct(n: number, d: number) {
  if (d <= 0) return 0;
  return Math.round((n / d) * 100);
}

export async function GET(req: NextRequest) {
  await ensureComplianceAddOnRow(prisma);

  const role = req.cookies.get("pf_role")?.value;
  const perms = await getPermissionsFromRequest(req);
  if (!canAccessComplianceDashboard(perms, role)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = email ? await loadComplianceActorFromEmail(email) : null;
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const organizationId = resolveComplianceOrganizationId(actor);
  const orgWhere = { organizationId };

  const now = new Date();
  const in30Days = new Date(now);
  in30Days.setDate(in30Days.getDate() + 30);

  const [
    frameworks,
    controlsTotal,
    controlsImplemented,
    controlsFailing,
    controlsInProgress,
    evidenceTotal,
    evidenceComplete,
    evidenceApproved,
    evidenceRejected,
    evidenceExpired,
    evidencePending,
    risksOpen,
    risksCritical,
    risksHigh,
    risksMedium,
    risksLow,
    vulnOpen,
    vulnCritical,
    vulnHigh,
    vulnMedium,
    vulnLow,
    vulnInfo,
    vulnRemediated,
    audits,
    tasksOpen,
    notifications,
    activity,
    monitors,
    monitorResults,
    trustCenter,
    integrationsConnected,
    integrationsTotal,
    policiesPublished,
    policiesTotal,
    vendorReviewsPending,
    accessReviewsDue,
    auditorInvites,
  ] = await Promise.all([
    prisma.complianceFramework.findMany({
      where: orgWhere,
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, progressPct: true, auditReadyPct: true, status: true },
    }),
    prisma.complianceControl.count({ where: orgWhere }),
    prisma.complianceControl.count({ where: { ...orgWhere, status: "implemented" } }),
    prisma.complianceControl.count({ where: { ...orgWhere, status: "failing" } }),
    prisma.complianceControl.count({ where: { ...orgWhere, status: "in_progress" } }),
    prisma.complianceEvidence.count({ where: orgWhere }),
    prisma.complianceEvidence.count({ where: { ...orgWhere, status: "complete" } }),
    prisma.complianceEvidence.count({ where: { ...orgWhere, status: "approved" } }),
    prisma.complianceEvidence.count({ where: { ...orgWhere, status: "rejected" } }),
    prisma.complianceEvidence.count({
      where: { ...orgWhere, expiresAt: { lt: now }, status: { notIn: ["complete", "approved"] } },
    }),
    prisma.complianceEvidence.count({ where: { ...orgWhere, status: "pending" } }),
    prisma.complianceRisk.count({ where: { ...orgWhere, status: "open" } }),
    prisma.complianceRisk.count({ where: { ...orgWhere, status: "open", severity: "critical" } }),
    prisma.complianceRisk.count({ where: { ...orgWhere, status: "open", severity: "high" } }),
    prisma.complianceRisk.count({ where: { ...orgWhere, status: "open", severity: "medium" } }),
    prisma.complianceRisk.count({ where: { ...orgWhere, status: "open", severity: "low" } }),
    prisma.complianceVulnerability.count({ where: { ...orgWhere, status: "open" } }),
    prisma.complianceVulnerability.count({ where: { ...orgWhere, status: "open", severity: "critical" } }),
    prisma.complianceVulnerability.count({ where: { ...orgWhere, status: "open", severity: "high" } }),
    prisma.complianceVulnerability.count({ where: { ...orgWhere, status: "open", severity: "medium" } }),
    prisma.complianceVulnerability.count({ where: { ...orgWhere, status: "open", severity: "low" } }),
    prisma.complianceVulnerability.count({ where: { ...orgWhere, status: "open", severity: "informational" } }),
    prisma.complianceVulnerability.count({ where: { ...orgWhere, status: "remediated" } }),
    prisma.complianceAudit.findMany({
      where: orgWhere,
      orderBy: { startDate: "asc" },
      take: 8,
      select: {
        id: true,
        name: true,
        status: true,
        auditType: true,
        startDate: true,
        endDate: true,
        auditorName: true,
        framework: { select: { code: true, name: true } },
      },
    }),
    prisma.complianceTask.findMany({
      where: { ...orgWhere, status: { in: ["open", "in_progress"] } },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      take: 8,
      select: { id: true, title: true, status: true, priority: true, dueDate: true },
    }),
    prisma.complianceNotification.findMany({
      where: { ...orgWhere, readAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, title: true, body: true, severity: true, link: true, createdAt: true },
    }),
    prisma.complianceActivityLog.findMany({
      where: orgWhere,
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        entityType: true,
        actorName: true,
        createdAt: true,
      },
    }),
    prisma.complianceMonitor.findMany({
      where: orgWhere,
      select: { id: true, name: true, status: true, category: true, lastRunAt: true },
      orderBy: { name: "asc" },
      take: 8,
    }),
    prisma.complianceMonitorResult.findMany({
      where: orgWhere,
      orderBy: { ranAt: "desc" },
      take: 50,
      select: { monitorId: true, status: true, ranAt: true },
    }),
    prisma.complianceTrustCenter.findUnique({ where: { organizationId } }),
    prisma.complianceIntegration.count({ where: { ...orgWhere, status: "connected" } }),
    prisma.complianceIntegration.count({ where: orgWhere }),
    prisma.compliancePolicy.count({ where: { ...orgWhere, status: "published" } }),
    prisma.compliancePolicy.count({ where: orgWhere }),
    prisma.complianceVendorReview.count({ where: { ...orgWhere, reviewStatus: "pending" } }),
    prisma.complianceAccessReview.count({
      where: { ...orgWhere, status: { in: ["scheduled", "in_progress"] }, dueDate: { lte: in30Days } },
    }),
    prisma.complianceAuditorInvite.count({
      where: { organizationId, revokedAt: null },
    }),
  ]);

  const latestResultByMonitor = new Map<string, string>();
  for (const r of monitorResults) {
    const key = r.monitorId.toString();
    if (!latestResultByMonitor.has(key)) latestResultByMonitor.set(key, r.status);
  }
  let monitorsPassing = 0;
  let monitorsFailing = 0;
  for (const m of monitors) {
    const st = latestResultByMonitor.get(m.id.toString());
    if (st === "fail") monitorsFailing += 1;
    else if (st === "pass") monitorsPassing += 1;
  }

  const frameworkProgressAvg =
    frameworks.length > 0
      ? Math.round(frameworks.reduce((s, f) => s + f.progressPct, 0) / frameworks.length)
      : 0;
  const auditReadyAvg =
    frameworks.length > 0
      ? Math.round(frameworks.reduce((s, f) => s + f.auditReadyPct, 0) / frameworks.length)
      : 0;

  const complianceScore = Math.round(
    frameworkProgressAvg * 0.35 +
      pct(controlsImplemented, controlsTotal) * 0.25 +
      pct(evidenceComplete, evidenceTotal) * 0.2 +
      auditReadyAvg * 0.2,
  );

  const approvedEvidence = evidenceComplete + evidenceApproved;
  const missingEvidence = Math.max(0, evidenceTotal - approvedEvidence - evidencePending - evidenceRejected);
  const openIssues = controlsFailing + risksCritical + vulnCritical + vendorReviewsPending;
  const nextAudit = audits.find((a) => a.startDate && a.startDate >= now) ?? audits[0] ?? null;
  const auditReady = auditReadyAvg >= 80 && openIssues === 0;

  let pendingAuditRequests = 0;
  for (const a of audits) {
    const full = await prisma.complianceAudit.findUnique({
      where: { id: a.id },
      select: { metadata: true },
    });
    const requests = (full?.metadata as { requests?: Array<{ status: string }> } | null)?.requests ?? [];
    pendingAuditRequests += requests.filter((r) => r.status === "open").length;
  }

  const featuredTask =
    tasksOpen.find(
      (t) =>
        t.title.toLowerCase().includes("access review") ||
        t.title.toLowerCase().includes("soc 2") ||
        t.title.toLowerCase().includes("soc2"),
    ) ?? tasksOpen[0] ?? null;
  let featuredTaskDays: number | null = null;
  if (featuredTask?.dueDate) {
    featuredTaskDays = Math.max(
      0,
      Math.ceil((featuredTask.dueDate.getTime() - now.getTime()) / 86400000),
    );
  }

  const launchpadState = await computeLaunchpadState(organizationId);
  const launchpadItems = launchpadState.sections.map((s) => ({
    id: s.id,
    label: s.title,
    current: Math.max(0, Math.min(5, Math.round((s.progressPct / 100) * 5))),
    target: 5,
    href: s.href,
    progressPct: s.progressPct,
    completed: s.completed,
  }));
  const launchpadCompleted = launchpadState.completedSections;

  return NextResponse.json({
    ok: true,
    data: {
      complianceScore,
      frameworkProgress: frameworks.map((f) => ({
        id: Number(f.id),
        code: f.code,
        name: f.name,
        progressPct: f.auditReadyPct || f.progressPct,
        auditReadyPct: f.auditReadyPct,
        status: f.status,
      })),
      auditReadiness: {
        score: auditReadyAvg,
        ready: auditReady,
        readyFrameworks: frameworks.filter((f) => f.auditReadyPct >= 80).length,
        totalFrameworks: frameworks.length,
        nextAudit: nextAudit
          ? {
              id: Number(nextAudit.id),
              name: nextAudit.name,
              auditType: nextAudit.auditType,
              startDate: nextAudit.startDate?.toISOString().slice(0, 10) ?? null,
              endDate: nextAudit.endDate?.toISOString().slice(0, 10) ?? null,
              status: nextAudit.status,
              frameworkCode: nextAudit.framework?.code ?? null,
              frameworkName: nextAudit.framework?.name ?? null,
            }
          : null,
        activeAuditors: trustCenter?.activeAuditors ?? auditorInvites,
        openIssues,
        evidenceItems: evidenceTotal,
      },
      evidenceStatus: {
        total: evidenceTotal,
        approved: approvedEvidence,
        pending: evidencePending,
        rejected: evidenceRejected,
        missing: missingEvidence,
        complete: approvedEvidence,
        expired: evidenceExpired,
      },
      controlsStatus: {
        total: controlsTotal,
        passing: controlsImplemented,
        needsReview: controlsInProgress,
        failed: controlsFailing,
        implemented: controlsImplemented,
        inProgress: controlsInProgress,
        failing: controlsFailing,
        notStarted: Math.max(0, controlsTotal - controlsImplemented - controlsInProgress - controlsFailing),
      },
      riskStatus: {
        open: risksOpen,
        critical: risksCritical,
        high: risksHigh,
        medium: risksMedium,
        low: risksLow,
      },
      vulnerabilityStatus: {
        open: vulnOpen,
        critical: vulnCritical,
        high: vulnHigh,
        medium: vulnMedium,
        low: vulnLow,
        informational: vulnInfo,
        remediated: vulnRemediated,
      },
      featuredWhatsNext: featuredTask
        ? {
            id: Number(featuredTask.id),
            title: featuredTask.title,
            status: featuredTask.status,
            priority: featuredTask.priority,
            dueDate: featuredTask.dueDate?.toISOString().slice(0, 10) ?? null,
            daysRemaining: featuredTaskDays,
            headline: featuredTask.title.toLowerCase().includes("soc")
              ? "Missing SOC 2 Evidence"
              : featuredTask.title.toLowerCase().includes("access review")
                ? "Missing SOC 2 Evidence"
                : "Priority compliance task",
            subtask: featuredTask.title.replace(/^Upload:\s*/i, ""),
          }
        : null,
      whatsNext: tasksOpen.map((t) => ({
        id: Number(t.id),
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate?.toISOString().slice(0, 10) ?? null,
      })),
      complianceAlerts: notifications.map((n) => ({
        id: Number(n.id),
        title: n.title,
        body: n.body,
        severity: n.severity,
        link: n.link,
        createdAt: n.createdAt.toISOString(),
      })),
      auditTimeline: audits.map((a) => ({
        id: Number(a.id),
        name: a.name,
        status: a.status,
        auditType: a.auditType,
        startDate: a.startDate?.toISOString().slice(0, 10) ?? null,
        endDate: a.endDate?.toISOString().slice(0, 10) ?? null,
        auditorName: a.auditorName,
        frameworkCode: a.framework?.code ?? null,
        frameworkName: a.framework?.name ?? null,
        daysRemaining:
          a.endDate && a.endDate >= now
            ? Math.ceil((a.endDate.getTime() - now.getTime()) / 86400000)
            : null,
      })),
      recentActivity: activity.map((a) => ({
        id: Number(a.id),
        action: a.action,
        entityType: a.entityType,
        actorName: a.actorName,
        createdAt: a.createdAt.toISOString(),
      })),
      trustCenterStatus: {
        published: trustCenter?.published ?? false,
        publicUrl: trustCenter?.publicUrl ?? null,
        lastUpdatedAt: trustCenter?.lastUpdatedAt?.toISOString() ?? null,
      },
      auditorPortalStatus: {
        enabled: trustCenter?.auditorPortalEnabled ?? false,
        activeAuditors: trustCenter?.activeAuditors ?? auditorInvites,
        openRequests: pendingAuditRequests,
        pendingEvidence: evidencePending + missingEvidence,
      },
      monitorStatus: {
        total: monitors.length,
        passing: monitorsPassing,
        failing: monitorsFailing,
        inactive: Math.max(0, monitors.length - monitorsPassing - monitorsFailing),
      },
      monitorsList: monitors.map((m) => {
        const st = latestResultByMonitor.get(m.id.toString());
        const ok = st === "pass";
        return {
          id: Number(m.id),
          name: m.name,
          category: m.category ?? "Compliance",
          status: ok ? "ok" : st === "fail" ? "attention" : "overdue",
          statusLabel: ok ? "OK" : st === "fail" ? "Needs Attention" : "Overdue",
          lastRunAt: m.lastRunAt?.toISOString() ?? null,
        };
      }),
      launchpadItems,
      launchpadProgress: {
        completed: launchpadCompleted,
        total: launchpadItems.length,
        steps: launchpadItems.map((step) => ({
          id: step.id,
          label: step.label,
          href: step.href,
          completed: step.completed,
        })),
      },
      summaryStats: {
        complianceScore,
        frameworksActive: frameworks.filter((f) => f.status === "active").length,
        controlsTotal,
        evidenceTotal,
        openIssues,
      },
      integrationsSummary: {
        connected: integrationsConnected,
        total: integrationsTotal,
      },
      policiesSummary: {
        published: policiesPublished,
        total: policiesTotal,
      },
    },
  });
}
