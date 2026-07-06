/* eslint-disable no-console */
/**
 * Seed Vanta-style compliance demo data matching UI mockups.
 * Usage:
 *   npm run db:seed:compliance
 *   npm run db:seed:compliance:force
 *   npm run db:seed:compliance:first-aid
 *
 * Target one company (recommended on production):
 *   node ./scripts/seed-compliance-demo.js --force --email=tommy@firstaidresponders.net
 *   node ./scripts/seed-compliance-demo.js --force --name="First Aid Responders"
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const FORCE = process.argv.includes("--force");

function readArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit ? hit.slice(prefix.length + 1).trim() : null;
}

const FILTER_EMAIL = readArg("--email");
const FILTER_NAME = readArg("--name");

const FRAMEWORK_ICONS = {
  GDPR: "/images/compliance/frameworks/gdpr.png",
  HIPAA: "/images/compliance/frameworks/hipaa.png",
  SOC2: "/images/compliance/frameworks/soc2.png",
  ISO27001: "/images/compliance/frameworks/iso27001.png",
  USDP: "/images/compliance/frameworks/usdp.png",
  NIST_CSF: "/images/compliance/frameworks/nist-csf.png",
};

const FRAMEWORKS = [
  { code: "GDPR", name: "GDPR", progressPct: 92, auditReadyPct: 90, updatedHoursAgo: 48 },
  { code: "HIPAA", name: "HIPAA", progressPct: 74, auditReadyPct: 72, updatedHoursAgo: 168 },
  { code: "SOC2", name: "SOC 2", progressPct: 61, auditReadyPct: 58, updatedHoursAgo: 24 },
  { code: "ISO27001", name: "ISO 27001", progressPct: 54, auditReadyPct: 52, updatedHoursAgo: 72 },
  { code: "USDP", name: "USDP", progressPct: 83, auditReadyPct: 80, updatedHoursAgo: 120 },
  { code: "NIST_CSF", name: "NIST CSF", progressPct: 71, auditReadyPct: 68, updatedHoursAgo: 96 },
];

const FRAMEWORK_DESCRIPTIONS = {
  GDPR: "EU General Data Protection Regulation privacy and data protection requirements.",
  HIPAA: "US health information privacy and security standards.",
  SOC2: "Service organization controls for security, availability, and confidentiality.",
  ISO27001: "Information security management system (ISMS) international standard.",
  USDP: "US Data Privacy framework for consumer data protection programs.",
  NIST_CSF: "NIST Cybersecurity Framework for identifying and managing cyber risk.",
};

const CONTROL_STATUS_COUNTS = { implemented: 189, in_progress: 22, failing: 7 };
const EVIDENCE_STATUS_COUNTS = { approved: 120, complete: 34, pending: 22, rejected: 4, draft: 11 };

const RISK_SEVERITY_COUNTS = { critical: 2, high: 5, medium: 13, low: 21 };
const VULN_SEVERITY_OPEN = { critical: 0, high: 4, medium: 17, low: 33, informational: 12 };

const MONITORS = [
  { name: "Public Ports Restricted", category: "Security", pass: true, hoursAgo: 3 },
  { name: "MFA Enabled", category: "Access Control", pass: true, hoursAgo: 2 },
  { name: "Employee Training", category: "HR", pass: false, hoursAgo: 24 },
  { name: "Background Checks", category: "HR", pass: true, hoursAgo: 48 },
  { name: "Vendor Reviews", category: "Vendor Management", pass: false, hoursAgo: 72, overdue: true },
  { name: "S3 Buckets Publicly Restricted", category: "Cloud", pass: true, hoursAgo: 5 },
  { name: "SSO Enabled", category: "Security", pass: true, hoursAgo: 6 },
  { name: "Encryption at Rest", category: "Cloud", pass: true, hoursAgo: 8 },
  { name: "Backup Verification", category: "Cloud", pass: true, hoursAgo: 12 },
  { name: "Policy Reviews", category: "Compliance", pass: false, hoursAgo: 36 },
];

const VENDORS = [
  { vendorName: "Amazon Web Services", riskTier: "low", reviewStatus: "completed" },
  { vendorName: "Google Workspace", riskTier: "low", reviewStatus: "completed" },
  { vendorName: "Microsoft 365", riskTier: "medium", reviewStatus: "completed" },
  { vendorName: "Okta", riskTier: "medium", reviewStatus: "pending" },
  { vendorName: "Datadog", riskTier: "low", reviewStatus: "completed" },
  { vendorName: "Payroll SaaS", riskTier: "high", reviewStatus: "pending" },
];

const POLICIES = [
  "Information Security Policy",
  "Access Control Policy",
  "Password Policy",
  "Privacy Policy",
  "Vendor Management Policy",
  "Incident Response Policy",
  "Business Continuity Policy",
  "Acceptable Use Policy",
  "HIPAA Security Policy",
  "GDPR Data Protection Policy",
];

async function wipeOrgCompliance(orgId) {
  const w = { where: { organizationId: orgId } };
  await prisma.complianceComment.deleteMany(w);
  await prisma.complianceAttachment.deleteMany(w);
  await prisma.compliancePolicyAcknowledgement.deleteMany(w);
  await prisma.complianceControlRemediation.deleteMany(w);
  await prisma.complianceMonitorResult.deleteMany(w);
  await prisma.complianceControlMapping.deleteMany(w);
  await prisma.complianceEvidence.deleteMany(w);
  await prisma.complianceAuditorInvite.deleteMany(w);
  await prisma.complianceTask.deleteMany(w);
  await prisma.complianceNotification.deleteMany(w);
  await prisma.complianceActivityLog.deleteMany(w);
  await prisma.complianceIntegration.deleteMany(w);
  await prisma.complianceRisk.deleteMany(w);
  await prisma.complianceVendorReview.deleteMany(w);
  await prisma.complianceAccessReview.deleteMany(w);
  await prisma.complianceVulnerability.deleteMany(w);
  await prisma.complianceAudit.deleteMany(w);
  await prisma.complianceMonitor.deleteMany(w);
  await prisma.complianceDocument.deleteMany(w);
  await prisma.compliancePolicy.deleteMany(w);
  await prisma.complianceControl.deleteMany(w);
  await prisma.complianceFramework.deleteMany(w);
  await prisma.complianceTrustCenter.deleteMany({ where: { organizationId: orgId } });
}

function hoursAgo(h) {
  return new Date(Date.now() - h * 3600000);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const where = { type: "company", isActive: true };
  if (FILTER_EMAIL) where.email = { equals: FILTER_EMAIL, mode: "insensitive" };
  if (FILTER_NAME) where.name = { contains: FILTER_NAME, mode: "insensitive" };

  let companies = await prisma.user.findMany({
    where,
    orderBy: { id: "asc" },
    select: { id: true, name: true, email: true },
  });

  if (!companies.length && (FILTER_EMAIL || FILTER_NAME)) {
    console.error(
      `No company matched filter${FILTER_EMAIL ? ` email=${FILTER_EMAIL}` : ""}${FILTER_NAME ? ` name=${FILTER_NAME}` : ""}.`,
    );
    process.exit(1);
  }

  if (!companies.length) {
    console.error("No company user found.");
    process.exit(1);
  }

  if (FILTER_EMAIL || FILTER_NAME) {
    console.log(
      `Targeting ${companies.length} company tenant(s)${FILTER_EMAIL ? ` (${FILTER_EMAIL})` : FILTER_NAME ? ` (${FILTER_NAME})` : ""}…`,
    );
  }

  for (const company of companies) {
    const orgId = company.id;
    const existing = await prisma.complianceFramework.count({ where: { organizationId: orgId } });

    if (existing > 0 && !FORCE) {
      console.log(`Skip org ${orgId} (${company.name ?? company.email}) — already seeded. Use --force.`);
      continue;
    }

    if (FORCE && existing > 0) {
      console.log(`Wiping org ${orgId} (${company.name ?? company.email})…`);
      await wipeOrgCompliance(orgId);
    }

    await seedOrg(orgId, company);
  }

  console.log(
    FILTER_EMAIL || FILTER_NAME
      ? "✓ Compliance mockup seed complete for targeted company tenant(s)."
      : "✓ Compliance mockup seed complete for all company tenants.",
  );
}

async function seedOrg(orgId, company) {
  console.log(`Seeding compliance mockup data for org ${orgId} (${company.name ?? company.email})`);

  const frameworkRows = [];
  for (const fw of FRAMEWORKS) {
    frameworkRows.push(
      await prisma.complianceFramework.create({
        data: {
          organizationId: orgId,
          code: fw.code,
          name: fw.name,
          description: FRAMEWORK_DESCRIPTIONS[fw.code] ?? `${fw.name} compliance program`,
          status: "active",
          progressPct: fw.progressPct,
          auditReadyPct: fw.auditReadyPct,
          iconUrl: FRAMEWORK_ICONS[fw.code] ?? null,
          enabledAt: new Date(),
          updatedAt: hoursAgo(fw.updatedHoursAgo ?? 48),
        },
      }),
    );
  }

  const soc2 = frameworkRows.find((f) => f.code === "SOC2");
  const controlRecords = [];
  let controlIdx = 0;
  for (const [status, count] of Object.entries(CONTROL_STATUS_COUNTS)) {
    for (let i = 0; i < count; i++) {
      controlIdx += 1;
      const code = `CC${Math.floor(controlIdx / 10) + 1}.${(controlIdx % 10) + 1}`;
      controlRecords.push({
        organizationId: orgId,
        frameworkId: soc2?.id ?? null,
        controlCode: code,
        title: `Control ${code} — ${status === "implemented" ? "Passing" : status === "in_progress" ? "Needs review" : "Failed"} check`,
        category: ["Security", "Governance", "Access", "Network", "Identity"][controlIdx % 5],
        status,
        lastReviewedAt: status === "implemented" ? hoursAgo(24 * (controlIdx % 14)) : null,
        nextTestAt: new Date(Date.now() + (controlIdx % 90) * 86400000),
        testSchedule: "quarterly",
        evidenceRequired: true,
      });
    }
  }

  for (const batch of chunk(controlRecords, 50)) {
    await prisma.complianceControl.createMany({ data: batch });
  }

  const controls = await prisma.complianceControl.findMany({
    where: { organizationId: orgId },
    select: { id: true, controlCode: true },
    orderBy: { id: "asc" },
  });

  if (soc2) {
    const mappings = controls.map((c) => ({
      organizationId: orgId,
      frameworkId: soc2.id,
      controlId: c.id,
      mappedControlCode: c.controlCode,
    }));
    for (const batch of chunk(mappings, 50)) {
      await prisma.complianceControlMapping.createMany({ data: batch });
    }
  }

  const evidenceRecords = [];
  let evIdx = 0;
  const evidenceTitles = [
    "Access Review Q1 2024",
    "MFA enrollment screenshot",
    "SOC 2 system description",
    "Vendor DPA — AWS",
    "Penetration test report",
    "Employee training completion",
  ];
  for (const [status, count] of Object.entries(EVIDENCE_STATUS_COUNTS)) {
    for (let i = 0; i < count; i++) {
      evIdx += 1;
      const control = controls[evIdx % controls.length];
      evidenceRecords.push({
        organizationId: orgId,
        controlId: control?.id ?? null,
        title: evidenceTitles[evIdx % evidenceTitles.length] + (evIdx > 5 ? ` #${evIdx}` : ""),
        evidenceType: evIdx % 3 === 0 ? "screenshot" : "document",
        status,
        sourceModule: evIdx % 4 === 0 ? "hrm" : evIdx % 4 === 1 ? "lms" : null,
        collectedAt: status !== "draft" ? hoursAgo(evIdx % 48) : null,
        expiresAt: evIdx % 17 === 0 ? new Date(Date.now() + 14 * 86400000) : null,
        auditorVisible: status === "approved" || status === "complete",
      });
    }
  }
  for (const batch of chunk(evidenceRecords, 50)) {
    await prisma.complianceEvidence.createMany({ data: batch });
  }

  for (const [i, title] of POLICIES.entries()) {
    await prisma.compliancePolicy.create({
      data: {
        organizationId: orgId,
        title,
        status: i < 6 ? "published" : i < 8 ? "draft" : "in_review",
        version: i < 6 ? "2.1" : "1.0",
        publishedAt: i < 6 ? hoursAgo(30 * 24) : null,
        reviewDueAt: new Date(Date.now() + (90 + i * 7) * 86400000),
        acknowledgementRequired: i < 6,
        content: `${title} — organizational policy.`,
      },
    });
  }

  await prisma.complianceDocument.createMany({
    data: [
      {
        organizationId: orgId,
        title: "SOC 2 Type II report",
        docType: "audit_report",
        status: "active",
        sourceModule: "compliance",
        expiresAt: new Date(Date.now() + 180 * 86400000),
      },
      {
        organizationId: orgId,
        title: "ISO 27001 certificate",
        docType: "certification",
        status: "active",
        sourceModule: "compliance",
      },
      {
        organizationId: orgId,
        title: "Data processing agreement template",
        docType: "legal",
        status: "active",
        sourceModule: "compliance",
        expiresAt: new Date(Date.now() + 21 * 86400000),
      },
    ],
  });

  for (const m of MONITORS) {
    const monitor = await prisma.complianceMonitor.create({
      data: {
        organizationId: orgId,
        name: m.name,
        monitorType: m.category === "HR" || m.category === "Vendor Management" ? "manual" : "automated",
        category: m.category,
        status: "active",
        schedule: "daily",
        slaHours: 24,
        description: `${m.name} compliance monitor`,
        lastRunAt: hoursAgo(m.hoursAgo),
        remediationStatus: m.pass ? "none" : "open",
      },
    });
    await prisma.complianceMonitorResult.create({
      data: {
        organizationId: orgId,
        monitorId: monitor.id,
        status: m.pass ? "pass" : "fail",
        summary: m.pass ? "Check passed" : m.overdue ? "Overdue — remediation required" : "Needs attention",
        ranAt: hoursAgo(m.hoursAgo),
      },
    });
  }

  const riskRecords = [];
  for (const [severity, count] of Object.entries(RISK_SEVERITY_COUNTS)) {
    for (let i = 0; i < count; i++) {
      riskRecords.push({
        organizationId: orgId,
        title:
          severity === "critical"
            ? "Unencrypted S3 Buckets"
            : severity === "high"
              ? "Legacy system without MFA"
              : `Risk item ${severity} #${i + 1}`,
        severity,
        likelihood: severity === "critical" ? "likely" : "possible",
        status: "open",
        dueDate: new Date(Date.now() + (14 + i) * 86400000),
      });
    }
  }
  await prisma.complianceRisk.createMany({ data: riskRecords });

  for (const v of VENDORS) {
    await prisma.complianceVendorReview.create({
      data: {
        organizationId: orgId,
        vendorName: v.vendorName,
        reviewStatus: v.reviewStatus,
        riskTier: v.riskTier,
        dueDate: v.reviewStatus === "pending" ? new Date(Date.now() + 14 * 86400000) : null,
        completedAt: v.reviewStatus === "completed" ? hoursAgo(48) : null,
      },
    });
  }

  await prisma.complianceAccessReview.createMany({
    data: [
      {
        organizationId: orgId,
        name: "Q1 Admin access review",
        scope: "All admin roles",
        status: "in_progress",
        dueDate: new Date(Date.now() + 7 * 86400000),
      },
      {
        organizationId: orgId,
        name: "Employee app access certification",
        scope: "Production systems",
        status: "scheduled",
        dueDate: new Date(Date.now() + 21 * 86400000),
      },
    ],
  });

  const vulnRecords = [];
  for (const [severity, count] of Object.entries(VULN_SEVERITY_OPEN)) {
    for (let i = 0; i < count; i++) {
      vulnRecords.push({
        organizationId: orgId,
        title: `Vulnerability ${severity} #${i + 1}`,
        cveId: severity === "high" ? `CVE-2024-${1000 + i}` : null,
        severity,
        status: "open",
        assetName: `server-${(i % 5) + 1}`,
        discoveredAt: hoursAgo(24 * (i + 1)),
      });
    }
  }
  await prisma.complianceVulnerability.createMany({ data: vulnRecords });
  await prisma.complianceVulnerability.createMany({
    data: [
      {
        organizationId: orgId,
        title: "Resolved XSS in portal",
        severity: "medium",
        status: "remediated",
        remediatedAt: hoursAgo(72),
      },
    ],
  });

  const auditSeeds = [
    {
      name: "SOC 2 Type II - 2026",
      auditType: "soc2_type_ii",
      status: "in_progress",
      auditorName: "External Audit Partners",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-08-31"),
      frameworkCode: "SOC2",
      findings: [
        { id: "f1", title: "Access review documentation gap", severity: "medium", status: "open" },
        { id: "f2", title: "Change management log incomplete", severity: "low", status: "open" },
      ],
      requests: [
        { id: "1", title: "Access review evidence", status: "open" },
        { id: "2", title: "Change management logs", status: "open" },
      ],
    },
    { name: "HIPAA Security Assessment", auditType: "hipaa", status: "fieldwork", auditorName: "Deloitte", startDate: new Date("2026-05-15"), endDate: new Date("2026-07-15"), frameworkCode: "HIPAA" },
    { name: "ISO 27001 Surveillance Audit", auditType: "iso27001", status: "in_progress", auditorName: "Schellman & Company", startDate: new Date("2026-04-01"), endDate: new Date("2026-06-30"), frameworkCode: "ISO27001" },
    { name: "GDPR Compliance Review", auditType: "gdpr", status: "reporting", auditorName: "KPMG", startDate: new Date("2026-03-01"), endDate: new Date("2026-05-31"), frameworkCode: "GDPR" },
    { name: "NIST CSF Gap Assessment", auditType: "nist_csf", status: "in_progress", auditorName: "A-LIGN", startDate: new Date("2026-02-01"), endDate: new Date("2026-04-30"), frameworkCode: "NIST_CSF" },
    { name: "SOC 2 Type I Readiness", auditType: "soc2_type_i", status: "planned", auditorName: "External Audit Partners", startDate: new Date("2026-09-01"), endDate: new Date("2026-10-31"), frameworkCode: "SOC2" },
    { name: "Internal Security Controls Review", auditType: "internal", status: "in_progress", auditorName: "Internal Audit Team", startDate: new Date("2026-05-01"), endDate: new Date("2026-06-15") },
    { name: "Internal IT General Controls", auditType: "internal", status: "completed", auditorName: "Internal Audit Team", startDate: new Date("2025-10-01"), endDate: new Date("2025-12-15") },
    { name: "Vendor Risk Audit Q1", auditType: "internal", status: "completed", auditorName: "Internal Audit Team", startDate: new Date("2026-01-01"), endDate: new Date("2026-02-28") },
    { name: "SOC 2 Type II - 2025", auditType: "soc2_type_ii", status: "completed", auditorName: "Schellman & Company", startDate: new Date("2025-06-01"), endDate: new Date("2025-08-31"), frameworkCode: "SOC2" },
    { name: "HIPAA Annual Review 2025", auditType: "hipaa", status: "completed", auditorName: "Deloitte", startDate: new Date("2025-03-01"), endDate: new Date("2025-05-31"), frameworkCode: "HIPAA" },
    { name: "ISO 27001 Certification Audit", auditType: "iso27001", status: "completed", auditorName: "KPMG", startDate: new Date("2025-01-15"), endDate: new Date("2025-03-31"), frameworkCode: "ISO27001" },
    { name: "GDPR DPIA Review", auditType: "gdpr", status: "completed", auditorName: "A-LIGN", startDate: new Date("2025-08-01"), endDate: new Date("2025-09-30"), frameworkCode: "GDPR" },
    { name: "Cloud Security Assessment", auditType: "internal", status: "planned", auditorName: "Internal Audit Team", startDate: new Date("2026-10-01"), endDate: new Date("2026-11-30") },
    { name: "Access Control Audit", auditType: "internal", status: "planned", auditorName: "Internal Audit Team", startDate: new Date("2026-11-01"), endDate: new Date("2026-12-15") },
    { name: "Penetration Test Follow-up", auditType: "internal", status: "in_progress", auditorName: "Internal Audit Team", startDate: new Date("2026-04-15"), endDate: new Date("2026-05-30") },
    { name: "USDP Privacy Assessment", auditType: "gdpr", status: "planned", auditorName: "Deloitte", startDate: new Date("2026-12-01"), endDate: new Date("2027-01-31"), frameworkCode: "USDP" },
    { name: "Legacy System Audit", auditType: "internal", status: "in_progress", auditorName: "Internal Audit Team", startDate: new Date("2025-12-01"), endDate: new Date("2026-03-01") },
    { name: "Change Management Audit", auditType: "internal", status: "overdue_status", auditorName: "Internal Audit Team", startDate: new Date("2025-11-01"), endDate: new Date("2026-01-31") },
    { name: "Incident Response Tabletop", auditType: "internal", status: "overdue_status", auditorName: "Internal Audit Team", startDate: new Date("2025-10-15"), endDate: new Date("2026-02-28") },
    { name: "Business Continuity Review", auditType: "internal", status: "fieldwork", auditorName: "Internal Audit Team", startDate: new Date("2026-03-15"), endDate: new Date("2026-06-01") },
    { name: "Third-Party Risk Audit", auditType: "soc2_type_ii", status: "reporting", auditorName: "External Audit Partners", startDate: new Date("2026-01-15"), endDate: new Date("2026-04-15"), frameworkCode: "SOC2" },
    { name: "Data Retention Policy Audit", auditType: "gdpr", status: "completed", auditorName: "KPMG", startDate: new Date("2025-05-01"), endDate: new Date("2025-07-31"), frameworkCode: "GDPR" },
  ];

  const fwByCode = Object.fromEntries(
    (await prisma.complianceFramework.findMany({ where: { organizationId: orgId } })).map((f) => [f.code, f]),
  );

  await prisma.complianceAudit.createMany({
    data: auditSeeds.map((a) => ({
      organizationId: orgId,
      frameworkId: a.frameworkCode ? fwByCode[a.frameworkCode]?.id ?? null : null,
      name: a.name,
      auditType: a.auditType,
      status: a.status === "overdue_status" ? "in_progress" : a.status,
      auditorName: a.auditorName,
      startDate: a.startDate,
      endDate: a.endDate,
      metadata: {
        findings: a.findings ?? [],
        requests: a.requests ?? [],
        evidencePackages: [],
      },
    })),
  });

  const taskSeeds = [
    { title: "Upload: Access Review Evidence", status: "open", priority: "high", daysFromNow: 3, entityType: "access_review" },
    { title: "Collect SOC 2 firewall evidence", status: "open", priority: "high", daysFromNow: 5, entityType: "launchpad_audit" },
    { title: "Review vendor DPA for Payroll SaaS", status: "in_progress", priority: "medium", daysFromNow: 14, entityType: "vendor_review" },
    { title: "Complete HIPAA security risk assessment", status: "open", priority: "high", daysFromNow: -6 },
    { title: "Update Information Security Policy", status: "in_progress", priority: "medium", daysFromNow: 10, entityType: "policy" },
    { title: "Remediate MFA gap for admin accounts", status: "open", priority: "high", daysFromNow: -2 },
    { title: "Submit Q2 access review sign-off", status: "in_progress", priority: "high", daysFromNow: 4, entityType: "access_review" },
    { title: "Upload encryption at rest evidence", status: "open", priority: "medium", daysFromNow: 12, entityType: "evidence" },
    { title: "Review AWS IAM role permissions", status: "in_progress", priority: "high", daysFromNow: 6 },
    { title: "Complete security awareness training", status: "open", priority: "low", daysFromNow: 21 },
    { title: "Validate backup restoration test results", status: "open", priority: "medium", daysFromNow: -10 },
    { title: "Document incident response tabletop", status: "done", priority: "medium", daysFromNow: -30 },
    { title: "Collect vendor SOC 2 report for Okta", status: "in_progress", priority: "high", daysFromNow: 8, entityType: "vendor_review" },
    { title: "Review GDPR data processing records", status: "open", priority: "medium", daysFromNow: 18 },
    { title: "Approve updated Acceptable Use Policy", status: "open", priority: "low", daysFromNow: 25, entityType: "policy" },
    { title: "Close open vulnerability on prod server", status: "in_progress", priority: "high", daysFromNow: -4 },
    { title: "Upload background check evidence", status: "done", priority: "low", daysFromNow: -45 },
    { title: "Configure SSO for new SaaS tool", status: "open", priority: "medium", daysFromNow: 15 },
    { title: "Review privileged access list", status: "in_progress", priority: "high", daysFromNow: 2, entityType: "access_review" },
    { title: "Collect change management logs", status: "open", priority: "medium", daysFromNow: 9, entityType: "evidence" },
    { title: "Update business continuity plan", status: "open", priority: "medium", daysFromNow: -8 },
    { title: "Complete control CC6.1 testing", status: "in_progress", priority: "high", daysFromNow: 7, entityType: "control" },
    { title: "Review Datadog alert configuration", status: "open", priority: "low", daysFromNow: 20 },
    { title: "Submit audit evidence package", status: "in_progress", priority: "high", daysFromNow: 1, entityType: "launchpad_audit" },
    { title: "Verify employee offboarding checklist", status: "open", priority: "medium", daysFromNow: 11 },
    { title: "Review third-party subprocessors list", status: "open", priority: "medium", daysFromNow: 16, entityType: "vendor_review" },
    { title: "Upload network diagram for audit", status: "done", priority: "high", daysFromNow: -20, entityType: "launchpad_audit" },
    { title: "Remediate failing monitor: Vendor Reviews", status: "open", priority: "high", daysFromNow: -3 },
    { title: "Complete ISO 27001 gap analysis", status: "in_progress", priority: "medium", daysFromNow: 13 },
    { title: "Review password policy exceptions", status: "open", priority: "low", daysFromNow: 28 },
    { title: "Collect HR onboarding evidence", status: "open", priority: "medium", daysFromNow: 5 },
    { title: "Validate S3 bucket encryption settings", status: "in_progress", priority: "high", daysFromNow: 3 },
    { title: "Review incident ticket closure notes", status: "open", priority: "medium", daysFromNow: -12 },
    { title: "Upload penetration test report", status: "open", priority: "high", daysFromNow: 6, entityType: "evidence" },
    { title: "Approve risk treatment plan update", status: "in_progress", priority: "medium", daysFromNow: 17, entityType: "risk" },
    { title: "Complete quarterly policy attestation", status: "done", priority: "low", daysFromNow: -60, entityType: "policy" },
    { title: "Review GitHub branch protection rules", status: "open", priority: "medium", daysFromNow: 10 },
    { title: "Collect endpoint encryption evidence", status: "open", priority: "high", daysFromNow: -5 },
    { title: "Update vendor risk tier for Payroll SaaS", status: "in_progress", priority: "high", daysFromNow: 4, entityType: "vendor_review" },
    { title: "Submit access review exception requests", status: "open", priority: "medium", daysFromNow: 7, entityType: "access_review" },
    { title: "Review disaster recovery test results", status: "open", priority: "medium", daysFromNow: 22 },
    { title: "Finalize SOC 2 readiness checklist", status: "in_progress", priority: "high", daysFromNow: 2, entityType: "launchpad_audit" },
  ];

  await prisma.complianceTask.createMany({
    data: taskSeeds.map((task) => ({
      organizationId: orgId,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: new Date(Date.now() + task.daysFromNow * 86400000),
      entityType: task.entityType ?? null,
    })),
  });

  await prisma.complianceIntegration.createMany({
    data: [
      {
        organizationId: orgId,
        provider: "aws",
        status: "connected",
        lastSyncAt: hoursAgo(2),
        config: {
          scope: { regions: ["us-east-1"] },
          credentialsConfigured: true,
          connectedBy: "compliance+aws@firstaidresponders.net",
          syncLogs: [{ at: hoursAgo(2), status: "success", message: "Synced 245 records from aws", recordsSynced: 245 }],
        },
      },
      {
        organizationId: orgId,
        provider: "google_workspace",
        status: "connected",
        lastSyncAt: hoursAgo(5),
        config: { credentialsConfigured: true, connectedBy: "admin@firstaidresponders.net" },
      },
      {
        organizationId: orgId,
        provider: "okta",
        status: "connected",
        lastSyncAt: hoursAgo(8),
        config: { credentialsConfigured: true, connectedBy: "compliance+okta@firstaidresponders.net" },
      },
      {
        organizationId: orgId,
        provider: "github",
        status: "connected",
        lastSyncAt: hoursAgo(12),
        config: { credentialsConfigured: true, connectedBy: "devops@firstaidresponders.net" },
      },
      {
        organizationId: orgId,
        provider: "microsoft_365",
        status: "connected",
        lastSyncAt: hoursAgo(6),
        config: { credentialsConfigured: true, connectedBy: "it@firstaidresponders.net" },
      },
      {
        organizationId: orgId,
        provider: "datadog",
        status: "connected",
        lastSyncAt: hoursAgo(18),
        config: { credentialsConfigured: true, connectedBy: "observability@firstaidresponders.net" },
      },
      {
        organizationId: orgId,
        provider: "azure",
        status: "error",
        lastSyncAt: hoursAgo(72),
        config: {
          credentialsConfigured: true,
          syncLogs: [{ at: hoursAgo(24), status: "error", message: "Sync failed — check credentials" }],
        },
      },
      {
        organizationId: orgId,
        provider: "slack",
        status: "error",
        lastSyncAt: hoursAgo(96),
        config: {
          credentialsConfigured: true,
          syncLogs: [{ at: hoursAgo(48), status: "error", message: "Token expired — re-auth required" }],
        },
      },
      {
        organizationId: orgId,
        provider: "crowdstrike",
        status: "error",
        lastSyncAt: hoursAgo(120),
        config: { credentialsConfigured: false },
      },
    ],
  });

  await prisma.complianceNotification.createMany({
    data: [
      {
        organizationId: orgId,
        title: "2 Controls Failed",
        body: "Incident response and policy review controls need remediation.",
        severity: "critical",
        link: "/compliance/controls",
      },
      {
        organizationId: orgId,
        title: "5 Vendor Reviews Due",
        body: "Complete pending vendor risk assessments.",
        severity: "warning",
        link: "/compliance/vendors",
      },
      {
        organizationId: orgId,
        title: "13 Employees Missing Training",
        body: "Send LMS training reminders before audit window.",
        severity: "warning",
        link: "/compliance/policies",
      },
    ],
  });

  await prisma.complianceActivityLog.createMany({
    data: [
      {
        organizationId: orgId,
        action: "Mike Jones completed HIPAA Training",
        entityType: "policy",
        actorName: "Mike Jones",
        createdAt: hoursAgo(48),
      },
      {
        organizationId: orgId,
        action: "Vendor Amazon approved",
        entityType: "vendor",
        actorName: "Compliance Manager",
        createdAt: hoursAgo(2),
      },
      {
        organizationId: orgId,
        action: "SOC 2 evidence uploaded",
        entityType: "evidence",
        actorName: "Security Lead",
        createdAt: hoursAgo(3),
      },
      {
        organizationId: orgId,
        action: "AWS monitor refreshed",
        entityType: "monitor",
        actorName: "System",
        createdAt: hoursAgo(5),
      },
      {
        organizationId: orgId,
        action: "ISO 27001 control passed",
        entityType: "control",
        actorName: "Compliance Manager",
        createdAt: hoursAgo(24),
      },
    ],
  });

  const trustProfiles = [
    {
      id: "1",
      name: "Security Profile 2024",
      description: "Default public profile for First Aid Responders",
      status: "published",
      visibility: "public",
      frameworks: ["SOC 2", "ISO 27001", "HIPAA", "GDPR"],
      ownerName: "Sarah Johnson",
      isDefault: true,
      updatedAt: hoursAgo(2),
    },
    {
      id: "2",
      name: "Enterprise Sales Profile",
      description: "Custom profile for enterprise sales prospects",
      status: "in_review",
      visibility: "unlisted",
      frameworks: ["SOC 2", "ISO 27001"],
      ownerName: "Mike Chen",
      updatedAt: hoursAgo(48),
    },
    {
      id: "3",
      name: "Healthcare Partners",
      description: "HIPAA-focused trust profile for healthcare customers",
      status: "draft",
      visibility: "private",
      frameworks: ["HIPAA", "SOC 2"],
      ownerName: "Sarah Johnson",
      updatedAt: hoursAgo(120),
    },
  ];

  await prisma.complianceTrustCenter.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      published: true,
      publicSlug: "first-aid-responders",
      publicUrl: "/trust/first-aid-responders",
      auditorPortalEnabled: true,
      activeAuditors: 2,
      lastUpdatedAt: hoursAgo(2),
      sections: {
        overview: { enabled: true, headline: "Overview", body: "Overview content for First Aid Responders" },
        compliance: { enabled: true, headline: "Compliance", body: "Compliance content for First Aid Responders" },
        documents: { enabled: true, headline: "Documents", body: "Documents content for First Aid Responders" },
        _admin: {
          profiles: trustProfiles,
          sharedLinks: [
            { id: "sl1", name: "ACME Corporation", profileId: "1", profileName: "Security Profile 2024", views: 24, createdAt: hoursAgo(336), lastViewedAt: hoursAgo(48) },
            { id: "sl2", name: "Enterprise Customers", profileId: "1", profileName: "Security Profile 2024", views: 18, createdAt: hoursAgo(720), lastViewedAt: hoursAgo(120) },
            { id: "sl3", name: "Global Tech Inc", profileId: "2", profileName: "Enterprise Sales Profile", views: 9, createdAt: hoursAgo(168) },
            { id: "sl4", name: "Partner Portal", profileId: "1", views: 31, createdAt: hoursAgo(1080) },
            { id: "sl5", name: "RFP Response Pack", profileId: "2", views: 6, createdAt: hoursAgo(72) },
            { id: "sl6", name: "Healthcare Vendor Review", profileId: "3", views: 4, createdAt: hoursAgo(504) },
            { id: "sl7", name: "Due Diligence Q1", profileId: "1", views: 12, createdAt: hoursAgo(1440) },
          ],
          questionnaires: [
            { id: "q1", title: "Enterprise Security Questionnaire", status: "due_soon", dueDate: new Date(Date.now() + 5 * 86400000).toISOString(), recipient: "ACME Corp" },
            { id: "q2", title: "Vendor Risk Assessment", status: "due_soon", dueDate: new Date(Date.now() + 12 * 86400000).toISOString(), recipient: "Global Tech Inc" },
            { id: "q3", title: "SOC 2 Evidence Request", status: "open", dueDate: new Date(Date.now() + 30 * 86400000).toISOString() },
            { id: "q4", title: "HIPAA BAA Review", status: "completed", dueDate: new Date(Date.now() - 10 * 86400000).toISOString(), recipient: "MedHealth Partners" },
          ],
          downloadCount: 12,
        },
      },
    },
    update: {
      published: true,
      auditorPortalEnabled: true,
      activeAuditors: 2,
      lastUpdatedAt: hoursAgo(2),
    },
  });

  const counts = {
    frameworks: await prisma.complianceFramework.count({ where: { organizationId: orgId } }),
    controls: await prisma.complianceControl.count({ where: { organizationId: orgId } }),
    evidence: await prisma.complianceEvidence.count({ where: { organizationId: orgId } }),
    risks: await prisma.complianceRisk.count({ where: { organizationId: orgId } }),
    vulns: await prisma.complianceVulnerability.count({ where: { organizationId: orgId } }),
  };

  console.log("✓ Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
