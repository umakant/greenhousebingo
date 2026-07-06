/** Day 4 — integrations catalog, launchpad sections, notifications, reports, roles. */

export const COMPLIANCE_INTEGRATION_PROVIDERS = [
  {
    key: "aws",
    name: "Amazon Web Services",
    category: "cloud",
    controlsSupported: ["CC6.1", "CC6.6", "CC7.2", "A.8.1", "A.12.4"],
    monitorsSupported: ["encryption_at_rest", "public_ports", "iam_mfa", "cloudtrail_enabled"],
    defaultScope: { regions: ["us-east-1"], services: ["ec2", "s3", "iam"] },
  },
  {
    key: "azure",
    name: "Microsoft Azure",
    category: "cloud",
    controlsSupported: ["CC6.1", "CC6.6", "A.8.1", "A.12.4"],
    monitorsSupported: ["encryption_at_rest", "public_ports", "defender_alerts"],
    defaultScope: { subscriptions: [], resourceGroups: [] },
  },
  {
    key: "gcp",
    name: "Google Cloud Platform",
    category: "cloud",
    controlsSupported: ["CC6.1", "CC6.6", "A.8.1"],
    monitorsSupported: ["encryption_at_rest", "public_ports", "iam_mfa"],
    defaultScope: { projects: [] },
  },
  {
    key: "github",
    name: "GitHub",
    category: "devops",
    controlsSupported: ["CC8.1", "A.14.2", "A.12.1"],
    monitorsSupported: ["branch_protection", "secret_scanning", "dependabot_alerts"],
    defaultScope: { organizations: [], repositories: [] },
  },
  {
    key: "gitlab",
    name: "GitLab",
    category: "devops",
    controlsSupported: ["CC8.1", "A.14.2"],
    monitorsSupported: ["branch_protection", "secret_scanning", "pipeline_approval"],
    defaultScope: { groups: [], projects: [] },
  },
  {
    key: "google_workspace",
    name: "Google Workspace",
    category: "identity",
    controlsSupported: ["CC6.1", "CC6.2", "A.9.2", "A.9.4"],
    monitorsSupported: ["mfa_enforcement", "admin_accounts", "external_sharing"],
    defaultScope: { domains: [], orgUnits: [] },
  },
  {
    key: "microsoft_365",
    name: "Microsoft 365",
    category: "identity",
    controlsSupported: ["CC6.1", "CC6.2", "A.9.2", "A.9.4"],
    monitorsSupported: ["mfa_enforcement", "admin_accounts", "dlp_policies"],
    defaultScope: { tenants: [], licenses: [] },
  },
  {
    key: "okta",
    name: "Okta",
    category: "identity",
    controlsSupported: ["CC6.1", "CC6.2", "A.9.2", "A.9.4"],
    monitorsSupported: ["mfa_enforcement", "inactive_users", "privileged_access"],
    defaultScope: { apps: [], groups: [] },
  },
  {
    key: "slack",
    name: "Slack",
    category: "collaboration",
    controlsSupported: ["CC6.1", "A.13.2"],
    monitorsSupported: ["external_guests", "retention_policies", "dlp_alerts"],
    defaultScope: { workspaces: [], channels: [] },
  },
  {
    key: "jira",
    name: "Jira",
    category: "project",
    controlsSupported: ["CC8.1", "A.12.1"],
    monitorsSupported: ["change_tickets", "incident_sla", "access_reviews"],
    defaultScope: { projects: [], issueTypes: [] },
  },
  {
    key: "asana",
    name: "Asana",
    category: "project",
    controlsSupported: ["CC8.1", "A.12.1"],
    monitorsSupported: ["task_completion", "project_owners"],
    defaultScope: { workspaces: [], projects: [] },
  },
  {
    key: "crowdstrike",
    name: "CrowdStrike",
    category: "security",
    controlsSupported: ["CC7.1", "CC7.2", "A.12.4"],
    monitorsSupported: ["endpoint_protection", "threat_detections", "patch_compliance"],
    defaultScope: { cid: "", hostGroups: [] },
  },
  {
    key: "jamf",
    name: "Jamf",
    category: "security",
    controlsSupported: ["CC6.8", "A.8.1", "A.11.2"],
    monitorsSupported: ["device_encryption", "os_patches", "mdm_enrollment"],
    defaultScope: { sites: [], deviceGroups: [] },
  },
  {
    key: "sentinelone",
    name: "SentinelOne",
    category: "security",
    controlsSupported: ["CC7.1", "CC7.2", "A.12.4"],
    monitorsSupported: ["endpoint_protection", "threat_detections", "agent_health"],
    defaultScope: { sites: [], groups: [] },
  },
  {
    key: "datadog",
    name: "Datadog",
    category: "observability",
    controlsSupported: ["CC7.2", "A.12.4", "A.16.1"],
    monitorsSupported: ["log_retention", "alert_coverage", "uptime_monitors"],
    defaultScope: { orgs: [], services: [] },
  },
] as const;

export type ComplianceIntegrationProviderKey = (typeof COMPLIANCE_INTEGRATION_PROVIDERS)[number]["key"];

export const COMPLIANCE_LAUNCHPAD_SECTIONS = [
  {
    id: "foundation",
    title: "Compliance Foundation",
    description: "Enable frameworks, assign owners, and establish your compliance program baseline.",
    href: "/compliance/frameworks",
    taskEntityType: "launchpad_foundation",
  },
  {
    id: "policies",
    title: "Policies",
    description: "Publish core policies and track employee acknowledgements.",
    href: "/compliance/policies",
    taskEntityType: "launchpad_policies",
  },
  {
    id: "employee",
    title: "Employee Compliance",
    description: "Training, policy acknowledgements, and access certifications.",
    href: "/compliance/access-reviews",
    taskEntityType: "launchpad_employee",
  },
  {
    id: "vendor",
    title: "Vendor Compliance",
    description: "Vendor risk reviews, questionnaires, and evidence collection.",
    href: "/compliance/vendors",
    taskEntityType: "launchpad_vendor",
  },
  {
    id: "monitoring",
    title: "Monitoring",
    description: "Automated monitors, integrations, and continuous control testing.",
    href: "/compliance/monitors",
    taskEntityType: "launchpad_monitoring",
  },
  {
    id: "audit",
    title: "Audit Readiness",
    description: "Evidence packages, audits, trust center, and auditor portal.",
    href: "/compliance/audits",
    taskEntityType: "launchpad_audit",
  },
] as const;

export type ComplianceLaunchpadSectionId = (typeof COMPLIANCE_LAUNCHPAD_SECTIONS)[number]["id"];

export const COMPLIANCE_NOTIFICATION_TYPES = [
  "missing_evidence",
  "failed_control",
  "audit_deadline",
  "expiring_document",
  "vendor_review_due",
  "training_due",
] as const;

export type ComplianceNotificationType = (typeof COMPLIANCE_NOTIFICATION_TYPES)[number];

export const COMPLIANCE_REPORT_TYPES = [
  { key: "compliance", label: "Compliance Report", description: "Executive summary of program health." },
  { key: "framework_readiness", label: "Framework Readiness", description: "Per-framework control and evidence status." },
  { key: "evidence", label: "Evidence Report", description: "Evidence inventory with status and expiry." },
  { key: "risk_register", label: "Risk Register", description: "Open risks with severity and owners." },
  { key: "vendor", label: "Vendor Report", description: "Vendor review status and risk ratings." },
  { key: "audit_package", label: "Audit Package", description: "Audit timeline, requests, and evidence links." },
  { key: "vulnerability", label: "Vulnerability Report", description: "Open CVEs and remediation progress." },
] as const;

export type ComplianceReportType = (typeof COMPLIANCE_REPORT_TYPES)[number]["key"];

export const COMPLIANCE_ROLES = [
  "super_admin",
  "company_admin",
  "compliance_manager",
  "employee",
  "auditor",
] as const;

export type ComplianceRole = (typeof COMPLIANCE_ROLES)[number];

export type IntegrationConfig = {
  scope?: Record<string, unknown>;
  syncLogs?: Array<{
    at: string;
    status: "success" | "error" | "warning";
    message: string;
    recordsSynced?: number;
  }>;
  credentialsConfigured?: boolean;
  connectedBy?: string;
};

export function integrationProviderMeta(provider: string) {
  return COMPLIANCE_INTEGRATION_PROVIDERS.find((p) => p.key === provider) ?? null;
}

export function parseIntegrationConfig(raw: unknown): IntegrationConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const syncLogs = Array.isArray(o.syncLogs)
    ? o.syncLogs
        .filter((l) => l && typeof l === "object")
        .map((l) => {
          const row = l as Record<string, unknown>;
          return {
            at: String(row.at ?? ""),
            status: (["success", "error", "warning"].includes(String(row.status))
              ? String(row.status)
              : "success") as "success" | "error" | "warning",
            message: String(row.message ?? ""),
            recordsSynced: row.recordsSynced != null ? Number(row.recordsSynced) : undefined,
          };
        })
    : [];
  return {
    scope: o.scope && typeof o.scope === "object" && !Array.isArray(o.scope)
      ? (o.scope as Record<string, unknown>)
      : undefined,
    syncLogs,
    credentialsConfigured: Boolean(o.credentialsConfigured),
    connectedBy: o.connectedBy ? String(o.connectedBy) : undefined,
  };
}
