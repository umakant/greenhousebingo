import "server-only";

import type { ComplianceNotificationType } from "@/lib/compliance/compliance-day4";
import { prisma } from "@/lib/prisma";

type NotificationDraft = {
  type: ComplianceNotificationType;
  title: string;
  body: string;
  link: string;
  severity: "info" | "warning" | "critical";
};

async function upsertNotification(organizationId: bigint, draft: NotificationDraft) {
  const existing = await prisma.complianceNotification.findFirst({
    where: {
      organizationId,
      title: draft.title,
      readAt: null,
      createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
    },
  });
  if (existing) return null;

  return prisma.complianceNotification.create({
    data: {
      organizationId,
      title: draft.title,
      body: draft.body,
      severity: draft.severity,
      link: draft.link,
    },
  });
}

export async function scanComplianceNotifications(organizationId: bigint): Promise<number> {
  const orgWhere = { organizationId };
  const now = new Date();
  const in14 = new Date(now);
  in14.setDate(in14.getDate() + 14);
  const in30 = new Date(now);
  in30.setDate(in30.getDate() + 30);

  const drafts: NotificationDraft[] = [];

  const [missingEvidence, failingControls, upcomingAudits, expiringDocs, vendorDue, accessDue] =
    await Promise.all([
      prisma.complianceEvidence.count({
        where: { ...orgWhere, status: { in: ["pending", "rejected"] } },
      }),
      prisma.complianceControl.findMany({
        where: { ...orgWhere, status: "failing" },
        take: 5,
        select: { controlCode: true, title: true },
      }),
      prisma.complianceAudit.findMany({
        where: { ...orgWhere, endDate: { lte: in30, gte: now }, status: { not: "completed" } },
        take: 5,
        select: { name: true, endDate: true },
      }),
      prisma.complianceDocument.findMany({
        where: { ...orgWhere, expiresAt: { lte: in30, gte: now } },
        take: 5,
        select: { title: true, expiresAt: true },
      }),
      prisma.complianceVendorReview.findMany({
        where: { ...orgWhere, reviewStatus: "pending", dueDate: { lte: in30 } },
        take: 5,
        select: { vendorName: true },
      }),
      prisma.complianceAccessReview.findMany({
        where: {
          ...orgWhere,
          status: { in: ["scheduled", "in_progress"] },
          dueDate: { lte: in14 },
        },
        take: 5,
        select: { name: true, dueDate: true },
      }),
    ]);

  if (missingEvidence > 0) {
    drafts.push({
      type: "missing_evidence",
      title: "Missing evidence items",
      body: `${missingEvidence} evidence item(s) need collection or approval.`,
      link: "/compliance/evidence",
      severity: missingEvidence > 5 ? "critical" : "warning",
    });
  }

  for (const c of failingControls) {
    drafts.push({
      type: "failed_control",
      title: `Control failing: ${c.controlCode}`,
      body: c.title,
      link: "/compliance/controls",
      severity: "critical",
    });
  }

  for (const a of upcomingAudits) {
    drafts.push({
      type: "audit_deadline",
      title: `Audit deadline: ${a.name}`,
      body: `Audit ends ${a.endDate?.toISOString().slice(0, 10) ?? "soon"}.`,
      link: "/compliance/audits",
      severity: "warning",
    });
  }

  for (const d of expiringDocs) {
    drafts.push({
      type: "expiring_document",
      title: `Document expiring: ${d.title}`,
      body: `Expires ${d.expiresAt?.toISOString().slice(0, 10) ?? "soon"}.`,
      link: "/compliance/documents",
      severity: "info",
    });
  }

  for (const v of vendorDue) {
    drafts.push({
      type: "vendor_review_due",
      title: `Vendor review due: ${v.vendorName}`,
      body: "Complete vendor risk assessment.",
      link: "/compliance/vendors",
      severity: "warning",
    });
  }

  for (const r of accessDue) {
    drafts.push({
      type: "training_due",
      title: `Access review due: ${r.name}`,
      body: `Due ${r.dueDate?.toISOString().slice(0, 10) ?? "soon"}.`,
      link: "/compliance/access-reviews",
      severity: "warning",
    });
  }

  let created = 0;
  for (const draft of drafts) {
    const row = await upsertNotification(organizationId, draft);
    if (row) created += 1;
  }
  return created;
}
