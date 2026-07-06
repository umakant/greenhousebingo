export const SETTINGS_STORAGE_KEY = "_settings";

export type ComplianceToggleSettings = {
  evidenceReminders: boolean;
  autoAssignControls: boolean;
  requireEvidenceApproval: boolean;
  riskScoring: boolean;
  policyAcknowledgements: boolean;
};

export type ComplianceOrganizationSettings = {
  legalName: string;
  website: string;
  primaryEmail: string;
  industry: string;
  country: string;
  phone: string;
  timezone: string;
};

export type ComplianceSecuritySettings = {
  sso: string;
  mfa: string;
  passwordPolicy: string;
  sessionTimeout: string;
};

export type ComplianceDataRetentionSettings = {
  evidenceRetentionYears: number;
  auditLogRetentionYears: number;
  dataResidency: string;
};

export type ComplianceSettingsRecord = {
  organization: ComplianceOrganizationSettings;
  toggles: ComplianceToggleSettings;
  security: ComplianceSecuritySettings;
  dataRetention: ComplianceDataRetentionSettings;
};

export function defaultComplianceSettings(): ComplianceSettingsRecord {
  return {
    organization: {
      legalName: "",
      website: "",
      primaryEmail: "",
      industry: "Healthcare",
      country: "United States",
      phone: "",
      timezone: "(UTC-05:00) Eastern Time (US & Canada)",
    },
    toggles: {
      evidenceReminders: true,
      autoAssignControls: true,
      requireEvidenceApproval: true,
      riskScoring: true,
      policyAcknowledgements: false,
    },
    security: {
      sso: "SAML 2.0",
      mfa: "Enforced",
      passwordPolicy: "Strong",
      sessionTimeout: "30 minutes",
    },
    dataRetention: {
      evidenceRetentionYears: 7,
      auditLogRetentionYears: 3,
      dataResidency: "US",
    },
  };
}

export function parseComplianceSettings(raw: unknown): ComplianceSettingsRecord {
  const base = defaultComplianceSettings();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const obj = raw as Partial<ComplianceSettingsRecord>;
  return {
    organization: { ...base.organization, ...(obj.organization ?? {}) },
    toggles: { ...base.toggles, ...(obj.toggles ?? {}) },
    security: { ...base.security, ...(obj.security ?? {}) },
    dataRetention: { ...base.dataRetention, ...(obj.dataRetention ?? {}) },
  };
}

export function mergeSettingsIntoSections(
  sections: Record<string, unknown> | null | undefined,
  settings: ComplianceSettingsRecord,
): Record<string, unknown> {
  const base = sections && typeof sections === "object" && !Array.isArray(sections) ? { ...sections } : {};
  return { ...base, [SETTINGS_STORAGE_KEY]: settings };
}

export function readSettingsFromSections(sections: unknown): ComplianceSettingsRecord {
  if (!sections || typeof sections !== "object" || Array.isArray(sections)) {
    return defaultComplianceSettings();
  }
  const raw = (sections as Record<string, unknown>)[SETTINGS_STORAGE_KEY];
  return parseComplianceSettings(raw);
}

export function organizationProfileFromOrg(
  orgName: string | null,
  orgEmail: string | null,
  orgPhone: string | null,
  stored: ComplianceOrganizationSettings,
): ComplianceOrganizationSettings {
  const slug = (orgName ?? "organization")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
  return {
    ...stored,
    legalName: stored.legalName || (orgName ? `${orgName} Inc.` : ""),
    primaryEmail: stored.primaryEmail || orgEmail || `compliance@${slug || "company"}.com`,
    phone: stored.phone || orgPhone || "+1 (555) 123-4567",
    website: stored.website || (slug ? `https://${slug}.com` : ""),
    industry: stored.industry || "Healthcare",
    country: stored.country || "United States",
  };
}

export function planSummary(orgId: number, planName: string | null, userCount: number, userLimit: number | null) {
  const limit = userLimit && userLimit > 0 ? userLimit : 50;
  const storageUsedGb = 96 + (orgId % 64);
  const storageTotalGb = 1024;
  return {
    planName: planName ?? "Enterprise",
    usersUsed: userCount,
    usersLimit: limit,
    storageUsedGb,
    storageTotalGb,
    storagePct: Math.round((storageUsedGb / storageTotalGb) * 100),
    nextBillingDate: nextBillingDateIso(),
  };
}

function nextBillingDateIso(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export function systemInfo(orgId: number) {
  return {
    instanceId: `fr-prod-${String(orgId).padStart(2, "0")}`,
    environment: "Production",
    version: "v2.4.1",
    lastUpdated: new Date().toISOString(),
  };
}

export const SETTINGS_TABS = [
  { id: "organization", label: "Organization" },
  { id: "users", label: "Users & Roles" },
  { id: "security", label: "Security" },
  { id: "notifications", label: "Notifications" },
  { id: "system", label: "System" },
  { id: "integrations", label: "Integrations" },
  { id: "billing", label: "Billing" },
] as const;

export type SettingsTabId = (typeof SETTINGS_TABS)[number]["id"];

export const COMPLIANCE_ROLES = [
  { role: "Super Admin", description: "Full access across all tenants and organizations." },
  { role: "Company Admin", description: "Full organization compliance program management." },
  { role: "Compliance Manager", description: "Manage controls, evidence, audits, and reports." },
  { role: "Employee", description: "View policies and complete acknowledgements." },
  { role: "Auditor", description: "Read-only access to frameworks, controls, evidence, and audits." },
];
