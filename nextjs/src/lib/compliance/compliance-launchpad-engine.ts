import "server-only";

import { COMPLIANCE_LAUNCHPAD_SECTIONS } from "@/lib/compliance/compliance-day4";
import { prisma } from "@/lib/prisma";

export type LaunchpadSectionState = {
  id: string;
  title: string;
  description: string;
  href: string;
  progressPct: number;
  completed: boolean;
  blockers: string[];
  nextAction: string;
  tasksGenerated: number;
  metrics: Record<string, number>;
};

function pct(n: number, d: number) {
  if (d <= 0) return 0;
  return Math.round((n / d) * 100);
}

export async function computeLaunchpadState(organizationId: bigint): Promise<{
  sections: LaunchpadSectionState[];
  overallProgressPct: number;
  completedSections: number;
}> {
  const orgWhere = { organizationId };
  const now = new Date();
  const in30 = new Date(now);
  in30.setDate(in30.getDate() + 30);

  const [
    frameworks,
    policiesPublished,
    policiesTotal,
    policyAcks,
    controlsImplemented,
    controlsTotal,
    controlsFailing,
    evidenceApproved,
    evidenceTotal,
    evidenceMissing,
    monitors,
    integrationsConnected,
    vendorPending,
    vendorTotal,
    accessDue,
    audits,
    trustPublished,
    tasksBySection,
  ] = await Promise.all([
    prisma.complianceFramework.findMany({ where: orgWhere, select: { status: true } }),
    prisma.compliancePolicy.count({ where: { ...orgWhere, status: "published" } }),
    prisma.compliancePolicy.count({ where: orgWhere }),
    prisma.compliancePolicyAcknowledgement.count({ where: orgWhere }),
    prisma.complianceControl.count({ where: { ...orgWhere, status: "implemented" } }),
    prisma.complianceControl.count({ where: orgWhere }),
    prisma.complianceControl.count({ where: { ...orgWhere, status: "failing" } }),
    prisma.complianceEvidence.count({ where: { ...orgWhere, status: { in: ["approved", "complete"] } } }),
    prisma.complianceEvidence.count({ where: orgWhere }),
    prisma.complianceEvidence.count({ where: { ...orgWhere, status: "pending" } }),
    prisma.complianceMonitor.count({ where: orgWhere }),
    prisma.complianceIntegration.count({ where: { ...orgWhere, status: "connected" } }),
    prisma.complianceVendorReview.count({ where: { ...orgWhere, reviewStatus: "pending" } }),
    prisma.complianceVendorReview.count({ where: orgWhere }),
    prisma.complianceAccessReview.count({
      where: { ...orgWhere, status: { in: ["scheduled", "in_progress"] }, dueDate: { lte: in30 } },
    }),
    prisma.complianceAudit.findMany({ where: orgWhere, select: { status: true, endDate: true } }),
    prisma.complianceTrustCenter.findUnique({ where: { organizationId }, select: { published: true } }),
    prisma.complianceTask.groupBy({
      by: ["entityType"],
      where: { ...orgWhere, status: { in: ["open", "in_progress"] } },
      _count: { id: true },
    }),
  ]);

  const taskCount = (entityType: string) =>
    tasksBySection.find((t) => t.entityType === entityType)?._count.id ?? 0;

  const activeFrameworks = frameworks.filter((f) => f.status === "active").length;
  const foundationTarget = 3;
  const foundationProgress = pct(Math.min(activeFrameworks, foundationTarget), foundationTarget);
  const foundationBlockers: string[] = [];
  if (activeFrameworks < foundationTarget) foundationBlockers.push(`Enable at least ${foundationTarget} frameworks`);
  if (controlsTotal === 0) foundationBlockers.push("Import or create controls");

  const policiesTarget = Math.max(policiesTotal, 3);
  const policiesProgress = pct(policiesPublished, policiesTarget);
  const policiesBlockers: string[] = [];
  if (policiesPublished < 3) policiesBlockers.push("Publish at least 3 core policies");

  const employeeTarget = Math.max(policiesPublished, 1);
  const employeeProgress = pct(Math.min(policyAcks, employeeTarget * 5), employeeTarget * 5);
  const employeeBlockers: string[] = [];
  if (accessDue > 0) employeeBlockers.push(`${accessDue} access review(s) due within 30 days`);
  if (policyAcks === 0 && policiesPublished > 0) employeeBlockers.push("No policy acknowledgements recorded");

  const vendorTarget = Math.max(vendorTotal, 1);
  const vendorComplete = vendorTotal - vendorPending;
  const vendorProgress = pct(vendorComplete, vendorTarget);
  const vendorBlockers: string[] = [];
  if (vendorPending > 0) vendorBlockers.push(`${vendorPending} vendor review(s) pending`);

  const monitoringTarget = Math.max(monitors, 2) + 1;
  const monitoringCurrent = monitors + integrationsConnected;
  const monitoringProgress = pct(Math.min(monitoringCurrent, monitoringTarget), monitoringTarget);
  const monitoringBlockers: string[] = [];
  if (controlsFailing > 0) monitoringBlockers.push(`${controlsFailing} failing control(s)`);
  if (integrationsConnected === 0) monitoringBlockers.push("No integrations connected");

  const auditReadyCount = audits.filter((a) => a.status === "ready" || a.status === "completed").length;
  const auditTarget = Math.max(audits.length, 1);
  const auditProgress = pct(
    auditReadyCount + (trustPublished?.published ? 1 : 0) + (evidenceApproved > 0 ? 1 : 0),
    auditTarget + 2,
  );
  const auditBlockers: string[] = [];
  if (evidenceMissing > 0) auditBlockers.push(`${evidenceMissing} evidence item(s) pending`);
  if (!trustPublished?.published) auditBlockers.push("Trust center not published");

  const sectionData: Record<string, Omit<LaunchpadSectionState, "id" | "title" | "description" | "href">> = {
    foundation: {
      progressPct: foundationProgress,
      completed: foundationProgress >= 100 && foundationBlockers.length === 0,
      blockers: foundationBlockers,
      nextAction: foundationBlockers[0] ?? "Review framework owners and scope",
      tasksGenerated: taskCount("launchpad_foundation"),
      metrics: { activeFrameworks, controlsTotal },
    },
    policies: {
      progressPct: policiesProgress,
      completed: policiesProgress >= 100 && policiesBlockers.length === 0,
      blockers: policiesBlockers,
      nextAction: policiesBlockers[0] ?? "Schedule annual policy review",
      tasksGenerated: taskCount("launchpad_policies"),
      metrics: { policiesPublished, policiesTotal },
    },
    employee: {
      progressPct: employeeProgress,
      completed: employeeProgress >= 80 && employeeBlockers.length === 0,
      blockers: employeeBlockers,
      nextAction: employeeBlockers[0] ?? "Send training reminders to staff",
      tasksGenerated: taskCount("launchpad_employee"),
      metrics: { policyAcks, accessDue },
    },
    vendor: {
      progressPct: vendorProgress,
      completed: vendorProgress >= 100 && vendorBlockers.length === 0,
      blockers: vendorBlockers,
      nextAction: vendorBlockers[0] ?? "Schedule next vendor review cycle",
      tasksGenerated: taskCount("launchpad_vendor"),
      metrics: { vendorComplete, vendorTotal },
    },
    monitoring: {
      progressPct: monitoringProgress,
      completed: monitoringProgress >= 100 && monitoringBlockers.length === 0,
      blockers: monitoringBlockers,
      nextAction: monitoringBlockers[0] ?? "Review monitor SLA configuration",
      tasksGenerated: taskCount("launchpad_monitoring"),
      metrics: { monitors, integrationsConnected, controlsFailing },
    },
    audit: {
      progressPct: auditProgress,
      completed: auditProgress >= 100 && auditBlockers.length === 0,
      blockers: auditBlockers,
      nextAction: auditBlockers[0] ?? "Prepare audit evidence package",
      tasksGenerated: taskCount("launchpad_audit"),
      metrics: { evidenceApproved, evidenceTotal, audits: audits.length },
    },
  };

  const sections: LaunchpadSectionState[] = COMPLIANCE_LAUNCHPAD_SECTIONS.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    href: s.href,
    ...sectionData[s.id],
  }));

  const completedSections = sections.filter((s) => s.completed).length;
  const overallProgressPct =
    sections.length > 0
      ? Math.round(sections.reduce((sum, s) => sum + s.progressPct, 0) / sections.length)
      : 0;

  return { sections, overallProgressPct, completedSections };
}

export async function generateLaunchpadTasks(organizationId: bigint): Promise<number> {
  const state = await computeLaunchpadState(organizationId);
  let created = 0;

  for (const section of state.sections) {
    if (section.completed || !section.nextAction || section.blockers.length === 0) continue;

    const meta = COMPLIANCE_LAUNCHPAD_SECTIONS.find((s) => s.id === section.id);
    if (!meta) continue;

    const existing = await prisma.complianceTask.findFirst({
      where: {
        organizationId,
        entityType: meta.taskEntityType,
        status: { in: ["open", "in_progress"] },
        title: section.nextAction,
      },
    });
    if (existing) continue;

    const due = new Date();
    due.setDate(due.getDate() + 14);

    await prisma.complianceTask.create({
      data: {
        organizationId,
        title: section.nextAction,
        status: "open",
        priority: section.blockers.length > 1 ? "high" : "medium",
        dueDate: due,
        entityType: meta.taskEntityType,
      },
    });
    created += 1;
  }

  return created;
}
