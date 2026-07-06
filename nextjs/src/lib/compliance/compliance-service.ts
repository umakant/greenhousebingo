import "server-only";

import type { Prisma } from "@prisma/client";
import type {
  ComplianceAccessReview,
  ComplianceAttachment,
  ComplianceAudit,
  ComplianceComment,
  ComplianceControl,
  ComplianceDocument,
  ComplianceEvidence,
  ComplianceFramework,
  ComplianceIntegration,
  ComplianceMonitor,
  ComplianceMonitorResult,
  ComplianceNotification,
  CompliancePolicy,
  ComplianceRisk,
  ComplianceTask,
  ComplianceTrustCenter,
  ComplianceVendorReview,
  ComplianceVulnerability,
} from "@prisma/client";

import {
  COMPLIANCE_FRAMEWORK_DEFAULT_ICONS,
  COMPLIANCE_FRAMEWORK_META,
} from "@/lib/compliance/compliance-frameworks";
import {
  COMPLIANCE_MONITOR_CATALOG,
  COMPLIANCE_SEED_POLICIES,
  COMPLIANCE_STARTER_CONTROLS,
  type ControlRelations,
} from "@/lib/compliance/compliance-constants";
import {
  computeRiskScore,
  parseJsonObject,
  riskMatrixLabel,
  type AccessReviewMetadata,
  type AuditMetadata,
  type RiskMetadata,
  type VendorComplianceMetadata,
  type VulnerabilityMetadata,
} from "@/lib/compliance/compliance-day2";
import { integrationProviderMeta, parseIntegrationConfig } from "@/lib/compliance/compliance-day4";
import { prisma } from "@/lib/prisma";

export type { ControlRelations } from "@/lib/compliance/compliance-constants";
export {
  COMPLIANCE_MONITOR_CATEGORIES,
  COMPLIANCE_MONITOR_CATALOG,
  COMPLIANCE_SEED_POLICIES,
  COMPLIANCE_CONTROL_CATEGORIES,
} from "@/lib/compliance/compliance-constants";

function toNum(v: bigint | number | null | undefined): number | null {
  if (v == null) return null;
  return Number(v);
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function isoDate(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

function parseRelations(raw: Prisma.JsonValue | null | undefined): ControlRelations {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const ids = (v: unknown) =>
    Array.isArray(v) ? v.map((x) => Number(x)).filter((n) => Number.isFinite(n)) : [];
  return {
    policyIds: ids(o.policyIds),
    riskIds: ids(o.riskIds),
    vendorReviewIds: ids(o.vendorReviewIds),
    monitorIds: ids(o.monitorIds),
  };
}

export async function logComplianceActivity(input: {
  organizationId: bigint;
  action: string;
  entityType: string;
  entityId?: bigint;
  actorUserId?: bigint;
  actorName?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await prisma.complianceActivityLog.create({
    data: {
      organizationId: input.organizationId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export function serializeFramework(
  row: ComplianceFramework & {
    _count?: { controls: number; mappings: number };
    owner?: { id: bigint; name: string | null; email: string | null } | null;
  },
  extras?: {
    readinessScore?: number;
    controlCount?: number;
    evidenceCount?: number;
    riskCount?: number;
    controlsImplemented?: number;
  },
) {
  const meta = COMPLIANCE_FRAMEWORK_META[row.code as keyof typeof COMPLIANCE_FRAMEWORK_META];
  return {
    id: Number(row.id),
    code: row.code,
    name: row.name,
    description: row.description ?? meta?.description ?? null,
    category: meta?.category ?? "Security",
    tags: meta?.tags ?? [],
    status: row.status,
    progressPct: row.progressPct,
    auditReadyPct: row.auditReadyPct,
    readinessScore: extras?.readinessScore ?? row.auditReadyPct,
    enabledAt: iso(row.enabledAt),
    ownerUserId: toNum(row.ownerUserId),
    ownerName: row.owner?.name ?? row.owner?.email ?? null,
    iconUrl: row.iconUrl ?? null,
    controlCount: extras?.controlCount ?? row._count?.controls ?? 0,
    controlsImplemented: extras?.controlsImplemented ?? 0,
    mappingCount: row._count?.mappings ?? 0,
    evidenceCount: extras?.evidenceCount ?? 0,
    riskCount: extras?.riskCount ?? 0,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializeControl(
  row: ComplianceControl & {
    framework?: { id: bigint; code: string; name: string } | null;
    owner?: { id: bigint; name: string | null; email: string | null } | null;
    _count?: { evidence: number; mappings: number };
  },
) {
  return {
    id: Number(row.id),
    frameworkId: toNum(row.frameworkId),
    frameworkCode: row.framework?.code ?? null,
    frameworkName: row.framework?.name ?? null,
    controlCode: row.controlCode,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    ownerUserId: toNum(row.ownerUserId),
    ownerName: row.owner?.name ?? row.owner?.email ?? null,
    dueDate: isoDate(row.dueDate),
    lastReviewedAt: iso(row.lastReviewedAt),
    testSchedule: row.testSchedule ?? null,
    nextTestAt: iso(row.nextTestAt),
    evidenceRequired: row.evidenceRequired ?? true,
    relations: parseRelations(row.relations),
    evidenceCount: row._count?.evidence ?? 0,
    mappingCount: row._count?.mappings ?? 0,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializeEvidence(
  row: ComplianceEvidence & {
    control?: { id: bigint; controlCode: string; title: string } | null;
  },
) {
  return {
    id: Number(row.id),
    controlId: toNum(row.controlId),
    controlCode: row.control?.controlCode ?? null,
    controlTitle: row.control?.title ?? null,
    title: row.title,
    evidenceType: row.evidenceType,
    status: row.status,
    sourceModule: row.sourceModule,
    sourceRecordId: toNum(row.sourceRecordId),
    collectedAt: iso(row.collectedAt),
    expiresAt: iso(row.expiresAt),
    fileUrl: row.fileUrl,
    notes: row.notes,
    auditorVisible: row.auditorVisible ?? false,
    approvedBy: toNum(row.approvedBy),
    approvedAt: iso(row.approvedAt),
    requestedAt: iso(row.requestedAt),
    requestedBy: toNum(row.requestedBy),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializePolicy(
  row: CompliancePolicy & {
    owner?: { id: bigint; name: string | null; email: string | null } | null;
    _count?: { acknowledgements: number };
  },
) {
  return {
    id: Number(row.id),
    title: row.title,
    version: row.version,
    status: row.status,
    ownerUserId: toNum(row.ownerUserId),
    ownerName: row.owner?.name ?? row.owner?.email ?? null,
    publishedAt: iso(row.publishedAt),
    reviewDueAt: iso(row.reviewDueAt),
    approvedAt: iso(row.approvedAt),
    approvedBy: toNum(row.approvedBy),
    acknowledgementRequired: row.acknowledgementRequired ?? false,
    acknowledgementCount: row._count?.acknowledgements ?? 0,
    content: row.content,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializeDocument(row: ComplianceDocument) {
  return {
    id: Number(row.id),
    title: row.title,
    docType: row.docType,
    status: row.status,
    version: row.version ?? "1.0",
    sourceModule: row.sourceModule,
    sourceRecordId: toNum(row.sourceRecordId),
    fileUrl: row.fileUrl,
    uploadedById: toNum(row.uploadedById),
    expiresAt: iso(row.expiresAt),
    approvedAt: iso(row.approvedAt),
    auditorVisible: row.auditorVisible ?? false,
    versionNotes: row.versionNotes ?? null,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializeMonitor(
  row: ComplianceMonitor & {
    owner?: { id: bigint; name: string | null; email: string | null } | null;
    results?: ComplianceMonitorResult[];
  },
  latestResult?: ComplianceMonitorResult | null,
) {
  const latest = latestResult ?? row.results?.[0] ?? null;
  return {
    id: Number(row.id),
    name: row.name,
    monitorType: row.monitorType,
    category: row.category ?? "Compliance",
    status: row.status,
    schedule: row.schedule,
    slaHours: row.slaHours ?? null,
    description: row.description,
    remediationStatus: row.remediationStatus ?? null,
    ownerUserId: toNum(row.ownerUserId),
    ownerName: row.owner?.name ?? row.owner?.email ?? null,
    lastRunAt: iso(row.lastRunAt),
    latestResult: latest
      ? {
          status: latest.status,
          summary: latest.summary,
          ranAt: iso(latest.ranAt),
        }
      : null,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export async function computeFrameworkReadiness(organizationId: bigint, frameworkId: bigint) {
  const mappings = await prisma.complianceControlMapping.findMany({
    where: { organizationId, frameworkId },
    select: { controlId: true },
  });
  const controlIds = mappings.map((m) => m.controlId);
  if (controlIds.length === 0) {
    const fw = await prisma.complianceFramework.findFirst({ where: { id: frameworkId, organizationId } });
    return { readinessScore: fw?.auditReadyPct ?? 0, controlCount: 0, evidenceCount: 0, implemented: 0 };
  }

  const controls = await prisma.complianceControl.findMany({
    where: { organizationId, id: { in: controlIds } },
    select: { id: true, status: true },
  });
  const implemented = controls.filter((c) => c.status === "implemented").length;
  const evidenceCount = await prisma.complianceEvidence.count({
    where: { organizationId, controlId: { in: controlIds }, status: { in: ["complete", "approved"] } },
  });
  const readinessScore = Math.round(
    (implemented / Math.max(controls.length, 1)) * 60 + (Math.min(evidenceCount, controls.length) / Math.max(controls.length, 1)) * 40,
  );
  return { readinessScore, controlCount: controls.length, evidenceCount, implemented };
}

export async function ensureComplianceOperationalSeed(organizationId: bigint) {
  const [frameworkCount, policyCount, monitorCount, controlCount, documentCount] = await Promise.all([
    prisma.complianceFramework.count({ where: { organizationId } }),
    prisma.compliancePolicy.count({ where: { organizationId } }),
    prisma.complianceMonitor.count({ where: { organizationId } }),
    prisma.complianceControl.count({ where: { organizationId } }),
    prisma.complianceDocument.count({ where: { organizationId } }),
  ]);

  if (frameworkCount === 0) {
    for (const [code, meta] of Object.entries(COMPLIANCE_FRAMEWORK_META)) {
      const frameworkCode = code as keyof typeof COMPLIANCE_FRAMEWORK_DEFAULT_ICONS;
      await prisma.complianceFramework.create({
        data: {
          organizationId,
          code,
          name: meta.name,
          description: meta.description,
          status: "active",
          iconUrl: COMPLIANCE_FRAMEWORK_DEFAULT_ICONS[frameworkCode] ?? null,
          enabledAt: new Date(),
        },
      });
    }
  } else {
    for (const [code, iconUrl] of Object.entries(COMPLIANCE_FRAMEWORK_DEFAULT_ICONS)) {
      await prisma.complianceFramework.updateMany({
        where: { organizationId, code, iconUrl: null },
        data: { iconUrl },
      });
    }
  }

  if (policyCount < COMPLIANCE_SEED_POLICIES.length) {
    const existing = await prisma.compliancePolicy.findMany({
      where: { organizationId },
      select: { title: true },
    });
    const titles = new Set(existing.map((p) => p.title.toLowerCase()));
    for (const [i, title] of COMPLIANCE_SEED_POLICIES.entries()) {
      if (titles.has(title.toLowerCase())) continue;
      await prisma.compliancePolicy.create({
        data: {
          organizationId,
          title,
          version: "1.0",
          status: i < 4 ? "published" : "draft",
          publishedAt: i < 4 ? new Date() : null,
          reviewDueAt: new Date(Date.now() + 90 * 86400000),
          acknowledgementRequired: i < 4,
          content: `${title} — organizational policy template. Customize and publish for your audit program.`,
        },
      });
    }
  }

  if (monitorCount < COMPLIANCE_MONITOR_CATALOG.length) {
    const existing = await prisma.complianceMonitor.findMany({
      where: { organizationId },
      select: { name: true },
    });
    const names = new Set(existing.map((m) => m.name.toLowerCase()));
    for (const def of COMPLIANCE_MONITOR_CATALOG) {
      if (names.has(def.name.toLowerCase())) continue;
      const monitor = await prisma.complianceMonitor.create({
        data: {
          organizationId,
          name: def.name,
          monitorType: def.monitorType,
          category: def.category,
          status: "active",
          schedule: def.schedule,
          slaHours: def.slaHours,
          description: `${def.name} compliance monitor`,
        },
      });
      await prisma.complianceMonitorResult.create({
        data: {
          organizationId,
          monitorId: monitor.id,
          status: def.key === "public_ports" ? "fail" : "pass",
          summary: def.key === "public_ports" ? "1 open port detected on staging" : "Check passed",
        },
      });
    }
  }

  if (controlCount === 0) {
    const soc2 = await prisma.complianceFramework.findFirst({
      where: { organizationId, code: "SOC2" },
      select: { id: true },
    });
    const policies = await prisma.compliancePolicy.findMany({
      where: { organizationId },
      select: { id: true, title: true },
      take: 3,
    });
    const monitors = await prisma.complianceMonitor.findMany({
      where: { organizationId },
      select: { id: true },
      take: 2,
    });
    for (const c of COMPLIANCE_STARTER_CONTROLS) {
      const control = await prisma.complianceControl.create({
        data: {
          organizationId,
          frameworkId: soc2?.id ?? null,
          controlCode: c.code,
          title: c.title,
          category: c.category,
          status: c.status,
          testSchedule: c.testSchedule,
          nextTestAt: new Date(Date.now() + 90 * 86400000),
          evidenceRequired: true,
          relations: {
            policyIds: policies.map((p) => Number(p.id)),
            monitorIds: monitors.map((m) => Number(m.id)),
          } as Prisma.InputJsonValue,
        },
      });
      if (soc2) {
        await prisma.complianceControlMapping.create({
          data: {
            organizationId,
            frameworkId: soc2.id,
            controlId: control.id,
            mappedControlCode: c.code,
          },
        });
      }
      if (c.status === "implemented" || c.status === "in_progress") {
        await prisma.complianceEvidence.create({
          data: {
            organizationId,
            controlId: control.id,
            title: `Evidence for ${c.code}`,
            evidenceType: "document",
            status: c.status === "implemented" ? "approved" : "pending",
            auditorVisible: c.status === "implemented",
            collectedAt: c.status === "implemented" ? new Date() : null,
          },
        });
      }
    }
  }

  if (documentCount === 0) {
    await prisma.complianceDocument.createMany({
      data: [
        {
          organizationId,
          title: "SOC 2 readiness checklist",
          docType: "checklist",
          status: "active",
          version: "1.0",
          sourceModule: "compliance",
        },
        {
          organizationId,
          title: "Data processing agreement template",
          docType: "legal",
          status: "draft",
          version: "1.0",
          sourceModule: "compliance",
        },
      ],
    });
  }
}

export async function refreshMonitor(organizationId: bigint, monitorId: bigint) {
  const monitor = await prisma.complianceMonitor.findFirst({
    where: { id: monitorId, organizationId },
  });
  if (!monitor) return null;

  const lastResults = await prisma.complianceMonitorResult.findMany({
    where: { monitorId },
    orderBy: { ranAt: "desc" },
    take: 3,
    select: { status: true },
  });
  const prevFail = lastResults[0]?.status === "fail";
  const status = prevFail && Math.random() > 0.4 ? "pass" : prevFail ? "fail" : Math.random() > 0.85 ? "fail" : "pass";

  const result = await prisma.complianceMonitorResult.create({
    data: {
      organizationId,
      monitorId,
      status,
      summary: status === "pass" ? "Monitor check passed" : "Monitor check failed — remediation required",
      details: { refreshedAt: new Date().toISOString(), automated: monitor.monitorType === "automated" },
    },
  });

  await prisma.complianceMonitor.update({
    where: { id: monitorId },
    data: {
      lastRunAt: new Date(),
      remediationStatus: status === "fail" ? "open" : "none",
      updatedAt: new Date(),
    },
  });

  return result;
}

export async function loadOwner(userId: bigint | null | undefined) {
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
}

function parseMeta<T extends Record<string, unknown>>(raw: Prisma.JsonValue | null | undefined, fallback: T): T {
  return parseJsonObject(raw, fallback);
}

export function serializeRisk(
  row: ComplianceRisk & {
    owner?: { id: bigint; name: string | null; email: string | null } | null;
  },
) {
  const meta = parseMeta<RiskMetadata>(row.metadata, {});
  const impact = row.severity;
  const riskScore = computeRiskScore(impact, row.likelihood);
  const residualImpact = meta.residualImpact ?? impact;
  const residualLikelihood = meta.residualLikelihood ?? row.likelihood;
  const residualScore = computeRiskScore(residualImpact, residualLikelihood);
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    impact,
    likelihood: row.likelihood,
    riskScore,
    riskLevel: riskMatrixLabel(riskScore),
    status: row.status,
    ownerUserId: toNum(row.ownerUserId),
    ownerName: row.owner?.name ?? row.owner?.email ?? null,
    dueDate: isoDate(row.dueDate),
    mitigationPlan: meta.mitigationPlan ?? null,
    residualImpact,
    residualLikelihood,
    residualScore,
    residualLevel: riskMatrixLabel(residualScore),
    reviewNotes: meta.reviewNotes ?? null,
    lastReviewedAt: iso(row.lastReviewedAt ?? (meta.lastReviewedAt ? new Date(meta.lastReviewedAt) : null)),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializeVendorReview(
  row: ComplianceVendorReview & {
    crmVendor?: { id: bigint; name: string | null; email: string | null } | null;
  },
) {
  const meta = parseMeta<VendorComplianceMetadata>(row.metadata, {});
  return {
    id: Number(row.id),
    vendorId: toNum(row.vendorId),
    vendorName: row.vendorName,
    crmVendorName: row.crmVendor?.name ?? null,
    reviewStatus: row.reviewStatus,
    riskTier: row.riskTier,
    dueDate: isoDate(row.dueDate),
    completedAt: iso(row.completedAt),
    notes: row.notes,
    dataClassification: meta.dataClassification ?? null,
    soc2Status: meta.soc2Status ?? null,
    isoStatus: meta.isoStatus ?? null,
    hipaaBaa: meta.hipaaBaa ?? null,
    gdprDpa: meta.gdprDpa ?? null,
    reviewSchedule: meta.reviewSchedule ?? null,
    lastReviewNotes: meta.lastReviewNotes ?? null,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializeAccessReview(
  row: ComplianceAccessReview & {
    reviewer?: { id: bigint; name: string | null; email: string | null } | null;
  },
) {
  const meta = parseMeta<AccessReviewMetadata>(row.metadata, { userReviews: [] });
  const userReviews = meta.userReviews ?? [];
  const approved = userReviews.filter((u) => u.decision === "approved").length;
  const revoked = userReviews.filter((u) => u.decision === "revoked").length;
  const exceptions = userReviews.filter((u) => u.decision === "exception").length;
  return {
    id: Number(row.id),
    name: row.name,
    scope: row.scope,
    status: row.status,
    dueDate: isoDate(row.dueDate),
    completedAt: iso(row.completedAt),
    reviewerUserId: toNum(row.reviewerUserId),
    reviewerName: row.reviewer?.name ?? row.reviewer?.email ?? null,
    userReviews,
    approvedCount: approved,
    revokedCount: revoked,
    exceptionCount: exceptions,
    evidenceExportedAt: meta.evidenceExportedAt ?? null,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializeVulnerability(
  row: ComplianceVulnerability & {
    owner?: { id: bigint; name: string | null; email: string | null } | null;
  },
) {
  const meta = parseMeta<VulnerabilityMetadata>(row.metadata, {});
  return {
    id: Number(row.id),
    title: row.title,
    cveId: row.cveId,
    severity: row.severity,
    status: row.status,
    assetName: row.assetName,
    discoveredAt: iso(row.discoveredAt),
    remediatedAt: iso(row.remediatedAt),
    ownerUserId: meta.ownerUserId ?? null,
    ownerName: row.owner?.name ?? row.owner?.email ?? null,
    dueDate: meta.dueDate ?? null,
    frameworkIds: meta.frameworkIds ?? [],
    remediationSteps: meta.remediationSteps ?? [],
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializeAudit(
  row: ComplianceAudit & {
    framework?: { id: bigint; code: string; name: string } | null;
  },
) {
  const meta = parseMeta<AuditMetadata>(row.metadata, {
    findings: [],
    evidencePackages: [],
    requests: [],
  });
  return {
    id: Number(row.id),
    frameworkId: toNum(row.frameworkId),
    frameworkCode: row.framework?.code ?? null,
    frameworkName: row.framework?.name ?? null,
    name: row.name,
    auditType: row.auditType,
    status: row.status,
    auditorName: row.auditorName,
    startDate: isoDate(row.startDate),
    endDate: isoDate(row.endDate),
    findings: meta.findings ?? [],
    evidencePackages: meta.evidencePackages ?? [],
    requests: meta.requests ?? [],
    finalReportUrl: meta.finalReportUrl ?? null,
    auditorUserIds: meta.auditorUserIds ?? [],
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializeTrustCenter(row: ComplianceTrustCenter & { organizationName?: string | null }) {
  return {
    id: Number(row.id),
    published: row.published,
    publicSlug: row.publicSlug,
    publicUrl: row.publicUrl,
    auditorPortalEnabled: row.auditorPortalEnabled,
    activeAuditors: row.activeAuditors,
    sections: row.sections,
    organizationName: row.organizationName ?? null,
    lastUpdatedAt: iso(row.lastUpdatedAt),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializeTask(
  row: ComplianceTask & {
    assignee?: { id: bigint; name: string | null; email: string | null } | null;
    commentCount?: number;
    attachmentCount?: number;
  },
) {
  return {
    id: Number(row.id),
    title: row.title,
    status: row.status,
    priority: row.priority,
    dueDate: isoDate(row.dueDate),
    assigneeUserId: toNum(row.assigneeUserId),
    assigneeName: row.assignee?.name ?? row.assignee?.email ?? null,
    entityType: row.entityType,
    entityId: toNum(row.entityId),
    commentCount: row.commentCount ?? 0,
    attachmentCount: row.attachmentCount ?? 0,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializeIntegration(row: ComplianceIntegration) {
  const meta = integrationProviderMeta(row.provider);
  const config = parseIntegrationConfig(row.config);
  return {
    id: Number(row.id),
    provider: row.provider,
    providerName: meta?.name ?? row.provider,
    category: meta?.category ?? "other",
    status: row.status,
    lastSyncAt: iso(row.lastSyncAt),
    controlsSupported: meta?.controlsSupported ?? [],
    monitorsSupported: meta?.monitorsSupported ?? [],
    scope: config.scope ?? meta?.defaultScope ?? {},
    syncLogs: config.syncLogs ?? [],
    credentialsConfigured: config.credentialsConfigured ?? false,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

export function serializeNotification(row: ComplianceNotification) {
  return {
    id: Number(row.id),
    title: row.title,
    body: row.body,
    severity: row.severity,
    link: row.link,
    readAt: iso(row.readAt),
    createdAt: iso(row.createdAt),
  };
}

export function serializeComment(row: ComplianceComment) {
  return {
    id: Number(row.id),
    entityType: row.entityType,
    entityId: Number(row.entityId),
    body: row.body,
    authorUserId: toNum(row.authorUserId),
    authorName: row.authorName,
    createdAt: iso(row.createdAt),
  };
}

export function serializeAttachment(row: ComplianceAttachment) {
  return {
    id: Number(row.id),
    entityType: row.entityType,
    entityId: Number(row.entityId),
    fileName: row.fileName,
    fileUrl: row.fileUrl,
    mimeType: row.mimeType,
    uploadedById: toNum(row.uploadedById),
    createdAt: iso(row.createdAt),
  };
}
