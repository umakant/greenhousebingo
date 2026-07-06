export const COMPLIANCE_MONITOR_CATEGORIES = ["Security", "Cloud", "HR", "Vendor", "Compliance"] as const;

export const COMPLIANCE_MONITOR_CATALOG = [
  { key: "mfa_enabled", name: "MFA Enabled", category: "Security", schedule: "daily", slaHours: 24, monitorType: "automated" },
  { key: "sso_enabled", name: "SSO Enabled", category: "Security", schedule: "daily", slaHours: 24, monitorType: "automated" },
  { key: "employee_training", name: "Employee Training", category: "HR", schedule: "weekly", slaHours: 168, monitorType: "manual" },
  { key: "background_checks", name: "Background Checks", category: "HR", schedule: "monthly", slaHours: 720, monitorType: "manual" },
  { key: "vendor_reviews", name: "Vendor Reviews", category: "Vendor", schedule: "quarterly", slaHours: 2160, monitorType: "manual" },
  { key: "public_ports", name: "Public Ports", category: "Cloud", schedule: "daily", slaHours: 24, monitorType: "automated" },
  { key: "encryption", name: "Encryption", category: "Cloud", schedule: "daily", slaHours: 24, monitorType: "automated" },
  { key: "backups", name: "Backups", category: "Cloud", schedule: "daily", slaHours: 48, monitorType: "automated" },
  { key: "access_reviews", name: "Access Reviews", category: "Compliance", schedule: "quarterly", slaHours: 2160, monitorType: "manual" },
  { key: "policy_reviews", name: "Policy Reviews", category: "Compliance", schedule: "quarterly", slaHours: 2160, monitorType: "manual" },
] as const;

export const COMPLIANCE_SEED_POLICIES = [
  "Information Security",
  "Access Control",
  "Password Policy",
  "Privacy Policy",
  "Vendor Management",
  "Incident Response",
  "Business Continuity",
  "Disaster Recovery",
  "HIPAA Security",
  "GDPR Data Protection",
] as const;

export const COMPLIANCE_CONTROL_CATEGORIES = [
  "Access",
  "Identity",
  "Network",
  "Data",
  "Continuity",
  "Incident",
  "Audit",
  "Vendor",
  "Privacy",
] as const;

/** Starter controls seeded when a tenant has no control library yet. */
export const COMPLIANCE_STARTER_CONTROLS = [
  { code: "AC-1", title: "Access control policy", status: "implemented", category: "Access", testSchedule: "annual" },
  { code: "AC-2", title: "Account management", status: "implemented", category: "Access", testSchedule: "quarterly" },
  { code: "IA-2", title: "Identification and authentication", status: "in_progress", category: "Identity", testSchedule: "quarterly" },
  { code: "IR-1", title: "Incident response policy", status: "not_started", category: "Incident", testSchedule: "semi-annual" },
  { code: "SC-7", title: "Boundary protection", status: "implemented", category: "Network", testSchedule: "quarterly" },
] as const;

export type ControlRelations = {
  policyIds?: number[];
  riskIds?: number[];
  vendorReviewIds?: number[];
  monitorIds?: number[];
};
