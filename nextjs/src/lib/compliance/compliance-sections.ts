import { COMPLIANCE_FRAMEWORK_META } from "@/lib/compliance/compliance-frameworks";

export const COMPLIANCE_SECTIONS: Record<
  string,
  { title: string; description: string; permission: string }
> = {
  frameworks: {
    title: "Frameworks",
    description: "Manage and track compliance frameworks your organization is working toward.",
    permission: "manage-compliance-frameworks",
  },
  controls: {
    title: "Controls",
    description: "Manage control library, implementation status, and framework mappings.",
    permission: "manage-compliance-controls",
  },
  evidence: {
    title: "Evidence",
    description: "Collect and link evidence from existing PaperFlight modules without duplication.",
    permission: "manage-compliance-evidence",
  },
  policies: {
    title: "Policies",
    description: "Author, publish, and review organizational compliance policies.",
    permission: "manage-compliance-policies",
  },
  documents: {
    title: "Documents",
    description: "Compliance document registry with references to HRM, project, and workspace files.",
    permission: "manage-compliance-documents",
  },
  monitors: {
    title: "Monitors",
    description: "Automated and manual compliance monitors with pass/fail history.",
    permission: "manage-compliance-monitors",
  },
  risks: {
    title: "Risks",
    description: "Track open risks, severity, and remediation ownership.",
    permission: "manage-compliance-risks",
  },
  vendors: {
    title: "Vendors",
    description: "Vendor risk reviews linked to existing vendor records.",
    permission: "manage-compliance-vendors",
  },
  "access-reviews": {
    title: "Access Reviews",
    description: "Periodic access certification campaigns across employees and systems.",
    permission: "manage-compliance-access-reviews",
  },
  vulnerabilities: {
    title: "Vulnerabilities",
    description: "Track CVEs, severity, and remediation status.",
    permission: "manage-compliance-vulnerabilities",
  },
  audits: {
    title: "Audits",
    description: "Plan internal and external audits with timeline and auditor assignments.",
    permission: "manage-compliance-audits",
  },
  "trust-center": {
    title: "Trust Center",
    description: "Public trust page and auditor portal configuration.",
    permission: "manage-compliance-trust-center",
  },
  integrations: {
    title: "Integrations",
    description: "Connect cloud providers, identity, and security tools for automated evidence.",
    permission: "manage-compliance-integrations",
  },
  launchpad: {
    title: "Launchpad",
    description: "Guided compliance program setup with progress tracking and generated tasks.",
    permission: "manage-compliance-launchpad",
  },
  reports: {
    title: "Reports",
    description: "Export compliance, evidence, risk, vendor, audit, and vulnerability reports.",
    permission: "manage-compliance-reports",
  },
  tasks: {
    title: "Tasks",
    description: "Compliance action items with assignments, due dates, comments, and attachments.",
    permission: "manage-compliance-tasks",
  },
  settings: {
    title: "Settings",
    description: "Compliance module configuration and notification preferences.",
    permission: "manage-compliance-settings",
  },
};

export { COMPLIANCE_FRAMEWORK_META };
